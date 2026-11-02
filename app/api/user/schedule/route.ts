import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/userAuth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import ExamAttempt from "@/models/ExamAttempt";
import { sendDailyStudyReminderEmail } from "@/lib/email";
import { isProUser } from "@/lib/subscription";
import { getAndUpdateUserStreak } from "@/lib/streak";

export async function GET() {
  const t0 = performance.now();
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      console.log(`⏱️ [API DONE] GET /api/user/schedule -> 401 in ${(performance.now() - t0).toFixed(1)}ms`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPro = isProUser(sessionUser);

    await connectToDatabase();
    const user = await User.findById(sessionUser._id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const streak = user.currentStreakDays ?? 0;

    // Calculate questions completed today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayAttempts = await ExamAttempt.find({
      userId: sessionUser._id,
      createdAt: { $gte: startOfToday },
    })
      .select("totalQuestions timeTakenSeconds")
      .lean();

    let questionsCompletedToday = 0;
    let timeSpentTodaySeconds = 0;
    for (const att of todayAttempts) {
      questionsCompletedToday += att.totalQuestions || 0;
      timeSpentTodaySeconds += att.timeTakenSeconds || 0;
    }

    console.log(`⏱️ [API DONE] GET /api/user/schedule -> 200 in ${(performance.now() - t0).toFixed(1)}ms`);
    return NextResponse.json({
      success: true,
      schedule: {
        isPro,
        dailyQuestionGoal: user.dailyQuestionGoal ?? 20,
        dailyStudyTimeMinutes: user.dailyStudyTimeMinutes ?? 30,
        preferredStudyTime: user.preferredStudyTime ?? "20:00",
        emailRemindersEnabled: user.emailRemindersEnabled !== false,
        pushRemindersEnabled: user.pushRemindersEnabled !== false,
        reminderLeadTimeMinutes: user.reminderLeadTimeMinutes ?? 0,
        currentStreakDays: streak,
        questionsCompletedToday,
        timeSpentTodayMinutes: Math.round(timeSpentTodaySeconds / 60),
      },
    });
  } catch (error: any) {
    console.error("Error fetching study schedule:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load study schedule." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const t0 = performance.now();
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isProUser(sessionUser)) {
      return NextResponse.json(
        { error: "The daily study schedule planner is exclusive to Pro members.", code: "PRO_REQUIRED" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      dailyQuestionGoal,
      dailyStudyTimeMinutes,
      preferredStudyTime,
      emailRemindersEnabled,
      pushRemindersEnabled,
      reminderLeadTimeMinutes,
      sendTestEmail,
    } = body;

    await connectToDatabase();
    
    const updateData: any = {};
    if (dailyQuestionGoal !== undefined) updateData.dailyQuestionGoal = Number(dailyQuestionGoal);
    if (dailyStudyTimeMinutes !== undefined) updateData.dailyStudyTimeMinutes = Number(dailyStudyTimeMinutes);
    if (preferredStudyTime !== undefined) updateData.preferredStudyTime = String(preferredStudyTime);
    if (emailRemindersEnabled !== undefined) updateData.emailRemindersEnabled = Boolean(emailRemindersEnabled);
    if (pushRemindersEnabled !== undefined) updateData.pushRemindersEnabled = Boolean(pushRemindersEnabled);
    if (reminderLeadTimeMinutes !== undefined) updateData.reminderLeadTimeMinutes = Number(reminderLeadTimeMinutes);

    const user = await User.findByIdAndUpdate(
      sessionUser._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    let reminderStatus = null;
    if (sendTestEmail) {
      try {
        reminderStatus = await sendDailyStudyReminderEmail({
          to: user.email,
          fullName: user.fullName,
          dailyQuestionGoal: user.dailyQuestionGoal || 20,
          preferredStudyTime: user.preferredStudyTime || "20:00",
        });
      } catch (eErr) {
        console.error("Error dispatching test study reminder email:", eErr);
      }
    }

    console.log(`⏱️ [API DONE] PUT /api/user/schedule -> 200 in ${(performance.now() - t0).toFixed(1)}ms`);
    return NextResponse.json({
      success: true,
      message: sendTestEmail
        ? `Preferences saved & test study reminder dispatched to ${user.email}!`
        : "Study schedule preferences updated successfully.",
      schedule: {
        dailyQuestionGoal: user.dailyQuestionGoal,
        dailyStudyTimeMinutes: user.dailyStudyTimeMinutes,
        preferredStudyTime: user.preferredStudyTime,
        emailRemindersEnabled: user.emailRemindersEnabled,
        pushRemindersEnabled: user.pushRemindersEnabled,
        reminderLeadTimeMinutes: user.reminderLeadTimeMinutes,
        currentStreakDays: user.currentStreakDays,
      },
      reminderStatus,
    });
  } catch (error: any) {
    console.error("Error updating study schedule:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update study schedule preferences." },
      { status: 500 }
    );
  }
}
