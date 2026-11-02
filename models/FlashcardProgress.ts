import mongoose, { Schema, Document, Model, Types } from "mongoose";
import "./User";
import "./Course";

export interface IFlashcardProgress extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: Date;
  lastReviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardProgressSchema: Schema<IFlashcardProgress> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    options: [{ type: String }],
    correctAnswer: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      default: "",
    },
    repetitions: {
      type: Number,
      default: 0,
    },
    intervalDays: {
      type: Number,
      default: 0,
    },
    easeFactor: {
      type: Number,
      default: 2.5,
    },
    nextReviewDate: {
      type: Date,
      default: Date.now,
    },
    lastReviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

FlashcardProgressSchema.index({ userId: 1, nextReviewDate: 1 });
FlashcardProgressSchema.index({ userId: 1, lastReviewedAt: -1 });
FlashcardProgressSchema.index({ userId: 1, courseId: 1 });

if (mongoose.models && mongoose.models.FlashcardProgress) {
  delete mongoose.models.FlashcardProgress;
}

const FlashcardProgress: Model<IFlashcardProgress> =
  mongoose.models.FlashcardProgress ||
  mongoose.model<IFlashcardProgress>("FlashcardProgress", FlashcardProgressSchema);

export default FlashcardProgress;
