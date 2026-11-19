
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import BrandLogo from "../components/BrandLogo.jsx";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const requestedPath = params.get("next") || "/";
  const next =
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//") &&
    !requestedPath.includes("\\")
      ? requestedPath
      : "/";

  const [mode, setMode] = useState(
    params.get("mode") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        navigate(next, { replace: true });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          navigate(next, { replace: true });
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate, next]);

  function changeMode(value) {
    setMode(value);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isSignup) {
        const redirectUrl = new URL(
          "/auth",
          "https://dgpfinds.vercel.app"
        );
        redirectUrl.searchParams.set("next", next);

        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl.toString(),
          },
        });

        if (authError) throw authError;

        if (data.session) {
          navigate(next, { replace: true });
          return;
        }

        setMessage(
          "Check your inbox for a confirmation email. Once verified, you can continue into DGP Finds."
        );
      } else {
        const { error: authError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (authError) throw authError;

        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF8F3] px-4 py-8 text-[#342720] sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white bg-white shadow-[14px_20px_55px_#e9d5c7,-8px_-8px_30px_#ffffff] md:min-h-[650px] md:grid-cols-[0.95fr_1.05fr]">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#FFE4D2] via-[#FFD4B5] to-[#FFA977] p-10 md:flex md:flex-col md:justify-between">
          <div className="relative z-10 self-start">
            <BrandLogo />
          </div>

          <div className="pointer-events-none absolute left-1/2 top-[42%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFEAD8] shadow-[inset_14px_15px_30px_#ffffff,15px_20px_35px_#E8A77F]"></div>

          <div className="pointer-events-none absolute left-1/2 top-[42%] grid h-52 w-52 -translate-x-1/2 -translate-y-1/2 -rotate-6 place-items-center rounded-[48px] border-4 border-white/80 bg-gradient-to-br from-[#FFF8F2] to-[#FFDFCA] text-8xl shadow-[15px_18px_32px_#DFA17E,inset_5px_5px_12px_#ffffff]">
            📦
          </div>

          <div className="relative z-10">
            <span className="rounded-full bg-white/60 px-4 py-2 text-xs font-extrabold tracking-widest text-[#AF633D]">
              MADE FOR DURGAPUR
            </span>

            <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight text-[#573A2C]">
              Good things deserve a second story.
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-7 text-[#815B47]">
              Join a neighborhood where everyday finds connect people,
              save money, and find new homes.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <Link
            to="/"
            className="mb-9 inline-flex items-center gap-2 self-start text-sm font-bold text-[#A07E6C] no-underline hover:text-[#F4773D]"
          >
            <span>←</span> Back to exploring
          </Link>

          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F4773D]">
              Your neighborhood, your marketplace
            </span>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {isSignup ? "Join DGP Finds." : "Welcome back."}
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#947B6D]">
              {isSignup
                ? "Create an account to save your finds and start selling."
                : "Sign in to pick up right where you left off."}
            </p>
          </div>

          <div className="mt-8 flex rounded-2xl bg-[#FFF1E7] p-1.5 shadow-[inset_3px_3px_8px_#F2D9C8]">
            {[
              { id: "login", label: "Log in" },
              { id: "signup", label: "Sign up" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => changeMode(option.id)}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-extrabold transition ${
                  mode === option.id
                    ? "bg-white text-[#DB6C35] shadow-[3px_4px_10px_#E6CBBB]"
                    : "text-[#987967] hover:text-[#D77542]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="auth-email"
                className="mb-2 block text-sm font-bold text-[#604A3E]"
              >
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-[#F1DCCE] bg-[#FFFBF8] px-4 py-4 text-sm text-[#342720] outline-none transition focus:border-[#F4773D] focus:ring-2 focus:ring-[#F4773D]/15"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="mb-2 block text-sm font-bold text-[#604A3E]"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isSignup ? "new-password" : "current-password"
                  }
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isSignup ? "Create a password" : "Enter your password"
                  }
                  className="w-full rounded-2xl border border-[#F1DCCE] bg-[#FFFBF8] px-4 py-4 pr-20 text-sm text-[#342720] outline-none transition focus:border-[#F4773D] focus:ring-2 focus:ring-[#F4773D]/15"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#C07851]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="rounded-xl bg-[#FFF1E5] px-4 py-3 text-sm text-[#93613E]">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-br from-[#FF965D] to-[#F4773D] px-5 py-4 text-sm font-extrabold text-white shadow-[5px_7px_15px_#F2C3A6,inset_2px_2px_5px_#FFB48A] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : isSignup
                ? "Create my account →"
                : "Log in →"}
            </button>
          </form>

          <p className="mt-7 text-center text-xs leading-6 text-[#A18A7C]">
            Just browsing? No account needed.
            <Link to="/" className="ml-1 font-extrabold text-[#E5763E]">
              Explore freely
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
