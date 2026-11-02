import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ExamAttempt from "@/models/ExamAttempt";
import User from "@/models/User";
import Course from "@/models/Course";
import Category from "@/models/Category";

export async function GET() {
  try {
    await connectToDatabase();

    // Query aggregated metrics and recent attempts efficiently without loading all answers into memory
    const [totalAttempts, passedCount, avgScoreResult, recentAttempts, topMissed] = await Promise.all([
      ExamAttempt.countDocuments(),
      ExamAttempt.countDocuments({ passed: true }),
      ExamAttempt.aggregate([
        { $group: { _id: null, avgScore: { $avg: "$score" } } },
      ]),
      ExamAttempt.find()
        .select("-answers")
        .populate("userId", "fullName email role university")
        .populate("courseId", "title categoryId subcategoryName")
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
      ExamAttempt.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 150 },
        { $unwind: "$answers" },
        { $match: { "answers.isCorrect": false } },
        {
          $group: {
            _id: "$answers.questionText",
            failCount: { $sum: 1 },
            courseTitle: { $first: "$answers.courseTitle" },
          },
        },
        { $sort: { failCount: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            questionText: "$_id",
            failCount: 1,
            courseTitle: { $ifNull: ["$courseTitle", "General Exam"] },
          },
        },
      ]),
    ]);

    const overallPassRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
    const avgScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore || 0) : 0;

    return NextResponse.json({
      success: true,
      telemetry: {
        totalAttempts,
        passedCount,
        failedCount: totalAttempts - passedCount,
        overallPassRate,
        avgScore,
        topFailedQuestions: topMissed,
        recentAttempts,
      },
    });
  } catch (error: any) {
    console.error("Admin candidate analytics error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch candidate analytics." },
      { status: 500 }
    );
  }
}
