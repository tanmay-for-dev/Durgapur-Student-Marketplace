
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

export default function ReviewTab({ userId, isPlatformOwner, onCountChange }) {
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [currentListing, setCurrentListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [confirmApprove, setConfirmApprove] = useState(false);

  const selected = submissions.find((item) => item.id === selectedId);
  const canReview = Boolean(
    selected && (isPlatformOwner || selected.seller_id !== userId)
  );

  const expectedPhotos = selected?.photos?.length ?? 0;
  const photosReady =
    !photoLoading &&
    (expectedPhotos > 0
      ? photoUrls.length === expectedPhotos
      : selected?.kind === "edit");

  const approvalReady =
    photosReady && (selected?.kind !== "edit" || Boolean(currentListing));

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let query = supabase
        .from("listing_submissions")
        .select(`
          id, seller_id, listing_id, kind, status, title, description, price,
          category, condition, contact_email, whatsapp_number, call_number,
          meetup_policy, travel_note, meetup_area_ids, submitted_at,
          seller:profiles!listing_submissions_seller_id_fkey(username, display_name),
          locality:localities!listing_submissions_locality_id_fkey(name),
          photos:submission_images(storage_path, position)
        `)
        .eq("status", "pending_review")
        .order("submitted_at", { ascending: true })
        .limit(50);

      if (!isPlatformOwner) {
        query = query.neq("seller_id", userId);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      const rows = await Promise.all(
        (data ?? []).map(async (item) => {
          const first = [...(item.photos ?? [])].sort(
            (a, b) => a.position - b.position
          )[0];

          if (!first) {
            return { ...item, coverUrl: null };
          }

          const { data: signed } = await supabase.storage
            .from("review-images")
            .createSignedUrl(first.storage_path, 600);

          return {
            ...item,
            coverUrl: signed?.signedUrl ?? null,
          };
        })
      );

      setSubmissions(rows);
      onCountChange(rows.length);
    } catch (err) {
      setError(err.message || "Couldn't load pending reviews.");
    } finally {
      setLoading(false);
    }
  }, [userId, isPlatformOwner, onCountChange]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setPhotoUrls([]);
    setCurrentListing(null);
    setReason("");
    setConfirmApprove(false);

    if (!selected) return;

    let active = true;
    setPhotoLoading(true);

    async function loadDetails() {
      const photos = [...(selected.photos ?? [])].sort(
        (a, b) => a.position - b.position
      );

      const [signedPhotos, live] = await Promise.all([
        Promise.all(
          photos.map(async (photo) => {
            const { data } = await supabase.storage
              .from("review-images")
              .createSignedUrl(photo.storage_path, 600);

            return data?.signedUrl ?? null;
          })
        ),
        selected.kind === "edit" && selected.listing_id
          ? supabase
              .from("listings")
              .select("id, title, description, price, condition, category")
              .eq("id", selected.listing_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (active) {
        setPhotoUrls(signedPhotos.filter(Boolean));
        setCurrentListing(live.data ?? null);
        setPhotoLoading(false);
      }
    }

    loadDetails().catch((err) => {
      if (active) {
        setError(err.message || "Couldn't load submission details.");
        setPhotoLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [selectedId]);

  async function approve() {
    if (!selected || !canReview || working || !approvalReady) return;

    setWorking(true);
    setError("");
    setNotice("");

    try {
      const { data, error: actionError } = await supabase.functions.invoke(
        "approve-listing",
        {
          body: { submissionId: selected.id },
        }
      );

      if (actionError) {
        let message = actionError.message;

        try {
          const details = await actionError.context?.json();
          if (details?.error) message = details.error;
        } catch {}

        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Approval wasn't confirmed.");
      }

      setSelectedId(null);
      setNotice("Listing approved. The approved version is now public.");
      await loadQueue();
    } catch (err) {
      setError(err.message || "Couldn't approve this listing.");
    } finally {
      setWorking(false);
      setConfirmApprove(false);
    }
  }

  async function reject() {
    if (!selected || !canReview || working) return;

    if (reason.trim().length < 10 || reason.trim().length > 500) {
      setError("Write a rejection reason between 10 and 500 characters.");
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      const { error: actionError } = await supabase.rpc(
        "reject_listing_submission",
        {
          p_submission_id: selected.id,
          p_reason: reason.trim(),
        }
      );

      if (actionError) throw actionError;

      setSelectedId(null);
      setNotice("Submission rejected. The seller can see your reason.");
      await loadQueue();
    } catch (err) {
      setError(err.message || "Couldn't reject this submission.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-7 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#342720]">
            Review submissions
          </h2>
          <p className="mt-1 text-sm text-[#957F72]">
            Only approved products appear in the marketplace.
          </p>
        </div>

        <button
          type="button"
          onClick={loadQueue}
          disabled={loading || working}
          className="rounded-xl border border-[#F0DDCF] bg-white px-4 py-2 text-sm font-extrabold text-[#B66B42] disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-semibold text-green-800"
        >
          {notice}
        </p>
      )}

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
          Loading review queue...
        </div>
      ) : !submissions.length ? (
        <div className="rounded-[26px] bg-white px-6 py-16 text-center shadow-sm">
          <div className="text-5xl">✨</div>
          <h3 className="mt-4 text-xl font-black">All caught up!</h3>
          <p className="mt-2 text-sm text-[#957F72]">
            There aren't any submissions waiting for your review.
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
          <div className="space-y-3">
            {submissions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setError("");
                  setNotice("");
                }}
                className={`flex w-full gap-3 rounded-[22px] border p-3 text-left transition ${
                  selectedId === item.id
                    ? "border-[#F4773D] bg-[#FFF1E5]"
                    : "border-[#F0DDCF] bg-white hover:border-[#F9B68D]"
                }`}
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FFF0E6]">
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">📦</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-black text-[#342720]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-base font-black text-[#E9783D]">
                    {money(item.price)}
                  </p>
                  <p className="mt-1 text-xs text-[#947865]">
                    {item.kind === "edit" ? "Edited listing" : "New listing"}
                    {" · "}@{item.seller?.username ?? "seller"}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="rounded-[28px] border border-[#F2DECE] bg-white p-5 shadow-[5px_8px_22px_#EEDDD1] sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-[#FFF0E5] px-3 py-1.5 text-xs font-black text-[#B66B42]">
                  {selected.kind === "edit" ? "EDIT REQUEST" : "NEW LISTING"}
                </span>
                <p className="text-xs text-[#957F72]">
                  Submitted{" "}
                  {selected.submitted_at
                    ? new Date(selected.submitted_at).toLocaleString("en-IN")
                    : "recently"}
                </p>
              </div>

              <h3 className="mt-4 text-2xl font-black text-[#342720]">
                {selected.title}
              </h3>

              <p className="mt-1 text-2xl font-black text-[#E9783D]">
                {money(selected.price)}
              </p>

              <p className="mt-2 text-sm text-[#886956]">
                By @{selected.seller?.username ?? "seller"}{" · "}
                {selected.locality?.name ?? "Durgapur"}
              </p>

              {photoLoading ? (
                <div className="mt-5 rounded-2xl bg-[#FFF8F3] p-8 text-center text-sm text-[#957F72]">
                  Loading private photos...
                </div>
              ) : photoUrls.length ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photoUrls.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block aspect-square overflow-hidden rounded-2xl bg-[#FFF0E6]"
                    >
                      <img
                        src={url}
                        alt={`Submitted product photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-2xl bg-[#FFF8F3] p-4 text-sm text-[#957F72]">
                  {selected.kind === "edit" && expectedPhotos === 0
                    ? "This edit keeps the existing approved photos."
                    : "Some review photos couldn't load. Refresh before approving."}
                </p>
              )}

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl bg-[#FFF8F3] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#AA8B78]">
                    Item details
                  </p>
                  <p className="mt-2 font-semibold">
                    {selected.category} · {selected.condition}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-[#765C4E]">
                    {selected.description || "No description added."}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFF8F3] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#AA8B78]">
                    Meetup & contact
                  </p>
                  <p className="mt-2 text-[#765C4E]">
                    {selected.meetup_policy === "pickup_only"
                      ? "Pickup in seller's area"
                      : "Can meet nearby"}
                  </p>
                  {selected.travel_note && (
                    <p className="mt-1 text-[#765C4E]">
                      {selected.travel_note}
                    </p>
                  )}
                  {selected.whatsapp_number && (
                    <p className="mt-2 break-all">
                      WhatsApp: +{selected.whatsapp_number}
                    </p>
                  )}
                  {selected.call_number && (
                    <p className="mt-1 break-all">
                      Phone: {selected.call_number}
                    </p>
                  )}
                  {selected.contact_email && (
                    <p className="mt-1 break-all">
                      Email: {selected.contact_email}
                    </p>
                  )}
                </div>
              </div>

              {selected.kind === "edit" && (
                <div className="mt-4 rounded-2xl border border-[#F3DECE] bg-[#FFFAF6] p-4">
                  <h4 className="font-black text-[#78523D]">
                    Currently published version
                  </h4>

                  {currentListing ? (
                    <div className="mt-2 space-y-1 text-sm text-[#80695B]">
                      <p>
                        {currentListing.title} · {money(currentListing.price)}
                      </p>
                      <p>
                        {currentListing.category} · {currentListing.condition}
                      </p>
                      <p className="whitespace-pre-wrap">
                        {currentListing.description}
                      </p>
                      <a
                        href={`/product/${currentListing.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block font-extrabold text-[#C66B3A]"
                      >
                        View live listing
                      </a>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#B06942]">
                      Unable to load the existing version. Don't approve until
                      it is verified.
                    </p>
                  )}
                </div>
              )}

              {canReview ? (
                <div className="mt-6 border-t border-[#F1E3D8] pt-5">
                  {confirmApprove ? (
                    <div className="rounded-2xl border border-[#EFD4C2] bg-[#FFF7F0] p-4">
                      <p className="text-sm font-black">
                        Approve this submission?
                      </p>
                      <p className="mt-1 text-xs text-[#8F7565]">
                        The approved item or edits will become public.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={working || !approvalReady}
                          onClick={approve}
                          className="orange-button px-5 py-2.5 text-sm font-bold disabled:opacity-50"
                        >
                          {working ? "Approving..." : "Confirm approval"}
                        </button>
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => setConfirmApprove(false)}
                          className="rounded-xl border border-[#EFD4C2] bg-white px-4 py-2.5 text-sm font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmApprove(true);
                        setError("");
                      }}
                      disabled={working || !approvalReady}
                      className="orange-button w-full py-3 text-sm font-extrabold disabled:opacity-50"
                    >
                      ✓ Approve listing
                    </button>
                  )}

                  <label
                    htmlFor="review-reason"
                    className="mt-5 block text-sm font-black text-[#78523D]"
                  >
                    Rejection reason
                  </label>
                  <textarea
                    id="review-reason"
                    rows={3}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain what the seller should correct (at least 10 characters)."
                    className="mt-2 w-full resize-y rounded-2xl border border-[#F0DDCF] bg-[#FFFBF8] p-4 text-sm outline-none focus:border-[#F4773D]"
                  />
                  <button
                    type="button"
                    onClick={reject}
                    disabled={working || reason.trim().length < 10}
                    className="mt-2 w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-700 disabled:opacity-50"
                  >
                    {working ? "Processing..." : "Reject submission"}
                  </button>
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-[#FFF7EF] p-4 text-sm font-semibold text-[#936F54]">
                  Moderators cannot review their own submissions. Another
                  moderator or the platform owner must review this.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-[28px] border border-[#F2DECE] bg-white p-10 text-center text-sm text-[#957F72]">
              Select a submission to view the photos and review its details.
            </div>  
          )}
        </div>
      )}
    </div>
  );
}
