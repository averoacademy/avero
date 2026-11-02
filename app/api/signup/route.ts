import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { sendWelcomeEmail } from "@/lib/email";
import { signUserToken, USER_COOKIE_NAME } from "@/lib/userAuth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, password, role, studentType, university, gradYear } = body;

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Full Name and Email are required fields." },
        { status: 400 }
      );
    }

    // Connect to MongoDB database
    await connectToDatabase();

    // Check if user exists or create/update record in MongoDB
    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    let hashedPassword = "";
    if (password && password.trim().length > 0) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    if (user) {
      // Update existing user's onboarding info
      user.fullName = fullName;
      user.role = role || user.role;
      if (studentType) user.studentType = studentType;
      if (university) user.university = university;
      if (gradYear) user.gradYear = gradYear;
      if (hashedPassword) user.passwordHash = hashedPassword;
      user.isOnboarded = true;
      await user.save();
    } else {
      // Create new user record in MongoDB
      user = await User.create({
        fullName,
        email: normalizedEmail,
        passwordHash: hashedPassword || undefined,
        role: role || "student",
        studentType,
        university,
        gradYear,
        isOnboarded: !!(studentType || university),
      });
    }

    // Dispatch real welcome email via Nodemailer
    let emailStatus = null;
    try {
      emailStatus = await sendWelcomeEmail({
        to: normalizedEmail,
        fullName,
        studentType,
        university,
        gradYear,
      });
    } catch (emailErr) {
      console.error("Error sending welcome email via Nodemailer:", emailErr);
    }

    const emailSentPreview = {
      to: normalizedEmail,
      subject: "Welcome to AVERO ACADEMY - Your Account is Ready!",
      sentAt: new Date().toISOString(),
      content: `Dear ${fullName},\n\nWelcome to AVERO ACADEMY! Your account has been saved in our MongoDB database and initialized for ${studentType || "Healthcare Candidate"} at ${university || "School of Nursing"}.\n\nA confirmation email has been dispatched to ${normalizedEmail}.`,
    };

    const sessionId = crypto.randomUUID();
    user.currentSessionId = sessionId;
    await user.save();

    const token = signUserToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      sessionId,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "User saved to MongoDB and welcome email sent.",
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          studentType: user.studentType,
          university: user.university,
          gradYear: user.gradYear,
          isOnboarded: user.isOnboarded,
          avatar: user.avatar || "",
          currentStreakDays: 0,
          isPro: false,
          createdAt: user.createdAt,
        },
        emailSent: emailSentPreview,
        emailStatus,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: USER_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Signup API error:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
