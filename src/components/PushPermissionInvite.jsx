import { useEffect, useState } from "react";
import { enablePushForCurrentUser } from "../services/pushNotifications.js";
import { rememberPushInviteDecision, shouldOfferPushInvite } from "../services/pushOnboarding.js";

/**
 * One consent invitation shared by Home and Sell.
 * The system permission dialog is triggered ONLY by clicking Enable.
 */
export default function PushPermissionInvite({ user, occasion }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setVisible(shouldOfferPushInvite(user, occasion));
    setError("");
    setBusy(false);
  }, [user?.id, occasion]);

  function notNow() {
    rememberPushInviteDecision(user, "not_now");
    setVisible(false);
  }

  async function enable() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      // Call directly from this click so Notification.requestPermission() keeps
      // the browser's user-gesture context (important on mobile Safari).
      const result = await enablePushForCurrentUser();
      if (result.enabled) {
        rememberPushInviteDecision(user, "enabled");
        setVisible(false);
      } else {
        // The user dismissed or blocked the system prompt; don't keep asking.
        notNow();
      }
    } catch (err) {
      setError(err?.message || "Couldn't enable notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;
  const afterSubmission = occasion === "after_submission";

  return (
    <section
      role="region"
      aria-label="DGP Finds notification invitation"
      className={afterSubmission
        ? "mt-6 rounded-[22px] border border-[#E9D6C0] bg-[#FFF8ED] p-4 text-left sm:p-5"
        : "fixed bottom-5 left-4 right-4 z-40 mx-auto max-w-[400px] rounded-[25px] border border-[#E9D6C0] bg-[#FFF9F2] p-5 text-left shadow-[0_14px_46px_#30392D30] sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0"}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#FFE4D0] text-2xl" aria-hidden="true">🔔</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-[#30392D]">Stay in the loop.</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#847668] sm:text-sm">
            Get important updates when your listing is approved or needs attention — even when DGP Finds isn't open.
          </p>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-xs font-bold text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={enable}
          className="rounded-full bg-[#F5794D] px-4 py-2.5 text-xs font-black text-white shadow-[2px_3px_0_#30392D] disabled:opacity-60 sm:text-sm"
        >
          {busy ? "Enabling..." : "Enable notifications"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={notNow}
          className="rounded-full border border-[#E6D7C9] bg-white px-4 py-2.5 text-xs font-black text-[#736B61] disabled:opacity-60 sm:text-sm"
        >
          Not now
        </button>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-[#A18F80]">Optional. Only important listing updates — no promotional alerts.</p>
    </section>
  );
}
