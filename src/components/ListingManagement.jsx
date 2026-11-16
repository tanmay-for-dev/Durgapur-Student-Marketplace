
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { getLocalities } from "../services/createListing.js";

const fieldStyle = "w-full rounded-xl border border-[#EFD6C5] bg-white px-3 py-3 text-sm text-[#46342A] outline-none focus:border-[#F4773D]";
const labelStyle = "mb-1.5 block text-sm font-bold text-[#654938]";
const categories = ["Books", "Electronics", "Furniture", "Cycles", "Others"];
const conditions = ["Like new", "Good", "Used"];
const formats = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const contacts = [
  { field: "whatsapp", label: "💬 WhatsApp", placeholder: "919876543210", type: "tel" },
  { field: "phone", label: "📞 Phone", placeholder: "+919876543210", type: "tel" },
  { field: "contactEmail", label: "✉️ Email", placeholder: "you@example.com", type: "email" },
];

async function checkFunctionResult(result) {
  if (result.error) {
    let message = result.error.message;
    try {
      const body = await result.error.context?.json();
      message = body?.error || message;
    } catch {}
    throw new Error(message);
  }
  if (!result.data?.success) {
    throw new Error(result.data?.error || "The server couldn't confirm this action.");
  }
  return result.data;
}

async function submitEdit({ listingId, form, meetupAreaIds, photos, replacePhotos }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Sign in again to edit this listing.");

  if (form.title.trim().length < 4 || form.title.trim().length > 120) {
    throw new Error("The title must be 4–120 characters after removing extra spaces.");
  }
  if (!form.whatsapp.trim() && !form.phone.trim() && !form.contactEmail.trim()) {
    throw new Error("Provide at least one contact method.");
  }
  if (form.whatsapp.trim() && !/^[1-9][0-9]{7,14}$/.test(form.whatsapp.trim())) {
    throw new Error("WhatsApp needs 8–15 digits including country code, without +.");
  }
  if (form.phone.trim() && !/^\+[1-9][0-9]{7,14}$/.test(form.phone.trim())) {
    throw new Error("Phone needs + followed by 8–15 digits including country code.");
  }
  if (form.contactEmail.trim().length > 254 || (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()))) {
    throw new Error("Enter a valid contact email.");
  }
  if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0 || Number(form.price) > 9999999999.99) {
    throw new Error("Enter a valid price.");
  }
  if (form.meetupPolicy === "selected_areas" && !meetupAreaIds.length) {
    throw new Error("Choose at least one meetup area.");
  }
  if (replacePhotos && (photos.length < 1 || photos.length > 8)) {
    throw new Error("Choose 1–8 replacement photos.");
  }
  if (photos.some((photo) => !formats[photo.type] || photo.size > 5 * 1024 * 1024)) {
    throw new Error("Photos must be JPG, PNG or WebP, no larger than 5 MB each.");
  }

  const userId = authData.user.id;
  const uploadedPaths = [];
  let submissionId = null;

  try {
    const { data: submission, error: createError } = await supabase
      .from("listing_submissions")
      .insert({
        seller_id: userId,
        listing_id: listingId,
        kind: "edit",
        status: "draft",
        keep_existing_images: !replacePhotos,
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        condition: form.condition,
        locality_id: Number(form.localityId),
        meetup_policy: form.meetupPolicy,
        travel_note: form.travelNote.trim() || null,
        meetup_area_ids: form.meetupPolicy === "selected_areas" ? meetupAreaIds.map(Number) : [],
        whatsapp_number: form.whatsapp.trim() || null,
        call_number: form.phone.trim() || null,
        contact_email: form.contactEmail.trim() || null,
      })
      .select("id")
      .single();

    if (createError) throw createError;
    submissionId = submission.id;

    if (replacePhotos) {
      for (const photo of photos) {
        const path = `${userId}/${submissionId}/${crypto.randomUUID()}.${formats[photo.type]}`;
        const { error: uploadError } = await supabase.storage
          .from("review-images")
          .upload(path, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
      }

      const { error: photosError } = await supabase
        .from("submission_images")
        .insert(uploadedPaths.map((storage_path, position) => ({
          submission_id: submissionId,
          storage_path,
          position,
        })));
      if (photosError) throw photosError;
    }

    const { error: submitError } = await supabase.rpc("submit_listing_for_review", {
      p_submission_id: submissionId,
    });
    if (submitError) throw submitError;
    return submissionId;
  } catch (error) {
    if (submissionId) {
      const { data: saved } = await supabase
        .from("listing_submissions")
        .select("status")
        .eq("id", submissionId)
        .maybeSingle();
      if (saved?.status === "pending_review") return submissionId;
      if (saved?.status === "draft") {
        if (uploadedPaths.length) {
          await supabase.storage.from("review-images").remove(uploadedPaths);
        }
        await supabase.from("listing_submissions")
          .delete().eq("id", submissionId).eq("status", "draft");
      }
    }
    throw error;
  }
}

