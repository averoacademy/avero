import mongoose, { Schema, Document, Model, Types } from "mongoose";
import "./User";
import "./Course";

export interface IAttemptAnswer {
  questionId?: string;
  courseId?: string;
  courseTitle?: string;
  questionText: string;
  userChoice: string;
  correctChoice: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface ISubjectBreakdown {
  courseId?: string;
  courseTitle: string;
  totalQuestions: number;
  correctCount: number;
  score: number;
}

export interface IExamAttempt extends Document {
  userId: Types.ObjectId;
  courseId?: Types.ObjectId;
  isMockExam?: boolean;
  paperTitle?: string;
  subjectBreakdown?: ISubjectBreakdown[];
  score: number;
  totalQuestions: number;
  correctCount: number;
  passed: boolean;
  timeTakenSeconds: number;
  mode: "Practice" | "Exam";
  answers: IAttemptAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

const AttemptAnswerSchema = new Schema<IAttemptAnswer>({
  questionId: { type: String },
  courseId: { type: String },
  courseTitle: { type: String },
  questionText: { type: String, required: true },
  userChoice: { type: String, default: "" },
  correctChoice: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  explanation: { type: String, default: "" },
});

const SubjectBreakdownSchema = new Schema<ISubjectBreakdown>({
  courseId: { type: String },
  courseTitle: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  score: { type: Number, required: true },
});

const ExamAttemptSchema: Schema<IExamAttempt> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: false,
    },
    isMockExam: {
      type: Boolean,
      default: false,
    },
    paperTitle: {
      type: String,
      default: "",
    },
    subjectBreakdown: [SubjectBreakdownSchema],
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctCount: {
      type: Number,
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
    },
    mode: {
      type: String,
      enum: ["Practice", "Exam"],
      default: "Exam",
    },
    answers: [AttemptAnswerSchema],
  },
  {
    timestamps: true,
  }
);

ExamAttemptSchema.index({ createdAt: -1 });
ExamAttemptSchema.index({ userId: 1, createdAt: -1 });
ExamAttemptSchema.index({ passed: 1 });

if (mongoose.models && mongoose.models.ExamAttempt) {
  delete mongoose.models.ExamAttempt;
}

const ExamAttempt: Model<IExamAttempt> =
  mongoose.models.ExamAttempt || mongoose.model<IExamAttempt>("ExamAttempt", ExamAttemptSchema);

export default ExamAttempt;
