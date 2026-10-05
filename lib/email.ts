import { Resend } from "resend";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || `"AVERO ACADEMY" <no-reply@avero.academy>`;

// Prepare logo attachment buffer safely if available
function getLogoAttachment() {
  try {
    const logoPath = path.join(process.cwd(), "public", "images", "email-logo.jpeg");
    if (fs.existsSync(logoPath)) {
      return [
        {
          filename: "email-logo.jpeg",
          content: fs.readFileSync(logoPath),
        },
      ];
    }
  } catch (e) {
    console.warn("Could not load email logo image attachment:", e);
  }
  return undefined;
}

export async function sendWelcomeEmail({
  to,
  fullName,
  studentType,
  university,
  gradYear,
}: {
  to: string;
  fullName: string;
  studentType?: string;
  university?: string;
  gradYear?: string;
}) {
  const subject = "Welcome to AVERO ACADEMY - Your Account is Ready!";

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2866e1;">
        <img src="cid:email-logo.jpeg" alt="AVERO ACADEMY" style="max-width: 200px; height: auto; display: block; margin: 0 auto 12px auto;" />
        <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0;">Nursing Council Exam Prep & Question Bank</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Welcome, ${fullName}!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Thank you for joining <strong>AVERO ACADEMY</strong>. Your account has been initialized and is ready for your nursing council examination study sessions.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #2866e1; font-size: 14px; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; font-weight: 700;">Your Student Profile:</h3>
          <ul style="color: #334155; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Full Name:</strong> ${fullName}</li>
            <li><strong>Registered Email:</strong> ${to}</li>
            <li><strong>Student Type:</strong> ${studentType || "General Nursing Candidate"}</li>
            <li><strong>Institution:</strong> ${university || "School of Nursing"}</li>
            <li><strong>Target Qualification Year:</strong> ${gradYear || "2026"}</li>
          </ul>
        </div>

        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          AVERO ACADEMY turns scattered professional examination past questions into an organized, subject-based, explanation-driven study system. You can now practice Anatomy, Pharmacology, Fundamentals of Nursing, and Medical-Surgical Nursing.
        </p>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} AVERO ACADEMY Technologies Inc. All rights reserved.</p>
        <p style="margin: 4px 0 0 0;">This email was sent to ${to}.</p>
      </div>
    </div>
  `;

  const textContent = `
Dear ${fullName},

Welcome to AVERO ACADEMY! Your account has been initialized and is ready.

Student Profile:
- Full Name: ${fullName}
- Email: ${to}
- Student Type: ${studentType || "Healthcare Candidate"}
- Institution: ${university || "School of Nursing"}
- Qualification Year: ${gradYear || "2026"}

Start practicing subject-categorized nursing council questions now!