export function EmailContact({ listingId, productName, showFallback = false }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEmail("");
    supabase.from("listings")
      .select("contact_email")
      .eq("id", listingId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active && !error) setEmail(data?.contact_email ?? "");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [listingId]);

  if (email) {
    return (
      <a
        href={`mailto:${email}?subject=${encodeURIComponent(`DGP Finds: ${productName}`)}`}
        className="contact-action"
      >
        <span className="text-xl">✉️</span>
        <div>
          <p className="font-extrabold">Email seller</p>
          <p className="text-xs text-[#6F655F]">Send an email</p>
        </div>
      </a>
    );
  }

  if (!loading && showFallback) {
    return <p className="text-sm text-[#7D675B]">Contact details are unavailable for this listing.</p>;
  }
  return null;
}

export default function ListingManagement({ listingId, status, onSold }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSeller, setIsSeller] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [form, setForm] = useState(null);
  const [localities, setLocalities] = useState([]);
  const [meetupAreaIds, setMeetupAreaIds] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(["whatsapp", "phone", "contactEmail"]);
  const [replacePhotos, setReplacePhotos] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [pendingEdit, setPendingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setIsSeller(false);
      return;
    }
    supabase.from("listings")
      .select("seller_id")
      .eq("id", listingId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) setIsSeller(!error && data?.seller_id === user.id);
      });
    return () => { active = false; };
  }, [listingId, user?.id]);

  useEffect(() => {
    let active = true;
    if (!isSeller) return;
    supabase.from("listing_submissions")
      .select("id")
      .eq("listing_id", listingId)
      .eq("kind", "edit")
      .eq("status", "pending_review")
      .limit(1)
      .then(({ data }) => {
        if (active) setPendingEdit(Boolean(data?.length));
      });
    return () => { active = false; };
  }, [listingId, isSeller]);

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  async function openEditor() {
    if (pendingEdit || busy) return;
    setLoadingEdit(true);
    setError("");
    setNotice("");

    try {
      const [listingResult, areasResult, localitiesResult] = await Promise.all([
        supabase.from("listings").select("seller_id,title,description,price,category,condition,locality_id,meetup_policy,travel_note,whatsapp_number,call_number,contact_email")
          .eq("id", listingId).single(),
        supabase.from("listing_meetup_areas").select("locality_id").eq("listing_id", listingId),
        getLocalities(),
      ]);
      if (listingResult.error) throw listingResult.error;
      if (areasResult.error) throw areasResult.error;

      const row = listingResult.data;
      setForm({
        title: row.title,
        description: row.description ?? "",
        price: String(row.price),
        category: row.category,
        condition: row.condition,
        localityId: String(row.locality_id),
        meetupPolicy: row.meetup_policy,
        travelNote: row.travel_note ?? "",
        whatsapp: row.whatsapp_number ?? "",
        phone: row.call_number ?? "",
        contactEmail: row.contact_email ?? "",
      });
      setMeetupAreaIds((areasResult.data ?? []).map((area) => area.locality_id));
      setLocalities(localitiesResult);
      setSelectedContacts(["whatsapp", "phone", "contactEmail"]);
      setReplacePhotos(false);
      setPhotos([]);
      setEditing(true);
    } catch (err) {
      setError(err.message || "Couldn't load the edit form.");
    } finally {
      setLoadingEdit(false);
    }
  }

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleContact(field) {
    if (selectedContacts.includes(field) && selectedContacts.length === 1) return;
    setSelectedContacts((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field]
    );
    if (selectedContacts.includes(field)) update(field, "");
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!form || busy) return;
    setBusy("edit");
    setError("");
    setNotice("");
    try {
      await submitEdit({ listingId, form, meetupAreaIds, photos, replacePhotos });
      setPendingEdit(true);
      setEditing(false);
      setNotice("Your changes are waiting for approval. The current listing remains public.");
    } catch (err) {
      setError(err.message || "Couldn't submit changes.");
    } finally {
      setBusy("");
    }
  }

  async function markSold() {
    if (busy || status === "sold") return;
    setBusy("sold");
    setError("");
    setNotice("");
    try {
      const { error: actionError } = await supabase.rpc("mark_own_listing_sold", {
        p_listing_id: listingId,
      });
      if (actionError) throw actionError;
      onSold();
      setNotice("Marked as sold! Your item now appears in the Sold tab.");
    } catch (err) {
      setError(err.message || "Couldn't mark listing as sold.");
    } finally {
      setBusy("");
    }
  }

  async function deleteListing() {
    if (busy || !confirmDelete) return;
    setBusy("delete");
    setError("");
    try {
      const result = await supabase.functions.invoke("delete-listing", {
        body: { listingId },
      });
      const body = await checkFunctionResult(result);
      if (body.warning) console.warn(body.warning);
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't delete listing.");
      setBusy("");
    }
  }

  if (!isSeller) return null;

  return (
    <section className="mt-6 rounded-[26px] border border-[#EFD4BF] bg-[#FFF8F1] p-5">
      <p className="text-xs font-black uppercase tracking-widest text-[#BD754A]">Seller studio</p>
      <h2 className="mt-1 text-xl font-black">Manage this listing</h2>
      <p className="mt-1 text-xs leading-5 text-[#987766]">Only you can see these controls.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={openEditor} disabled={Boolean(busy) || loadingEdit || pendingEdit}
          className="rounded-xl bg-[#F4773D] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">
          {loadingEdit ? "Loading..." : "✎ Edit listing"}
        </button>
        <button type="button" onClick={markSold} disabled={Boolean(busy) || status === "sold"}
          className="rounded-xl border border-[#EAC4A8] bg-white px-4 py-2.5 text-sm font-extrabold text-[#8D613F] disabled:opacity-50">
          {status === "sold" ? "✓ Sold" : busy === "sold" ? "Saving..." : "✓ Mark as sold"}
        </button>
        <button type="button" onClick={() => { setConfirmDelete(!confirmDelete); setError(""); }} disabled={Boolean(busy)}
          className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-extrabold text-red-700 disabled:opacity-50">
          Delete
        </button>
      </div>

      {pendingEdit && <p className="mt-3 text-xs font-semibold text-[#B06F42]">⏳ An edit is awaiting approval. Your existing listing stays visible.</p>}
      {notice && <p role="status" className="mt-3 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{notice}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {confirmDelete && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-black text-red-800">Permanently delete this listing?</p>
          <p className="mt-1 text-xs text-red-700">The product will disappear from the marketplace and your profile. This cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={deleteListing} disabled={Boolean(busy)} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {busy === "delete" ? "Deleting..." : "Yes, delete"}
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmDelete(false)} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#765B50]">Cancel</button>
          </div>
        </div>
      )}

      {editing && form && (
        <form onSubmit={saveEdit} className="mt-5 space-y-4 rounded-[22px] bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black">Edit product details</h3>
            <button type="button" onClick={() => setEditing(false)} disabled={Boolean(busy)} className="text-sm font-bold text-[#987766]">Close ×</button>
          </div>
          <p className="text-xs text-[#987766]">Your changes won't replace the current listing until an owner or moderator approves them.</p>

          <div>
            <label className={labelStyle}>Product title</label>
            <input className={fieldStyle} required minLength={4} maxLength={120} value={form.title} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelStyle}>Price (₹)</label><input className={fieldStyle} type="number" min="0" max="9999999999.99" step="0.01" required value={form.price} onChange={(e) => update("price", e.target.value)} /></div>
            <div><label className={labelStyle}>Condition</label><select className={fieldStyle} value={form.condition} onChange={(e) => update("condition", e.target.value)}>{conditions.map((item) => <option key={item}>{item}</option>)}</select></div>
          </div>
          <div><label className={labelStyle}>Category</label><select className={fieldStyle} value={form.category} onChange={(e) => update("category", e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className={labelStyle}>Description</label><textarea className={fieldStyle} rows={4} maxLength={5000} value={form.description} onChange={(e) => update("description", e.target.value)} /></div>
          <div><label className={labelStyle}>Your area</label><select className={fieldStyle} value={form.localityId} onChange={(e) => update("localityId", e.target.value)}>{localities.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div>
          <div><label className={labelStyle}>Meetup preference</label><select className={fieldStyle} value={form.meetupPolicy} onChange={(e) => update("meetupPolicy", e.target.value)}><option value="pickup_only">Pickup in my area</option><option value="selected_areas">I can meet nearby</option></select></div>
          {form.meetupPolicy === "selected_areas" && (
            <div>
              <p className={labelStyle}>Meetup areas</p>
              <div className="flex flex-wrap gap-2">
                {localities.map((area) => <label key={area.id} className="flex items-center gap-1 rounded-xl border border-[#EFD6C5] px-2 py-2 text-xs"><input type="checkbox" className="accent-[#F4773D]" checked={meetupAreaIds.includes(Number(area.id))} onChange={() => setMeetupAreaIds((old) => old.includes(Number(area.id)) ? old.filter((x) => x !== Number(area.id)) : [...old, Number(area.id)])} />{area.name}</label>)}
              </div>
            </div>
          )}
          <div><label className={labelStyle}>Meetup note</label><input className={fieldStyle} maxLength={500} value={form.travelNote} onChange={(e) => update("travelNote", e.target.value)} /></div>
          <div>
            <p className={labelStyle}>Contact options</p>
            <div className="space-y-2">
              {contacts.map((item) => {
                const enabled = selectedContacts.includes(item.field);
                return <div key={item.field} className="rounded-xl border border-[#EFD6C5] p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#654938]"><input type="checkbox" className="accent-[#F4773D]" checked={enabled} onChange={() => toggleContact(item.field)} />{item.label}</label>
                  {enabled && <input className={`${fieldStyle} mt-2`} type={item.type} maxLength={item.field === "contactEmail" ? 254 : undefined} placeholder={item.placeholder} value={form[item.field]} onChange={(e) => update(item.field, e.target.value)} />}
                </div>;
              })}
            </div>
          </div>
          <div className="rounded-xl border border-[#EFD6C5] p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" className="accent-[#F4773D]" checked={replacePhotos} onChange={(e) => { setReplacePhotos(e.target.checked); setPhotos([]); }} />Replace existing photos</label>
            <p className="mt-1 text-xs text-[#987766]">Leave unchecked to keep your current public photos. New photos replace all old ones after approval.</p>
            {replacePhotos && <>
              <input className="mt-3 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { const chosen = [...(e.target.files ?? [])]; e.target.value = ""; if (chosen.length > 8) { setError("Choose up to 8 photos."); return; } setPhotos(chosen); }} />
              {previews.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{previews.map((url, index) => <img key={url} src={url} alt={`Replacement photo ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />)}</div>}
            </>}
          </div>
          <button type="submit" disabled={Boolean(busy)} className="w-full rounded-xl bg-[#F4773D] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">
            {busy === "edit" ? "Submitting changes..." : "Submit changes for review →"}
          </button>
        </form>
      )}
    </section>
  );
}
