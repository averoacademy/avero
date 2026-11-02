"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  History,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  UserCheck,
  Brain,
  Bookmark,
  Calendar,
  Zap,
  Sparkles,
  Award,
} from "lucide-react";
import PaywallModal from "@/components/PaywallModal";

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [studentUser, setStudentUser] = useState<{
    fullName: string;
    email: string;
    studentType?: string;
    university?: string;
    isPro?: boolean;
    avatar?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login?reason=session_expired");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.success && data.user) {
          setStudentUser(data.user);
        } else if (data && !data.success) {
          router.push("/login?reason=session_expired");
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const navItems = [
    { label: "Dashboard Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Courses & Test Banks", href: "/dashboard/courses", icon: BookOpen },
    { label: "Council Mock Simulator", href: "/dashboard/mock-exam", icon: Award, isProOnly: true },
    { label: "Practical Questions", href: "/dashboard/practicals", icon: GraduationCap, isProOnly: true },
    { label: "Active Flashcards (SM-2)", href: "/dashboard/flashcards", icon: Brain },
    { label: "Saved Questions", href: "/dashboard/bookmarks", icon: Bookmark },
    { label: "Study Schedule Planner", href: "/dashboard/schedule", icon: Calendar },
    { label: "Exam Attempts & History", href: "/dashboard/attempts", icon: History },
    { label: "Study Analytics", href: "/dashboard/analytics", icon: BarChart2 },
    { label: "Profile & Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f5f8ff] text-slate-800 flex flex-col md:flex-row h-screen overflow-hidden font-sans selection:bg-[#2866e1]/20 selection:text-[#2866e1]">
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80 shadow-xs shrink-0 z-50">
        <div className="flex items-center gap-2">
          <Image
            src="/images/favicon.png"
            alt="Avero Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            priority
          />
          <span className="font-bold text-slate-900 text-base tracking-tight">AVERO STUDENT</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0 transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Section */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <Image
              src="/images/favicon.png"
              alt="Avero Logo"
              width={40}
              height={40}
              className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
              priority
            />
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight group-hover:text-[#2866e1] transition-colors">
                AVERO ACADEMY
              </h2>
              <p className="text-[11px] text-[#2866e1] font-semibold flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> Student Hub
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Student Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#2866e1]/10 text-[#2866e1] border border-[#2866e1]/20 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#2866e1]" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.isProOnly && (
                    <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[8px] font-black uppercase tracking-wider">
                      PRO
                    </span>
                  )}
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#2866e1]" />}
              </Link>
            );
          })}
        </nav>

        {/* Student Profile Footer & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="mb-3 px-2 flex items-center gap-2.5">
            {studentUser?.avatar ? (
              <img
                src={studentUser.avatar}
                alt={studentUser.fullName}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <span className="truncate">{studentUser?.fullName || "Student Account"}</span>
                {studentUser?.isPro && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-extrabold uppercase tracking-wide shadow-xs shrink-0">
                    <Zap className="w-2.5 h-2.5 fill-white" /> PRO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {studentUser?.studentType || "Healthcare Candidate"}
              </p>
            </div>
          </div>

          {!studentUser?.isPro && (
            <button
              onClick={() => setShowPaywallModal(true)}
              className="w-full mb-2.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Upgrade to Pro</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto flex flex-col">
        {/* Sticky Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Student Hub</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 capitalize">
              {pathname === "/dashboard"
                ? "Overview"
                : pathname.replace("/dashboard/", "").replace("-", " ")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {studentUser?.avatar && (
              <img
                src={studentUser.avatar}
                alt={studentUser.fullName}
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
              />
            )}
            {studentUser?.university && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2866e1]/10 border border-[#2866e1]/20 rounded-full text-xs text-[#2866e1] font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{studentUser.university}</span>
              </div>
            )}
            {!studentUser?.isPro && (
              <button
                onClick={() => setShowPaywallModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow-md transition cursor-pointer shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Upgrade to Pro</span>
              </button>
            )}
            <Link
              href="/dashboard/courses"
              className="flex items-center gap-2 px-4 py-2 bg-[#2866e1] hover:bg-[#1d52bf] text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Start Practice Session
            </Link>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>

      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        title="Upgrade to Avero Pro"
        description="Get full access to all past question banks, procedure flashcards, study planners, and practical exam rationales."
      />
    </div>
  );
}
