import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromSession } from "@/lib/userAuth";
import ExamAttempt, { ISubjectBreakdown } from "@/models/ExamAttempt";
import Course from "@/models/Course";
import Category from "@/models/Category";
import User from "@/models/User";
import { getAndUpdateUserStreak } from "@/lib/streak";

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paperTitle, answers, timeTakenSeconds } = body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty answer submission." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const totalQuestions = answers.length;
    const correctCount = answers.filter((a: any) => a.isCorrect).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passingThreshold = 50; // Standard council pass mark threshold
    const passed = score >= passingThreshold;

    // Calculate subject-by-subject breakdown
    const subjectMap: Record<
      string,
      { courseId?: string; courseTitle: string; totalQuestions: number; correctCount: number }
    > = {};

    const sanitizedAnswers = answers.map((a: any) => {
      const cTitle = a.courseTitle || "General Knowledge";
      if (!subjectMap[cTitle]) {
        subjectMap[cTitle] = {
          courseId: a.courseId || "",
          courseTitle: cTitle,
          totalQuestions: 0,
          correctCount: 0,
        };
      }
      subjectMap[cTitle].totalQuestions += 1;
      if (a.isCorrect) {
        subjectMap[cTitle].correctCount += 1;
      }

      return {
        questionId: a.questionId || "",
        courseId: a.courseId || "",
        courseTitle: cTitle,
        questionText: a.questionText || "",
        userChoice: a.userChoice || "",
        correctChoice: a.correctChoice || "",
        isCorrect: !!a.isCorrect,
        explanation: a.explanation || "",
      };
    });

    const subjectBreakdown: ISubjectBreakdown[] = Object.values(subjectMap).map((sub) => ({
      courseId: sub.courseId,
      courseTitle: sub.courseTitle,
      totalQuestions: sub.totalQuestions,
      correctCount: sub.correctCount,
      score: sub.totalQuestions > 0 ? Math.round((sub.correctCount / sub.totalQuestions) * 100) : 0,
    }));

    const attempt = await ExamAttempt.create({
      userId: user._id,
      isMockExam: true,
      paperTitle: paperTitle || "Council Mock Exam",
      score,
      totalQuestions,
      correctCount,
      passed,
      timeTakenSeconds: timeTakenSeconds || 0,
      mode: "Exam",
      answers: sanitizedAnswers,
      subjectBreakdown,
    });

    const streak = await getAndUpdateUserStreak(user._id);

    return NextResponse.json({
      success: true,
      message: "Mock exam submitted successfully.",
      attemptId: attempt._id,
      currentStreakDays: streak,
      score,
      correctCount,
      totalQuestions,
      passed,
      subjectBreakdown,
    });
  } catch (error: any) {
    console.error("Error submitting mock exam:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit mock exam." },
      { status: 500 }
    );
  }
}
