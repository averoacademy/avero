import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromSession } from "@/lib/userAuth";
import ExamAttempt from "@/models/ExamAttempt";
import Announcement from "@/models/Announcement";
import Course from "@/models/Course";
import Category from "@/models/Category";
import { getAndUpdateUserStreak } from "@/lib/streak";

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const streak = await getAndUpdateUserStreak(user._id);

    // Fetch user exam attempts
    const attempts = await ExamAttempt.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .populate("courseId", "title categoryId thumbnail level")
      .lean();

    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter((a) => a.passed).length;
    const totalScoreSum = attempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const averageScore = totalAttempts > 0 ? Math.round(totalScoreSum / totalAttempts) : 0;
    const totalTimeSpentSeconds = attempts.reduce((acc, curr) => acc + (curr.timeTakenSeconds || 0), 0);

    // Get unique passed courses
    const passedCourseIds = new Set(
      attempts.filter((a) => a.passed && a.courseId).map((a: any) => a.courseId._id.toString())
    );
    const completedCoursesCount = passedCourseIds.size;

    // Fetch published courses for recommendations
    const recommendedCourses = await Course.find({ status: "Published" })
      .select("title slug description level timeLimitMinutes passingScorePercentage questions modules thumbnail categoryId")
      .populate("categoryId", "name slug icon")
      .limit(4)
      .lean();

    // Fetch announcements targeted for students
    const activeAnnouncements = await Announcement.find({
      isActive: true,
      targetRole: { $in: ["all", "student"] },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    return NextResponse.json({
      success: true,
      currentStreakDays: streak,
      stats: {
        totalAttempts,
        passedAttempts,
        averageScore,
        totalTimeSpentSeconds,
        completedCoursesCount,
        currentStreakDays: streak,
      },
      recentAttempts: attempts.slice(0, 5),
      recommendedCourses,
      announcements: activeAnnouncements,
    });
  } catch (error: any) {
    console.error("Error fetching student dashboard stats:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch student statistics." },
      { status: 500 }
    );
  }
}