Best regards,
The AVERO ACADEMY Team
  `;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing. Skipping actual Resend email dispatch.");
    return {
      id: "mock-" + Date.now(),
      messageId: "mock-" + Date.now(),
      accepted: [to],
      content: textContent,
    };
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [to],
    subject,
    text: textContent,
    html: htmlContent,
    attachments: getLogoAttachment(),
  });

  if (error) {
    console.error("Resend error (sendWelcomeEmail):", error);
    throw new Error(error.message);
  }

  return { messageId: data?.id, accepted: [to], ...data };
}

export async function sendPasswordResetEmail({
  to,
  fullName,
  resetUrl,
}: {
  to: string;
  fullName: string;
  resetUrl: string;
}) {
  const subject = "Reset Your Password - AVERO ACADEMY";

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2866e1;">
        <img src="cid:email-logo.jpeg" alt="AVERO ACADEMY" style="max-width: 200px; height: auto; display: block; margin: 0 auto 12px auto;" />
        <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0;">Password Reset Request</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Hello, ${fullName}!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          We received a request to reset your password for your AVERO ACADEMY account. Click the button below to choose a new password:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #2866e1; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; border-radius: 12px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          If the button above does not work, copy and paste this URL into your browser:
        </p>
        <p style="color: #2866e1; font-size: 13px; word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <a href="${resetUrl}" style="color: #2866e1; text-decoration: underline;">${resetUrl}</a>
        </p>

        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} AVERO ACADEMY Technologies Inc. All rights reserved.</p>
        <p style="margin: 4px 0 0 0;">This security email was sent to ${to}.</p>
      </div>
    </div>
  `;

  const textContent = `
Dear ${fullName},

We received a request to reset your password for your AVERO ACADEMY account.

Reset link (expires in 1 hour):
${resetUrl}

If you did not request this, please ignore this message.

Best regards,
The AVERO ACADEMY Team
  `;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing. Skipping actual Resend email dispatch for Password Reset.");
    console.log(`[PASSWORD RESET MOCK LINK] ${resetUrl}`);
    return {
      id: "mock-reset-" + Date.now(),
      messageId: "mock-reset-" + Date.now(),
      accepted: [to],
      content: textContent,
      resetUrl,
    };
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [to],
    subject,
    text: textContent,
    html: htmlContent,
    attachments: getLogoAttachment(),
  });

  if (error) {
    console.error("Resend error (sendPasswordResetEmail):", error);
    throw new Error(error.message);
  }

  return { messageId: data?.id, accepted: [to], ...data };
}

export async function sendDailyStudyReminderEmail({
  to,
  fullName,
  dailyQuestionGoal,
  preferredStudyTime,
}: {
  to: string;
  fullName: string;
  dailyQuestionGoal: number;
  preferredStudyTime: string;
}) {
  const subject = "🔥 Daily Study Prompt - Keep Your AVERO ACADEMY Retention Streak Active!";

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2866e1;">
        <img src="cid:email-logo.jpeg" alt="AVERO ACADEMY" style="max-width: 200px; height: auto; display: block; margin: 0 auto 12px auto;" />
        <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0;">Daily Study Habit Reminder</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Time to practice, ${fullName}! 📚</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          This is your scheduled daily study prompt for <strong>${preferredStudyTime}</strong>. Consistent daily practice is the key to mastering your nursing council board examinations.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #2866e1; font-size: 14px; text-transform: uppercase; margin-top: 0; margin-bottom: 8px; font-weight: 700;">Today's Target:</h3>
          <p style="color: #334155; font-size: 16px; font-weight: bold; margin: 0;">
            🎯 ${dailyQuestionGoal} Practice Questions & Active Recall Flashcards
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.avero.academy/dashboard" style="background-color: #2866e1; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; border-radius: 12px; display: inline-block;">
            Start Today's Session Now
          </a>
        </div>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} AVERO ACADEMY Technologies Inc. All rights reserved.</p>
        <p style="margin: 4px 0 0 0;">You received this email because daily study reminders are enabled for ${to}.</p>
      </div>
    </div>
  `;

  const textContent = `
Dear ${fullName},

Time for today's study session (${preferredStudyTime})!

Today's Goal: ${dailyQuestionGoal} Questions & Active Recall Flashcards.

Log in now to keep your study streak active: https://www.avero.academy/dashboard

