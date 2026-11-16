
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

const filters = [
  { id: "all", label: "All" },
  { id: "pending_review", label: "Pending" },
  { id: "rejected", label: "Rejected" },
  { id: "approved", label: "Approved" },
  { id: "draft", label: "Draft" },
];

const statusStyles = {
  pending_review: {
    label: "⏳ Pending review",
    className: "bg-amber-50 text-amber-800",
  },
  rejected: {
    label: "✕ Rejected",
    className: "bg-red-50 text-red-700",
  },
  approved: {
    label: "✓ Approved",
    className: "bg-green-50 text-green-700",
  },
  draft: {
    label: "📝 Draft",
    className: "bg-[#FFF0E5] text-[#9B6B4E]",
  },
};

function formatDate(value) {
  if (!value) return "Not submitted yet";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SubmissionCard({ submission }) {
  const status = statusStyles[submission.status] ?? statusStyles.draft;

  const publishedId =
    submission.status === "approved"
      ? submission.approved_listing_id ?? submission.listing_id
      : submission.kind === "edit"
        ? submission.listing_id
        : null;

  return (
    <article className="overflow-hidden rounded-[26px] border border-[#F1E0D3] bg-white p-4 shadow-[5px_8px_22px_#EEDDD1] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#FFF0E6] sm:h-36 sm:w-40">
          {submission.coverUrl ? (
            <img
              src={submission.coverUrl}
              alt={submission.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-5xl">📦</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold ${status.className}`}
            >
              {status.label}
            </span>

            <span className="rounded-full bg-[#FFF5EE] px-3 py-1.5 text-[11px] font-bold text-[#A1765C]">
              {submission.kind === "edit" ? "Edit request" : "New product"}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-black leading-snug text-[#342720]">
            {submission.title}
          </h3>

          <p className="mt-1 text-xl font-black text-[#E9783D]">
            ₹{Number(submission.price).toLocaleString("en-IN")}
          </p>

          <p className="mt-2 text-xs text-[#A18B7F]">
            {formatDate(submission.submitted_at || submission.created_at)}
          </p>

          {submission.status === "pending_review" && (
            <p className="mt-3 text-sm leading-6 text-[#8C7060]">
              {submission.kind === "edit"
                ? "Your updated details are waiting for approval. The existing product remains unchanged."
                : "Your product is awaiting approval and isn't publicly visible yet."}
            </p>
          )}

          {submission.status === "rejected" && (
            <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Why it was rejected
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-red-800">
                {submission.rejection_reason ||
                  "The reviewer didn't provide a reason."}
              </p>
              {submission.kind === "edit" && (
                <p className="mt-2 text-xs text-red-700">
                  Your previously approved product remains unchanged.
                </p>
              )}
            </div>
          )}

          {submission.status === "approved" && (
            <p className="mt-3 text-sm leading-6 text-green-700">
              {submission.kind === "edit"
                ? "Your approved changes have been applied to the product."
                : "Your product passed review and was published."}
            </p>
          )}

          {submission.status === "draft" && (
            <p className="mt-3 text-sm leading-6 text-[#8C7060]">
              This submission hasn't been sent for review yet. Editing saved
              submission drafts isn't available in this version.
            </p>
          )}

          {publishedId && (
            <Link
              to={`/product/${publishedId}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#F1D9C8] bg-[#FFF8F3] px-4 py-2.5 text-xs font-extrabold text-[#BD6B3D] no-underline transition hover:bg-[#FFF0E5]"
            >
              {submission.status === "approved"
                ? "View product ↗"
                : "View existing product ↗"}
            </Link>
          )}

          {submission.status === "rejected" &&
            submission.kind === "new" && (
              <Link
                to="/sell"
                className="mt-4 inline-flex rounded-xl bg-[#F4773D] px-4 py-2.5 text-xs font-extrabold text-white no-underline"
              >
                Submit a corrected listing
              </Link>
            )}
        </div>
      </div>
    </article>
  );
}

export default function SubmissionTracker({ userId, onCountChange }) {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubmissions = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("listing_submissions")
        .select(`
          id,
          listing_id,
          approved_listing_id,
          kind,
          status,
          title,
          price,
          category,
          created_at,
          submitted_at,
          reviewed_at,
          rejection_reason,
          photos:submission_images(storage_path, position)
        `)
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (queryError) throw queryError;

      const rows = await Promise.all(
        (data ?? []).map(async (submission) => {
          const firstPhoto = [...(submission.photos ?? [])].sort(
            (a, b) => a.position - b.position
          )[0];

          if (!firstPhoto) {
            return { ...submission, coverUrl: null };
          }

          const { data: imageData } = await supabase.storage
            .from("review-images")
            .createSignedUrl(firstPhoto.storage_path, 600);

          return {
            ...submission,
            coverUrl: imageData?.signedUrl ?? null,
          };
        })
      );

      setSubmissions(rows);
      onCountChange(
        rows.filter((item) => item.status !== "approved").length
      );
    } catch (err) {
      setError(err.message || "Couldn't load your submissions.");
    } finally {
      setLoading(false);
    }
  }, [userId, onCountChange]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const visibleSubmissions =
    filter === "all"
      ? submissions
      : submissions.filter((item) => item.status === filter);

  return (
    <div className="mt-7 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#342720]">
            Your listing submissions
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#957F72]">
            Track every submission, review decision, and requested change.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSubmissions}
          disabled={loading}
          className="rounded-xl border border-[#EFD6C5] bg-white px-4 py-2.5 text-xs font-extrabold text-[#AE704D] disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => {
          const count =
            item.id === "all"
              ? submissions.length
              : submissions.filter((entry) => entry.status === item.id).length;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                filter === item.id
                  ? "bg-[#F4773D] text-white"
                  : "border border-[#EFD6C5] bg-white text-[#906F5E]"
              }`}
            >
              {item.label} ({count})
            </button>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-[26px] bg-white px-6 py-16 text-center text-sm font-semibold text-[#957F72]">
          Loading your submissions...
        </div>
      ) : visibleSubmissions.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleSubmissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] bg-white px-6 py-14 text-center shadow-sm">
          <div className="text-5xl">📝</div>
          <h3 className="mt-4 text-xl font-black">
            {filter === "all"
              ? "No submissions yet"
              : "Nothing in this category"}
          </h3>
          <p className="mt-2 text-sm text-[#957F72]">
            {filter === "all"
              ? "Products you submit for review will appear here."
              : "Try another filter to see your other submissions."}
          </p>

          {filter === "all" && (
            <Link
              to="/sell"
              className="orange-button mt-5 inline-flex"
            >
              Submit a listing
            </Link>
          )}
        </div>
      )}
    </div>
  );
}