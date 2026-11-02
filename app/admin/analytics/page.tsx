"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Loader2,
  RefreshCw,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

export default function CandidateAnalyticsPage() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      const data = await res.json();
      if (data.success) {
        setTelemetry(data.telemetry);
      } else {
        console.error("Analytics fetch error:", data.error);
      }
    } catch (err) {
      console.error("Failed to load candidate analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#2866e1]" /> Candidate Exam Analytics & Results
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Monitor candidate test attempts, pass/fail ratios, average scores, and most missed past questions.
          </p>
        </div>

        <button
          onClick={fetchTelemetry}
          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#2866e1]" />
          <span className="text-sm font-semibold">Analyzing candidate test attempts...</span>
        </div>
      ) : (
        <>
          {/* Top Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Attempts */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Exam Attempts
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#2866e1]/10 border border-[#2866e1]/20 text-[#2866e1] flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{telemetry?.totalAttempts || 0}</div>
              <div className="mt-2 text-xs text-slate-500 font-medium">
                Candidate practice attempts recorded
              </div>
            </div>

            {/* Overall Pass Rate */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Overall Pass Rate
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{telemetry?.overallPassRate || 0}%</div>
              <div className="mt-2 text-xs text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{telemetry?.passedCount || 0} Passed / {telemetry?.failedCount || 0} Failed</span>
              </div>
            </div>

            {/* Average Candidate Score */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Average Test Score
                </span>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{telemetry?.avgScore || 0}%</div>
              <div className="mt-2 text-xs text-slate-500 font-medium">
                Average across all practice attempts
              </div>
            </div>

            {/* Passed vs Failed Ratio */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Passed Candidates
                </span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{telemetry?.passedCount || 0}</div>
              <div className="mt-2 text-xs text-slate-500 font-medium">
                Met or exceeded passing threshold
              </div>
            </div>
          </div>

          {/* Top Missed Questions & Recent Attempts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Missed Questions */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Most Missed Past Questions
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Questions candidates fail most frequently across tests.
                </p>

                {telemetry?.topFailedQuestions?.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No failed questions recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {telemetry?.topFailedQuestions?.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="font-semibold text-slate-900 line-clamp-2">
                          #{idx + 1}. {item.questionText}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{item.courseTitle}</span>
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            {item.failCount} Missed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Candidate Test Attempt Logs */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h3 className="text-base font-bold text-slate-900 mb-1">Candidate Test Attempts Log</h3>
              <p className="text-xs text-slate-500 mb-4">Latest practice exam submissions</p>

              {telemetry?.recentAttempts?.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No candidate test attempts submitted yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="pb-3 px-2">Candidate</th>
                        <th className="pb-3 px-2">Course / Exam</th>
                        <th className="pb-3 px-2">Score</th>
                        <th className="pb-3 px-2">Mode</th>
                        <th className="pb-3 px-2 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {telemetry?.recentAttempts?.map((att: any) => (
                        <tr key={att._id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-2 font-bold text-slate-900">
                            <div>{att.userId?.fullName || "Candidate"}</div>
                            <div className="text-[11px] font-normal text-slate-500">{att.userId?.email || "—"}</div>
                          </td>
                          <td className="py-3 px-2 text-slate-700 font-semibold">
                            {att.courseId?.title || att.paperTitle || "Exam Bank"}
                          </td>
                          <td className="py-3 px-2 font-bold text-slate-900">
                            {att.score}% ({att.correctCount}/{att.totalQuestions})
                          </td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                              {att.mode || "Exam"}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            {att.passed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PASSED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                <XCircle className="w-3 h-3 text-rose-600" /> FAILED
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