Best regards,
The AVERO ACADEMY Team
  `;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing. Skipping actual Resend email dispatch for Daily Reminder.");
    return {
      id: "mock-reminder-" + Date.now(),
      messageId: "mock-reminder-" + Date.now(),
      accepted: [to],
      content: textContent,
    };
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [to],
    subject,
    text: textContent,
    html: htmlContent,
    attachments: getLogoAttachment(),
  });

  if (error) {
    console.error("Resend error (sendDailyStudyReminderEmail):", error);
    throw new Error(error.message);
  }

  return { messageId: data?.id, accepted: [to], ...data };
}

export async function sendSubscriptionActivatedEmail({
  to,
  fullName,
  planName = "Pro Plan",
  expiresAt,
  isAdminGranted = false,
}: {
  to: string;
  fullName: string;
  planName?: string;
  expiresAt?: Date | string;
  isAdminGranted?: boolean;
}) {
  const subject = `🎉 Your AVERO ACADEMY ${planName} Access is Now Active!`;
  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Lifetime / Recurring";

  const activationSource = isAdminGranted
    ? "Granted by Administrator"
    : "Verified via Paystack Payment";

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2866e1;">
        <img src="cid:email-logo.jpeg" alt="AVERO ACADEMY" style="max-width: 200px; height: auto; display: block; margin: 0 auto 12px auto;" />
        <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0;">Subscription Activation Notice</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Congratulations, ${fullName}! 🎉</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Your subscription to <strong>AVERO ACADEMY ${planName}</strong> has been successfully activated. You now have unlocked full, unlimited access to our entire question bank repository.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #2866e1; font-size: 14px; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; font-weight: 700;">Subscription Summary:</h3>
          <ul style="color: #334155; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Subscriber:</strong> ${fullName} (${to})</li>
            <li><strong>Access Tier:</strong> ${planName} (PRO Badge Unlocked)</li>
            <li><strong>Activation Method:</strong> ${activationSource}</li>
            <li><strong>Valid Until:</strong> ${formattedExpiry}</li>
            <li><strong>Perks Unlocked:</strong> Unlimited Past Questions, Custom Flashcard Review, Study Schedule Planner & Saved Questions</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.avero.academy/dashboard" style="background-color: #2866e1; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; border-radius: 12px; display: inline-block;">
            Access Your Pro Dashboard
          </a>
        </div>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} AVERO ACADEMY Technologies Inc. All rights reserved.</p>
        <p style="margin: 4px 0 0 0;">This email confirms your subscription status for ${to}.</p>
      </div>
    </div>
  `;

  const textContent = `
Dear ${fullName},

Your AVERO ACADEMY ${planName} subscription is now active!

Details:
- Plan: ${planName}
- Status: Active
- Activation: ${activationSource}
- Expiration Date: ${formattedExpiry}

Unlocked Features:
- Unlimited Past Questions
- Custom Flashcard Reviews
- Automated Study Schedule Planner
- Saved Questions & Bookmarks

Log in to start practicing: https://www.avero.academy/dashboard

Best regards,
The AVERO ACADEMY Team
  `;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing. Skipping actual Resend email dispatch for Subscription Activation.");
    return { id: "mock-sub-active-" + Date.now(), messageId: "mock-sub-active-" + Date.now(), accepted: [to], content: textContent };
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [to],
    subject,
    text: textContent,
    html: htmlContent,
    attachments: getLogoAttachment(),
  });

  if (error) {
    console.error("Resend error (sendSubscriptionActivatedEmail):", error);
    throw new Error(error.message);
  }

  return { messageId: data?.id, accepted: [to], ...data };
}

export async function sendSubscriptionExpiringSoonEmail({
  to,
  fullName,
  planName = "Pro Plan",
  expiresAt,
  daysLeft = 3,
}: {
  to: string;
  fullName: string;
  planName?: string;
  expiresAt?: Date | string;
  daysLeft?: number;
}) {
  const subject = `⚠️ Your AVERO ACADEMY ${planName} Subscription Expires in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}!`;
  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Soon";

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #eab308;">
        <img src="cid:email-logo.jpeg" alt="AVERO ACADEMY" style="max-width: 200px; height: auto; display: block; margin: 0 auto 12px auto;" />
        <p style="color: #854d0e; font-size: 13px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0;">Subscription Expiration Warning</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Notice for ${fullName}</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Your <strong>AVERO ACADEMY ${planName}</strong> subscription is set to expire on <strong>${formattedExpiry}</strong> (in ${daysLeft} day${daysLeft === 1 ? "" : "s"}).
        </p>

        <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #a16207; font-size: 14px; text-transform: uppercase; margin-top: 0; margin-bottom: 8px; font-weight: 700;">Don't Lose Your Progress:</h3>
          <p style="color: #713f12; font-size: 14px; margin: 0; line-height: 1.6;">
            Renew your subscription today to ensure uninterrupted access to unlimited past questions, flashcards, study schedules, and saved questions.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.avero.academy/pricing" style="background-color: #2866e1; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; border-radius: 12px; display: inline-block;">
            Renew Subscription Now
          </a>
        </div>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} AVERO ACADEMY Technologies Inc. All rights reserved.</p>
        <p style="margin: 4px 0 0 0;">Sent to ${to}.</p>
      </div>
    </div>
  `;

  const textContent = `
