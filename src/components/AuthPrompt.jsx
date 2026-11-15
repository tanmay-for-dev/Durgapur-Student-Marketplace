
import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function AuthPrompt({
  open,
  onClose,
  action = "sell",
  returnTo = "/",
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isFavorite = action === "favorite";

  const title = isFavorite
    ? "Found something you love?"
    : "Ready to sell something?";

  const description = isFavorite
    ? "Create a free account to save your favorite finds and revisit them anytime."
    : "Join DGP Finds to list your items and connect with buyers across Durgapur.";

  const signupUrl =
    `/auth?mode=signup&next=${encodeURIComponent(returnTo)}`;

  const loginUrl =
    `/auth?mode=login&next=${encodeURIComponent(returnTo)}`;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#342720]/45 px-4 backdrop-blur-[5px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        aria-describedby="auth-prompt-description"
        className="relative w-full max-w-md rounded-[32px] border-2 border-white bg-[#FFF9F5] px-7 pb-8 pt-10 text-center shadow-[15px_25px_65px_#34272040,inset_3px_3px_10px_#FFFFFF]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white text-xl text-[#A58C7A] shadow-sm hover:text-[#F4773D]"
        >
          ×
        </button>

        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[27px] bg-gradient-to-br from-[#FFEAD9] to-[#FFCAA8] text-4xl shadow-[6px_9px_18px_#E8C5AD,inset_4px_4px_9px_#FFF4E9]">
          {isFavorite ? "⭐" : "📦"}
        </div>

        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-[#E57B47]">
          The neighborhood is better together
        </p>

        <h2
          id="auth-prompt-title"
          className="mt-3 text-2xl font-black tracking-tight text-[#342720]"
        >
          {title}
        </h2>

        <p
          id="auth-prompt-description"
          className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#927B6E]"
        >
          {description}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to={signupUrl}
            className="rounded-2xl bg-gradient-to-br from-[#FF985E] to-[#F4773D] px-5 py-4 text-sm font-extrabold text-white no-underline shadow-[5px_8px_16px_#EDC2A6,inset_2px_2px_6px_#FFB58C] transition hover:-translate-y-0.5"
          >
            Create free account →
          </Link>

          <Link
            to={loginUrl}
            className="rounded-2xl border border-white bg-white px-5 py-4 text-sm font-extrabold text-[#89654F] no-underline shadow-[5px_6px_14px_#EEDCCF,inset_2px_2px_6px_#FFFFFF] transition hover:-translate-y-0.5"
          >
            I already have an account
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="mt-2 py-2 text-xs font-bold text-[#A88B7B] hover:text-[#F4773D]"
          >
            Maybe later, keep exploring
          </button>
        </div>
      </div>
    </div>
  );
}
