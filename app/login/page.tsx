"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import gsap from "gsap";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSessionExpired = searchParams.get("reason") === "session_expired";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (logoRef.current) {
      tl.fromTo(logoRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 });
    }
    if (cardRef.current) {
      tl.fromTo(cardRef.current, { y: 30, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.7 }, "-=0.3");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const t0 = performance.now();
    console.log("🚀 [WEB LOGIN] Submitting login...");
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log(`⏱️ [WEB LOGIN] Response received in ${(performance.now() - t0).toFixed(1)}ms`);
      if (data.success && data.user) {
        if (!data.user.isOnboarded) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      } else {
        setErrorMsg(data.error || "Login failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f0fe] via-white to-[#d2e3fc] bg-dot-pattern flex flex-col justify-center items-center px-4 py-8 sm:py-12 selection:bg-[#2866e1]/20 selection:text-[#0f172a] relative overflow-hidden">
      {/* Decorative background glow blurs */}
      <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] bg-[#2866e1]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 right-1/4 w-[500px] h-[500px] bg-[#2866e1]/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Logo */}
      <div ref={logoRef} className="mb-6 sm:mb-8">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <Image
            src="/images/logo.png"
            alt="Avero logo"
            width={440}
            height={140}
            className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-md"
            priority
          />
        </Link>
      </div>

      {/* Main Login Card */}
      <div ref={cardRef} className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-[family-name:var(--font-montserrat)] font-bold text-xl sm:text-3xl text-[#0f172a] mb-1.5 sm:mb-2">
            Welcome back
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Log in to continue your active study sessions
          </p>
        </div>

        {isSessionExpired && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              You were logged out because your account was logged in on another device.
            </span>
          </div>
        )}

        {/* Social Auth Button */}
        <button
          type="button"
          className="w-full py-2.5 sm:py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium text-slate-700 text-xs sm:text-sm flex items-center justify-center gap-3 transition-colors shadow-sm mb-5 sm:mb-6"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-5 sm:mb-6">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 sm:mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2866e1]/40 focus:border-[#2866e1] transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] sm:text-xs font-semibold text-[#2866e1] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2866e1]/40 focus:border-[#2866e1] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-slate-300 text-[#2866e1] focus:ring-[#2866e1]"
              />
              <span className="text-[11px] sm:text-xs">Remember me for 30 days</span>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-[#2866e1] hover:bg-[#1d52bf] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#2866e1]/25 group mt-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <span>Log in</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-100">
          <p className="text-slate-600 text-xs sm:text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[#2866e1] hover:underline"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2866e1]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
