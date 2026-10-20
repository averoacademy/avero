import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  email: string;
  role: "student" | "educator" | "admin";
  passwordHash?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  studentType?: string;
  university?: string;
  gradYear?: string;
  dailyQuestionGoal?: number;
  dailyStudyTimeMinutes?: number;
  preferredStudyTime?: string;
  emailRemindersEnabled?: boolean;
  pushRemindersEnabled?: boolean;
  reminderLeadTimeMinutes?: number;
  currentStreakDays?: number;
  lastStudyDate?: Date;
  lastReminderSentDate?: Date;
  lastAdvanceReminderSentDate?: Date;
  isOnboarded: boolean;
  isSuspended?: boolean;
  subscriptionPlan?: "free" | "pro";
  subscriptionStatus?: "active" | "canceled" | "past_due" | null;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  subscriptionExpiresAt?: Date;
  lastExpiringNoticeSentDate?: Date;
  lastExpiredNoticeSentDate?: Date;
  currentSessionId?: string;
  expoPushToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["student", "educator", "admin"],
      default: "student",
    },
    passwordHash: {
      type: String,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    studentType: {
      type: String,
      trim: true,
    },
    university: {
      type: String,
      trim: true,
    },
    gradYear: {
      type: String,
      trim: true,
    },
    dailyQuestionGoal: {
      type: Number,
      default: 20,
    },
    dailyStudyTimeMinutes: {
      type: Number,
      default: 30,
    },
    preferredStudyTime: {
      type: String,
      default: "20:00",
    },
    emailRemindersEnabled: {
      type: Boolean,
      default: true,
    },
    pushRemindersEnabled: {
      type: Boolean,
      default: true,
    },
    reminderLeadTimeMinutes: {
      type: Number,
      default: 0,
    },
    currentStreakDays: {
      type: Number,
      default: 0,
    },
    lastStudyDate: {
      type: Date,
    },
    lastReminderSentDate: {
      type: Date,
    },
    lastAdvanceReminderSentDate: {
      type: Date,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    subscriptionPlan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "canceled", "past_due", null],
      default: null,
    },
    paystackCustomerCode: {
      type: String,
      default: "",
    },
    paystackSubscriptionCode: {
      type: String,
      default: "",
    },
    subscriptionExpiresAt: {
      type: Date,
    },
    lastExpiringNoticeSentDate: {
      type: Date,
    },
    lastExpiredNoticeSentDate: {
      type: Date,
    },
    currentSessionId: {
      type: String,
      default: "",
    },
    expoPushToken: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models && mongoose.models.User) {
  delete mongoose.models.User;
}

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
