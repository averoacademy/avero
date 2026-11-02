import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { signUserToken, USER_COOKIE_NAME } from "@/lib/userAuth";
import { isProUser } from "@/lib/subscription";
import { getAndUpdateUserStreak } from "@/lib/streak";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email. Please sign up first." },
        { status: 404 }
      );
    }

    if (user.passwordHash) {
      if (!password) {
        return NextResponse.json(
          { error: "Password is required for this account." },
          { status: 400 }
        );
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Invalid email or password. Please try again." },
          { status: 401 }
        );
      }
    } else if (password && password.trim().length > 0) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    const sessionId = crypto.randomUUID();
    user.currentSessionId = sessionId;
    await user.save();

    const streak = user.currentStreakDays || 0;

    const token = signUserToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      sessionId,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful.",
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
          currentStreakDays: streak,
          isPro: isProUser(user),
          dailyQuestionGoal: user.dailyQuestionGoal ?? 20,
          subscriptionPlan: user.subscriptionPlan || "free",
        },
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
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred during authentication." },
      { status: 500 }
    );
  }
}