Dear ${fullName},

Your AVERO ACADEMY ${planName} subscription is expiring in ${daysLeft} day(s) on ${formattedExpiry}.

Renew now to keep full access to unlimited past questions, flashcards, and study schedules:
https://www.avero.academy/pricing

Best regards,
The AVERO ACADEMY Team
  `;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing. Skipping actual Resend email dispatch for Expiring Subscription.");
    return { id: "mock-sub-expiring-" + Date.now(), messageId: "mock-sub-expiring-" + Date.now(), accepted: [to], content: textContent };
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [to],
    subject,
    text: textContent,
    html: htmlContent,
    attachments: getLogoAttachment(),
  });

  if (error) {
    console.error("Resend error (sendSubscriptionExpiringSoonEmail):", error);
    throw new Error(error.message);
  }

  return { messageId: data?.id, accepted: [to], ...data };
}

export async function sendSubscriptionExpiredEmail({
  to,
  fullName,
}: {
  to: string;
  fullName: string;
}) {
  const subject = "Your AVERO ACADEMY Pro Subscription Has Expired";

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #ef4444;">
        <img src="cid:email-logo.jpeg" alt="AVERO ACADEMY" style="max-width: 200px; height: auto; display: block; margin: 0 auto 12px auto;" />
        <p style="color: #991b1b; font-size: 13px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0 0;">Subscription Expired</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Hello, ${fullName}</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Your <strong>AVERO ACADEMY Pro Subscription</strong> has expired. Your account has automatically reverted to the Freemium plan.
        </p>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #991b1b; font-size: 14px; text-transform: uppercase; margin-top: 0; margin-bottom: 8px; font-weight: 700;">Freemium Restrictions Applied:</h3>
          <ul style="color: #7f1d1d; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Limited question access per course</li>
            <li>Flashcard reviews disabled</li>
            <li>Study schedule planner locked</li>
            <li>Saving questions & bookmarks locked</li>
          </ul>
        </div>

        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          You can upgrade back to Pro anytime to reactivate all features and continue your board exam preparation.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.avero.academy/pricing" style="background-color: #2866e1; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; border-radius: 12px; display: inline-block;">
            Re-Activate Pro Access
          </a>
        </div>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} AVERO ACADEMY Technologies Inc. All rights reserved.</p>
        <p style="margin: 4px 0 0 0;">Sent to ${to}.</p>
      </div>
    </div>
  `;

  const textContent = `
Dear ${fullName},

Your AVERO ACADEMY Pro Subscription has expired and your account has reverted to Freemium.

To reactivate full access to questions, flashcards, and study planners:
https://www.avero.academy/pricing

Best regards,
The AVERO ACADEMY Team
  `;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing. Skipping actual Resend email dispatch for Expired Subscription.");
    return { id: "mock-sub-expired-" + Date.now(), messageId: "mock-sub-expired-" + Date.now(), accepted: [to], content: textContent };
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [to],
    subject,
    text: textContent,
    html: htmlContent,
    attachments: getLogoAttachment(),
  });

  if (error) {
    console.error("Resend error (sendSubscriptionExpiredEmail):", error);
    throw new Error(error.message);
  }

  return { messageId: data?.id, accepted: [to], ...data };
}
