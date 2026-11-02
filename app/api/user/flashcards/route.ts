import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/userAuth";
import { connectToDatabase } from "@/lib/mongodb";
import FlashcardProgress from "@/models/FlashcardProgress";
import Course from "@/models/Course";
import { isProUser } from "@/lib/subscription";

export async function GET(request: Request) {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isProUser(sessionUser)) {
      return NextResponse.json(
        { error: "Spaced-repetition flashcards are exclusive to Pro members.", code: "PRO_REQUIRED" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const mode = searchParams.get("mode"); // "due" or "all"

    const filter: any = { userId: sessionUser._id };
    if (courseId) {
      filter.courseId = courseId;
    }

    if (mode === "due") {
      filter.nextReviewDate = { $lte: new Date() };
    }

    const summary = searchParams.get("summary") === "true";
    if (summary) {
      const dueCount = await FlashcardProgress.countDocuments({
        userId: sessionUser._id,
        nextReviewDate: { $lte: new Date() },
      });
      return NextResponse.json({
        success: true,
        cards: [],
        dueCount,
      });
    }

    // Fetch flashcard progress items
    let cards = await FlashcardProgress.find(filter)
      .populate("courseId", "title categoryId")
      .sort({ nextReviewDate: 1 });

    // If no flashcards exist yet for user, generate initial flashcards from published courses
    if (cards.length === 0 && !courseId) {
      const courses = await Course.find({ status: "Published" }).limit(5);
      const newFlashcards: any[] = [];

      for (const course of courses) {
        if (course.questions && course.questions.length > 0) {
          for (let i = 0; i < course.questions.length; i++) {
            const q = course.questions[i];
            newFlashcards.push({
              userId: sessionUser._id,
              courseId: course._id,
              questionId: q._id ? q._id.toString() : `q_${course._id}_${i}`,
              questionText: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || "",
              repetitions: 0,
              intervalDays: 0,
              easeFactor: 2.5,
              nextReviewDate: new Date(),
            });
          }
        }
      }

      if (newFlashcards.length > 0) {
        await FlashcardProgress.insertMany(newFlashcards);
        cards = await FlashcardProgress.find({ userId: sessionUser._id })
          .populate("courseId", "title categoryId")
          .sort({ nextReviewDate: 1 });
      }
    }

    const dueCount = await FlashcardProgress.countDocuments({
      userId: sessionUser._id,
      nextReviewDate: { $lte: new Date() },
    });

    const totalCount = await FlashcardProgress.countDocuments({
      userId: sessionUser._id,
    });

    return NextResponse.json({
      success: true,
      cards,
      dueCount,
      totalCount,
    });
  } catch (error: any) {
    console.error("Error fetching flashcards:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load flashcards." },
      { status: 500 }
    );
  }
}
