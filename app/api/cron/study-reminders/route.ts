import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import ExamAttempt from "@/models/ExamAttempt";
import PushSubscription from "@/models/PushSubscription";
import { sendDailyStudyReminderEmail, sendSubscriptionExpiringSoonEmail, sendSubscriptionExpiredEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Verify secret if CRON_SECRET is configured in environment
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron trigger." }, { status: 401 });
    }

    await connectToDatabase();

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Process expiring & expired subscriptions
    const proUsers = await User.find({
      subscriptionPlan: "pro",
      subscriptionExpiresAt: { $exists: true, $ne: null },
    });

    const expiringSoonEmailsSent: string[] = [];
    const expiredEmailsSent: string[] = [];

    for (const proUser of proUsers) {
      if (!proUser.subscriptionExpiresAt) continue;

      const expiresAt = new Date(proUser.subscriptionExpiresAt);

      // 1. Subscription has EXPIRED
      if (expiresAt <= now) {
        proUser.subscriptionPlan = "free";
        proUser.subscriptionStatus = "past_due";
        proUser.lastExpiredNoticeSentDate = now;
        await proUser.save();

        try {
          await sendSubscriptionExpiredEmail({
            to: proUser.email,
            fullName: proUser.fullName,
          });
          expiredEmailsSent.push(proUser.email);
        } catch (expErr) {
          console.error(`Failed to send subscription expired email to ${proUser.email}:`, expErr);
        }
      }
      // 2. Subscription is EXPIRING SOON (within 3 days)
      else if (expiresAt <= threeDaysFromNow) {
        const hasSentExpiringNoticeRecently =
          proUser.lastExpiringNoticeSentDate &&
          now.getTime() - new Date(proUser.lastExpiringNoticeSentDate).getTime() < 3 * 24 * 60 * 60 * 1000;

        if (!hasSentExpiringNoticeRecently) {
          const diffMs = expiresAt.getTime() - now.getTime();
          const daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          try {
            await sendSubscriptionExpiringSoonEmail({
              to: proUser.email,
              fullName: proUser.fullName,
              expiresAt,
              daysLeft,
            });
            expiringSoonEmailsSent.push(proUser.email);

            proUser.lastExpiringNoticeSentDate = now;
            await proUser.save();
          } catch (warnErr) {
            console.error(`Failed to send expiring soon email to ${proUser.email}:`, warnErr);
          }
        }
      }
    }

    // Check if daily study reminder emails are explicitly enabled via environment variable.
    // Kept FALSE by default to protect Resend free tier quota (100 emails/day) for critical transactional emails (signups, password resets).
    const allowReminderEmails = process.env.ENABLE_DAILY_STUDY_REMINDER_EMAILS === "true";

    // Query active users
    // If reminder emails are disabled, only query users who have push notifications configured
    const queryConditions: any = { isSuspended: { $ne: true } };

    if (allowReminderEmails) {
      // If reminder emails are explicitly enabled, strictly limit them to Pro members
      queryConditions.subscriptionPlan = "pro";
      queryConditions.$or = [
        { emailRemindersEnabled: true },
        { pushRemindersEnabled: { $ne: false }, expoPushToken: { $exists: true, $ne: "" } },
      ];
    } else {
      // Free quota protection: only process push notifications (free and unlimited)
      queryConditions.pushRemindersEnabled = { $ne: false };
      queryConditions.expoPushToken = { $exists: true, $ne: "" };
    }

    const users = await User.find(queryConditions);

    const dispatchedEmail: string[] = [];
    const dispatchedPush: string[] = [];

    for (const user of users) {
      // Check if user has already achieved their daily goal today
      const todayAttempts = await ExamAttempt.find({
        userId: user._id,
        createdAt: { $gte: startOfToday },
      });

      let questionsCompletedToday = 0;
      for (const att of todayAttempts) {
        questionsCompletedToday += att.totalQuestions || 0;
      }

      const goal = user.dailyQuestionGoal || 20;

      // If daily goal is not met yet today
      if (questionsCompletedToday < goal) {
        const leadTime = user.reminderLeadTimeMinutes || 0;
        const hasBeenRemindedToday = user.lastReminderSentDate && user.lastReminderSentDate >= startOfToday;
        const hasBeenAdvanceRemindedToday = user.lastAdvanceReminderSentDate && user.lastAdvanceReminderSentDate >= startOfToday;

        let isAdvanceWindow = false;
        if (leadTime > 0 && !hasBeenAdvanceRemindedToday) {
          isAdvanceWindow = true;
        }

        const shouldSendMain = !hasBeenRemindedToday;

        if (shouldSendMain || isAdvanceWindow) {
          // 1. Dispatch Email only if globally enabled, user is Pro, and user enabled it
          if (allowReminderEmails && user.subscriptionPlan === "pro" && user.emailRemindersEnabled === true) {
            try {
              await sendDailyStudyReminderEmail({
                to: user.email,
                fullName: user.fullName,
                dailyQuestionGoal: goal,
                preferredStudyTime: isAdvanceWindow
                  ? `${user.preferredStudyTime || "20:00"} (${leadTime}m advance notice)`
                  : user.preferredStudyTime || "20:00",
              });
              dispatchedEmail.push(user.email);
            } catch (sendErr) {
              console.error(`Failed to send cron reminder email to ${user.email}:`, sendErr);
            }
          }

          // 2. Dispatch Mobile Push Notification if registered
          if (user.expoPushToken && user.pushRemindersEnabled !== false) {
            try {
              const firstName = user.fullName ? user.fullName.split(" ")[0] : "Candidate";
              const pushPayload = {
                to: user.expoPushToken,
                sound: "default",
                title: "🔥 AVERO Study Reminder",
                body: `Time for practice, Nurse ${firstName}! Meet your daily goal of ${goal} questions to keep your active retention streak alive.`,
                data: { url: "/(tabs)/home" },
              };
              await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify(pushPayload),
              });
              dispatchedPush.push(user.email);
            } catch (pushErr) {
              console.error(`Failed to send mobile push notification to ${user.email}:`, pushErr);
            }
          }

          // 3. Mark reminder dates on user model
          if (isAdvanceWindow) {
            user.lastAdvanceReminderSentDate = now;
          } else {
            user.lastReminderSentDate = now;
          }
          await user.save();
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      activeUsersCount: users.length,
      dispatchedEmailCount: dispatchedEmail.length,
      dispatchedEmails: dispatchedEmail,
      dispatchedPushCount: dispatchedPush.length,
      dispatchedPush,
      expiringSoonEmailsSent,
      expiredEmailsSent,
    });
  } catch (error: any) {
    console.error("Cron study-reminders error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to execute study reminder cron job." },
      { status: 500 }
    );
  }
}
