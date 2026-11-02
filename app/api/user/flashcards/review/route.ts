import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/userAuth";
import { connectToDatabase } from "@/lib/mongodb";
import FlashcardProgress from "@/models/FlashcardProgress";
import { getAndUpdateUserStreak } from "@/lib/streak";

export async function POST(request: Request) {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, rating } = body; // rating can be 1 (Again), 3 (Hard), 4 (Good), 5 (Easy)

    if (!cardId || rating === undefined) {
      return NextResponse.json(
        { error: "cardId and rating (1-5) are required." },
        { status: 400 }
      );
    }

    const q = Number(rating);
    if (isNaN(q) || q < 0 || q > 5) {
      return NextResponse.json(
        { error: "Rating must be a number between 0 and 5." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const card = await FlashcardProgress.findOne({
      _id: cardId,
      userId: sessionUser._id,
    });

    if (!card) {
      return NextResponse.json({ error: "Flashcard not found." }, { status: 404 });
    }

    let repetitions = card.repetitions || 0;
    let intervalDays = card.intervalDays || 0;
    let easeFactor = card.easeFactor || 2.5;

    if (q < 3) {
      // Failed recall
      repetitions = 0;
      intervalDays = 1;
    } else {
      // Successful recall
      repetitions += 1;
      if (repetitions === 1) {
        intervalDays = 1;
      } else if (repetitions === 2) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
    }

    // SuperMemo 2 Ease Factor equation:
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const newEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    easeFactor = Math.max(1.3, Number(newEaseFactor.toFixed(2)));

    // Calculate next review timestamp
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + Math.max(1, intervalDays));

    card.repetitions = repetitions;
    card.intervalDays = intervalDays;
    card.easeFactor = easeFactor;
    card.nextReviewDate = nextReviewDate;
    card.lastReviewedAt = new Date();
    await card.save();

    const streak = await getAndUpdateUserStreak(sessionUser._id);

    return NextResponse.json({
      success: true,
      currentStreakDays: streak,
      card: {
        id: card._id,
        repetitions,
        intervalDays,
        easeFactor,
        nextReviewDate,
      },
    });
  } catch (error: any) {
    console.error("Error rating flashcard:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit flashcard review." },
      { status: 500 }
    );
  }
}
