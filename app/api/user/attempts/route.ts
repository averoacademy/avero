import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromSession } from "@/lib/userAuth";
import ExamAttempt from "@/models/ExamAttempt";
import Course from "@/models/Course";
import { getAndUpdateUserStreak } from "@/lib/streak";

export async function GET(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const attempts = await ExamAttempt.find({ userId: user._id })
      .populate("courseId", "title categoryId thumbnail level passingScorePercentage")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      attempts,
    });
  } catch (error: any) {
    console.error("Error fetching attempts history:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch attempt history." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { courseId, mode, answers, timeTakenSeconds } = body;

    if (!courseId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Invalid submission data." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const totalQuestions = answers.length;
    const correctCount = answers.filter((a: any) => a.isCorrect).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passingThreshold = course.passingScorePercentage || 75;
    const passed = score >= passingThreshold;

    const sanitizedAnswers = answers.map((a: any) => ({
      questionId: a.questionId || "",
      questionText: a.questionText || "",
      userChoice: a.userChoice || "",
      correctChoice: a.correctChoice || "",
      isCorrect: !!a.isCorrect,
      explanation: a.explanation || "",
    }));

    const attempt = await ExamAttempt.create({
      userId: user._id,
      courseId: course._id,
      score,
      totalQuestions,
      correctCount,
      passed,
      timeTakenSeconds: timeTakenSeconds || 0,
      mode: mode === "Practice" ? "Practice" : "Exam",
      answers: sanitizedAnswers,
    });

    const streak = await getAndUpdateUserStreak(user._id);

    return NextResponse.json({
      success: true,
      message: "Attempt submitted successfully.",
      attemptId: attempt._id,
      currentStreakDays: streak,
      attempt: {
        id: attempt._id,
        score,
        totalQuestions,
        correctCount,
        passed,
        timeTakenSeconds: attempt.timeTakenSeconds,
        mode: attempt.mode,
        createdAt: attempt.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error submitting exam attempt:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record attempt." },
      { status: 500 }
    );
  }
}
