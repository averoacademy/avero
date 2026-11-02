import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/userAuth";
import { isProUser } from "@/lib/subscription";
import { getAndUpdateUserStreak } from "@/lib/streak";

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const streak = await getAndUpdateUserStreak(user._id);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        studentType: user.studentType,
        university: user.university,
        gradYear: user.gradYear,
        isOnboarded: user.isOnboarded,
        subscriptionPlan: user.subscriptionPlan || "free",
        subscriptionStatus: user.subscriptionStatus || null,
        subscriptionExpiresAt: user.subscriptionExpiresAt || null,
        isPro: isProUser(user),
        avatar: user.avatar || "",
        currentStreakDays: streak,
        dailyQuestionGoal: user.dailyQuestionGoal ?? 20,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/user/me:", error);
    return NextResponse.json(
      { error: "Failed to fetch user session." },
      { status: 500 }
    );
  }
}
