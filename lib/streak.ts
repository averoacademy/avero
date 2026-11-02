import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import ExamAttempt from "@/models/ExamAttempt";
import FlashcardProgress from "@/models/FlashcardProgress";
import User from "@/models/User";

/**
 * Calculates a student's consecutive active study streak in days.
 * An active day is any day the user completed an exam attempt or reviewed flashcards.
 * If active today, the streak includes today + consecutive preceding days.
 * If not yet active today, but active yesterday, the streak remains intact (preceding days up to yesterday)
 * so that streaks don't prematurely reset before the day ends.
 */
export async function calculateUserStreak(userId: mongoose.Types.ObjectId | string): Promise<number> {
  try {
    await connectToDatabase();
    const uid = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [attempts, flashcards] = await Promise.all([
      ExamAttempt.find({ userId: uid, createdAt: { $gte: sixtyDaysAgo } }).select("createdAt").lean(),
      FlashcardProgress.find({ userId: uid, lastReviewedAt: { $gte: sixtyDaysAgo } })
        .select("lastReviewedAt")
        .lean(),
    ]);

    const dateSet = new Set<string>();

    const addDate = (d: Date) => {
      if (!d || isNaN(d.getTime())) return;
      // ISO UTC string "YYYY-MM-DD"
      dateSet.add(d.toISOString().split("T")[0]);
      // Local date string "YYYY-MM-DD"
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dateSet.add(`${y}-${m}-${day}`);
    };

    attempts.forEach((a: any) => {
      if (a.createdAt) addDate(new Date(a.createdAt));
    });

    flashcards.forEach((f: any) => {
      if (f.lastReviewedAt) addDate(new Date(f.lastReviewedAt));
    });

    if (dateSet.size === 0) {
      return 0;
    }

    const now = new Date();
    const todayIso = now.toISOString().split("T")[0];
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yIso = yesterday.toISOString().split("T")[0];
    const yLocal = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const activeToday = dateSet.has(todayIso) || dateSet.has(todayLocal);
    const activeYesterday = dateSet.has(yIso) || dateSet.has(yLocal);

    if (!activeToday && !activeYesterday) {
      return 0;
    }

    let streak = 0;
    let checkDate: Date;

    if (activeToday) {
      streak = 1;
      checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      streak = 1;
      checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Walk backward consecutive days
    while (true) {
      const dIso = checkDate.toISOString().split("T")[0];
      const dLocal = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
      if (dateSet.has(dIso) || dateSet.has(dLocal)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error("Error calculating user streak:", error);
    return 0;
  }
}

/**
 * Calculates the current streak and synchronizes it to the User model.
 */
export async function getAndUpdateUserStreak(userId: mongoose.Types.ObjectId | string): Promise<number> {
  try {
    await connectToDatabase();
    // Cache streak check: if user was already updated within the last 15 minutes today, return immediately
    const user = await User.findById(userId).select("currentStreakDays lastStudyDate updatedAt").lean();
    if (user) {
      const isUpdatedToday = user.lastStudyDate && new Date(user.lastStudyDate).toDateString() === new Date().toDateString();
      const recentlySynced = user.updatedAt && (Date.now() - new Date(user.updatedAt).getTime() < 15 * 60 * 1000);
      if (isUpdatedToday && recentlySynced && user.currentStreakDays !== undefined) {
        return user.currentStreakDays;
      }
    }

    const streak = await calculateUserStreak(userId);
    await User.findByIdAndUpdate(userId, {
      currentStreakDays: streak,
      ...(streak > 0 ? { lastStudyDate: new Date() } : {}),
    });
    return streak;
  } catch (error) {
    console.error("Error updating user streak:", error);
    return 0;
  }
}
