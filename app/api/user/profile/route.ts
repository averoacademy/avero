import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromSession } from "@/lib/userAuth";
import User from "@/models/User";

import { isProUser } from "@/lib/subscription";

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        avatar: user.avatar || "",
        currentStreakDays: user.currentStreakDays || 0,
        dailyQuestionGoal: user.dailyQuestionGoal ?? 20,
        isPro: isProUser(user),
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/user/profile:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch profile." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, studentType, university, gradYear, avatar } = body;

    await connectToDatabase();

    const dbUser = await User.findById(user._id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (fullName) dbUser.fullName = fullName.trim();
    if (studentType) dbUser.studentType = studentType.trim();
    if (university) dbUser.university = university.trim();
    if (gradYear) dbUser.gradYear = gradYear.trim();
    if (typeof avatar === "string") dbUser.avatar = avatar;

    await dbUser.save();

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: dbUser._id,
        fullName: dbUser.fullName,
        email: dbUser.email,
        role: dbUser.role,
        studentType: dbUser.studentType,
        university: dbUser.university,
        gradYear: dbUser.gradYear,
        isOnboarded: dbUser.isOnboarded,
        avatar: dbUser.avatar || "",
        currentStreakDays: dbUser.currentStreakDays || 0,
        dailyQuestionGoal: dbUser.dailyQuestionGoal ?? 20,
        isPro: isProUser(dbUser),
      },
    });
  } catch (error: any) {
    console.error("Error in PUT /api/user/profile:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
