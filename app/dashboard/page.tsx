"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  BookOpen,
  Megaphone,
  BarChart2,
  PlayCircle,
  FileText,
  Brain,
  Bookmark,
  Calendar,
  Flame,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface IStats {
  totalAttempts: number;
  passedAttempts: number;
  averageScore: number;
  totalTimeSpentSeconds: number;
  completedCoursesCount: number;
}

function StudentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<IStats | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [flashcardsDueCount, setFlashcardsDueCount] = useState<number>(0);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, userRes, flashcardsRes, scheduleRes] = await Promise.all([
        fetch("/api/user/stats"),
        fetch("/api/user/me"),
        fetch("/api/user/flashcards?mode=due"),
        fetch("/api/user/schedule"),
      ]);

      const statsData = await statsRes.json();
      const userData = await userRes.json();
      const flashcardsData = await flashcardsRes.json();
      const schedData = await scheduleRes.json();

      if (userData.success) {
        setUser(userData.user);
      }

      if (statsData.success) {
        setStats(statsData.stats);
        setRecentAttempts(statsData.recentAttempts || []);
        setRecommendedCourses(statsData.recommendedCourses || []);
        setAnnouncements(statsData.announcements || []);
      } else {
        console.error("Failed to load dashboard stats:", statsData.error);
      }

      if (flashcardsData.success) {
        setFlashcardsDueCount(flashcardsData.dueCount || 0);
      }

      if (schedData.success) {
        setScheduleData(schedData.schedule);
      }
    } catch (err) {
      console.error("Error loading student dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Check for Paystack payment verification query param
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (reference) {
      setVerifyingPayment(true);
      fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setPaymentBanner({
              type: "success",
              message: data.message || "Payment verified! Your Avero Pro subscription is now active.",
            });
            fetchDashboardData();
          } else {
            setPaymentBanner({
              type: "error",
              message: data.error || "Payment verification failed. If you were charged, please contact support.",
            });
          }
        })
        .catch((err) => {
          console.error("Error verifying payment:", err);
          setPaymentBanner({
            type: "error",
            message: "Failed to verify transaction. Please contact support if your payment was processed.",
          });
        })
        .finally(() => {
          setVerifyingPayment(false);
          // Clean search params from URL
          router.replace("/dashboard");
        });
    }
  }, [searchParams, router]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Payment Verification Banner */}
      {verifyingPayment && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-blue-900 text-xs font-semibold shadow-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#2866e1] shrink-0" />
          <span>Verifying your Paystack payment reference... Please wait.</span>
        </div>
      )}

      {paymentBanner && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-xs ${
            paymentBanner.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {paymentBanner.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{paymentBanner.message}</span>
          </div>
          <button
            onClick={() => setPaymentBanner(null)}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e40af] via-[#2866e1] to-[#3b82f6] p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold mb-3 border border-white/20">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{user?.studentType || "Healthcare Student"}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.fullName || "Student"}! 👋
            </h1>
            <p className="text-xs md:text-sm text-blue-100 mt-2 max-w-xl leading-relaxed">
              Track your practice progress, prepare for board exams with real rationales, and master clinical course test banks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/dashboard/courses"
              className="px-5 py-2.5 bg-white text-[#2866e1] hover:bg-blue-50 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Test Banks</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Active System Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann._id}
              className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-amber-900 shadow-xs"
            >
              <Megaphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-bold text-amber-950 text-sm mb-0.5">{ann.title}</div>
                <div className="text-amber-800">{ann.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Exam Attempts */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-[#2866e1]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tests Attempted
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#2866e1]/10 border border-[#2866e1]/20 text-[#2866e1] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats?.totalAttempts || 0}</div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Practice & Exam sessions completed
          </div>
        </div>

        {/* Average Pass Accuracy % */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-[#2866e1]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg. Accuracy
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {stats?.averageScore || 0}%
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1">
            <span className="text-emerald-600 font-bold">{stats?.passedAttempts || 0}</span> tests passed
          </div>
        </div>

        {/* Passed Courses */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-[#2866e1]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Passed Modules
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {stats?.completedCoursesCount || 0}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Courses successfully mastered
          </div>
        </div>

        {/* Total Time Spent */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-[#2866e1]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Study Time
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {formatTime(stats?.totalTimeSpentSeconds || 0)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Total active practice time
          </div>
        </div>
      </div>

      {/* Active Learning & Spaced Repetition Habits Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Widget 1: SM-2 Spaced Repetition Flashcards */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#2866e1]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Spaced Repetition Deck
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#2866e1]/30 text-[#60a5fa] font-mono text-[10px] font-bold border border-[#2866e1]/40">
              SM-2 Engine
            </span>
          </div>

          <div className="space-y-1 mb-4">
            <div className="text-3xl font-black text-white">
              {flashcardsDueCount} <span className="text-sm font-semibold text-slate-400">Cards Due Today</span>
            </div>
            <p className="text-xs text-slate-400">
              {flashcardsDueCount > 0
                ? "Review past question rationales before memory decay occurs."
                : "All flashcards completed for today! Retest to reinforce memory."}
            </p>
          </div>

          <Link
            href="/dashboard/flashcards"
            className="w-full py-2.5 px-4 bg-[#2866e1] hover:bg-[#1d52bf] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition text-center"
          >
            <Brain className="w-4 h-4" /> Start Flashcard Review Session
          </Link>
        </div>

        {/* Widget 2: Daily Study Goal & Streak */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Daily Goal & Streak
              </span>
            </div>
            <span className="text-xs font-black text-amber-600 flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              🔥 {scheduleData?.currentStreakDays || 0} Day Streak
            </span>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-baseline text-xs">
              <span className="font-bold text-slate-700">Questions Today</span>
              <span className="font-extrabold text-[#2866e1]">
                {scheduleData?.questionsCompletedToday || 0} / {scheduleData?.dailyQuestionGoal || 20}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className="bg-[#2866e1] h-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((scheduleData?.questionsCompletedToday || 0) /
                        (scheduleData?.dailyQuestionGoal || 20)) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          <Link
            href="/dashboard/schedule"
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition text-center"
          >
            <Calendar className="w-4 h-4 text-[#2866e1]" /> View Study Planner & Habits
          </Link>
        </div>
      </div>

      {/* Recommended Courses & Quick Start Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Available Test Banks & Courses</h2>
            <p className="text-xs text-slate-500">Practice questions with detailed rationales</p>
          </div>
          <Link
            href="/dashboard/courses"
            className="text-xs font-bold text-[#2866e1] hover:text-[#1d52bf] flex items-center gap-1"
          >
            View All Courses <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recommendedCourses.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-500 text-xs">
            No published courses available yet. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendedCourses.map((course) => (
              <div
                key={course._id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#2866e1]/10 text-[#2866e1] border border-[#2866e1]/20 font-bold text-[10px]">
                      {course.categoryId?.name || "General"}
                    </span>
                    {/* <span className="text-[10px] font-semibold text-slate-400">
                      {course.level}
                    </span> */}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-4">
                    {course.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {course.questions?.length || 0} Questions
                  </span>
                  <Link
                    href={`/dashboard/courses/${course._id}`}
                    className="px-3 py-1.5 rounded-lg bg-[#2866e1] hover:bg-[#1d52bf] text-white font-bold text-xs flex items-center gap-1 transition"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Start
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Practice Attempts & Rationale History */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Attempt History</h3>
            <p className="text-xs text-slate-500">Review your past test scores and answer rationales</p>
          </div>
          <Link
            href="/dashboard/attempts"
            className="text-xs font-bold text-[#2866e1] hover:text-[#1d52bf] flex items-center gap-1"
          >
            View Full History <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            You haven't attempted any tests yet. Click "Start Practice Session" above to begin!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-2">Course Title</th>
                  <th className="pb-3 px-2">Mode</th>
                  <th className="pb-3 px-2">Score</th>
                  <th className="pb-3 px-2">Time Spent</th>
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2 text-right">Rationale Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentAttempts.map((attempt) => (
                  <tr key={attempt._id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-2 font-semibold text-slate-900">
                      {attempt.courseId?.title || "Test Bank"}
                    </td>
                    <td className="py-3.5 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          attempt.mode === "Exam"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {attempt.mode}
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        {attempt.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                        <span className={attempt.passed ? "text-emerald-700" : "text-rose-700"}>
                          {attempt.score}% ({attempt.correctCount}/{attempt.totalQuestions})
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 font-medium">
                      {formatTime(attempt.timeTakenSeconds)}
                    </td>
                    <td className="py-3.5 px-2 text-slate-400">
                      {new Date(attempt.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <Link
                        href={`/dashboard/attempts/${attempt._id}`}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-[#2866e1]/10 text-slate-700 hover:text-[#2866e1] font-semibold text-xs transition inline-flex items-center gap-1"
                      >
                        <BarChart2 className="w-3.5 h-3.5" /> Rationales
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2866e1]" />
        </div>
      }
    >
      <StudentDashboardContent />
    </Suspense>
  );
}

