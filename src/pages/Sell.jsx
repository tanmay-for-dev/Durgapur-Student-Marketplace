
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getLocalities, submitListingForReview } from "../services/createListing.js";

const categories = ["Books", "Electronics", "Furniture", "Cycles", "Others"];
const conditions = ["Like new", "Good", "Used"];

const initialForm = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "Good",
  localityId: "",
  meetupPolicy: "pickup_only",
  travelNote: "",
  whatsapp: "",
  phone: "",
  contactEmail: "",
};

const fieldStyle =
  "w-full rounded-2xl border border-[#F0DDCF] bg-[#FFFBF8] px-4 py-3.5 text-sm text-[#46342A] outline-none transition focus:border-[#F4773D] focus:ring-2 focus:ring-[#F4773D]/15";
const labelStyle = "mb-2 block text-sm font-extrabold text-[#5F4739]";

export default function Sell() {
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [selectedContacts, setSelectedContacts] = useState([
  "whatsapp",
  "phone",
  "contactEmail",
]);
  const [localities, setLocalities] = useState([]);
  const [localitiesLoading, setLocalitiesLoading] = useState(true);
  const [localitiesError, setLocalitiesError] = useState("");
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [meetupAreaIds, setMeetupAreaIds] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  useEffect(() => {
    let active = true;

    getLocalities()
      .then((data) => {
        if (active) setLocalities(data);
      })
      .catch((err) => {
        if (active) setLocalitiesError(err.message || "Couldn't load areas.");
      })
      .finally(() => {
        if (active) setLocalitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

function toggleContact(field) {
  if (selectedContacts.includes(field)) {
    if (selectedContacts.length === 1) return;

    setSelectedContacts((current) =>
      current.filter((item) => item !== field)
    );

    setForm((current) => ({
      ...current,
      [field]: "",
    }));
  } else {
    setSelectedContacts((current) => [...current, field]);
  }
}


  function handlePhotos(event) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!chosen.length) return;

    if (photos.length + chosen.length > 8) {
      setError("You can upload up to 8 photos.");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (chosen.some((file) => !allowed.includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError("Use JPG, PNG, or WebP images up to 5 MB each.");
      return;
    }

    setPhotos((current) => [...current, ...chosen]);
    setError("");
  }

  function toggleArea(id) {
    setMeetupAreaIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError("");

if (form.title.trim().length < 4 || form.title.trim().length > 120) {
  setError("Your listing title must be between 4 and 120 characters, excluding extra spaces.");
  return;
}


    if (!photos.length) {
      setError("Add at least one clear photo of your item.");
      return;
    }

    if (!form.localityId) {
      setError("Select your area in Durgapur.");
      return;
    }

    if (!form.whatsapp.trim() && !form.phone.trim() && !form.contactEmail.trim()) {
      setError("Add at least one contact method: WhatsApp, phone, or email.");
      return;
    }

    if (form.whatsapp.trim() && !/^[1-9][0-9]{7,14}$/.test(form.whatsapp.trim())) {
      setError("WhatsApp must contain 8–15 digits with country code, without +.");
      return;
    }

    if (form.phone.trim() && !/^\+[1-9][0-9]{7,14}$/.test(form.phone.trim())) {
      setError("Call number must start with + and include your country code.");
      return;
    }

    if (form.contactEmail.trim() && (form.contactEmail.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()))) {
      setError("Enter a valid contact email address.");
      return;
    }

    if (form.meetupPolicy === "selected_areas" && !meetupAreaIds.length) {
      setError("Choose at least one meetup area.");
      return;
    }

    setSubmitting(true);

    try {
      const id = await submitListingForReview({ details: form, photos, meetupAreaIds });
      setSubmittedId(id);
    } catch (err) {
      setError(err.message || "Couldn't submit your listing for review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF9F5] text-[#8F7667]">
        Checking your session...
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/auth?mode=signup&next=%2Fsell" replace />;
  }

  if (submittedId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF9F5] px-4 py-12 text-[#342720]">
        <div className="w-full max-w-xl rounded-[32px] border border-white bg-white p-8 text-center shadow-[10px_16px_36px_#ecd9cd,-5px_-5px_20px_#ffffff] sm:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FFF0E5] text-3xl font-black text-[#F4773D]">✓</div>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-[#E47B45]">SUBMISSION RECEIVED</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Your listing is under review<span className="text-[#F4773D]">.</span>
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#8D7567]">
            Your details and photos have been sent to the DGP Finds review team.
            The item will appear publicly only after approval.
          </p>
          <div className="mt-6 rounded-2xl border border-[#F4DFC8] bg-[#FFF7EE] px-4 py-4 text-sm font-bold text-[#A36E45]">
            ⏳ Awaiting approval
          </div>
          <p className="mt-3 text-xs text-[#A48B7E]">
            Submission reference: {submittedId.slice(0, 8)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/profile"
              className="orange-button flex flex-1 items-center justify-center py-3.5 text-sm font-extrabold no-underline"
            >
              My profile
            </Link>
            <Link
              to="/"
              className="flex flex-1 items-center justify-center rounded-2xl border border-[#F0DDCF] bg-[#FFFBF8] px-4 py-3.5 text-sm font-extrabold text-[#8A644F] no-underline"
            >
              Browse marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF9F5] px-4 py-7 text-[#342720] sm:px-6 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-[#986E57] no-underline hover:text-[#F4773D]"
          >
            ← Back to marketplace
          </Link>
          <span className="rounded-full bg-[#FFF0E5] px-4 py-2 text-xs font-bold text-[#B26C42]">
            dgpfinds. · Seller studio
          </span>
        </div>

        <div className="mb-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E47B45]">
            PASS IT ON
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Give it a second story<span className="text-[#F4773D]">.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#8D7567] sm:text-base">
            Add a few details and clear photos. An owner or moderator will review
            your item before it goes live.
          </p>
        </div>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_290px]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-[30px] border border-white bg-white p-5 shadow-[10px_16px_36px_#ecd9cd,-5px_-5px_20px_#ffffff] sm:p-8">
              <div className="mb-7 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF0E5] text-xl">
                  📦
                </span>
                <div>
                  <h2 className="text-xl font-black">The item</h2>
                  <p className="text-xs text-[#A18B7F]">
                    Make your listing easy to find
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="sell-title" className={labelStyle}>
                    Listing title
                  </label>
                  <input
                    id="sell-title"
                    className={fieldStyle}
                    required
                    minLength={4}
                    maxLength={120}
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="e.g. Engineering mathematics textbook, 2nd semester"
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sell-price" className={labelStyle}>
                      Asking price (₹)
                    </label>
                    <input
                      id="sell-price"
                      type="number"
                      min="0"
                      max="9999999999.99"
                      step="0.01"
                      className={fieldStyle}
                      required
                      value={form.price}
                      onChange={(e) => updateField("price", e.target.value)}
                      placeholder="750"
                    />
                  </div>
                  <div>
                    <label htmlFor="sell-condition" className={labelStyle}>
                      Condition
                    </label>
                    <select
                      id="sell-condition"
                      className={fieldStyle}
                      value={form.condition}
                      onChange={(e) => updateField("condition", e.target.value)}
                    >
                      {conditions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="sell-category" className={labelStyle}>
                    Category
                  </label>
                  <select
                    id="sell-category"
                    className={fieldStyle}
                    required
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                  >
                    <option value="">Choose a category</option>
                    {categories.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sell-description" className={labelStyle}>
                    Description
                  </label>
                  <textarea
                    id="sell-description"
                    rows={5}
                    className={`${fieldStyle} resize-y`}
                    maxLength={5000}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Tell buyers about its age, condition, what's included, and anything worth knowing."
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white bg-white p-5 shadow-[10px_16px_36px_#ecd9cd,-5px_-5px_20px_#ffffff] sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF0E5] text-xl">
                  📸
                </span>
                <div>
                  <h2 className="text-xl font-black">Photos</h2>
                  <p className="text-xs text-[#A18B7F]">
                    Your first photo becomes the cover
                  </p>
                </div>
              </div>

              <label
                htmlFor="sell-photos"
                className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#EDCDB7] bg-[#FFF8F3] px-5 py-9 text-center transition hover:border-[#F4773D] hover:bg-[#FFF3E9]"
              >
                <span className="text-4xl">＋</span>
                <span className="mt-3 text-sm font-extrabold text-[#B76B40]">
                  Add photos
                </span>
                <span className="mt-1 text-xs text-[#A08A7C]">
                  JPG, PNG or WebP · 5 MB each · up to 8
                </span>
              </label>
              <input
                id="sell-photos"
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotos}
              />

              {previews.length > 0 && (
                <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {previews.map((url, index) => (
                    <div
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-2xl bg-[#FFF1E7]"
                    >
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPhotos((current) =>
                            current.filter((_, i) => i !== index)
                          )
                        }
                        aria-label={`Remove photo ${index + 1}`}
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-lg text-[#7C5844] shadow-sm"
                      >
                        ×
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 rounded-lg bg-[#F4773D] px-2 py-1 text-[10px] font-bold text-white">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[30px] border border-white bg-white p-5 shadow-[10px_16px_36px_#ecd9cd,-5px_-5px_20px_#ffffff] sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF0E5] text-xl">
                  📍
                </span>
                <div>
                  <h2 className="text-xl font-black">Meetup & contact</h2>
                  <p className="text-xs text-[#A18B7F]">
                    Give buyers a way to reach you
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="sell-locality" className={labelStyle}>
                    Your area in Durgapur
                  </label>
                  <select
                    id="sell-locality"
                    className={fieldStyle}
                    required
                    disabled={localitiesLoading || Boolean(localitiesError)}
                    value={form.localityId}
                    onChange={(e) => updateField("localityId", e.target.value)}
                  >
                    <option value="">
                      {localitiesLoading ? "Loading areas..." : "Choose your area"}
                    </option>
                    {localities.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                  {localitiesError && (
                    <p role="alert" className="mt-2 text-xs text-red-600">
                      {localitiesError}
                    </p>
                  )}
                </div>

                <fieldset>
                  <legend className={labelStyle}>Meetup preference</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { value: "pickup_only", label: "Pickup in my area" },
                      { value: "selected_areas", label: "I can meet nearby" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-2 rounded-2xl border p-3.5 text-sm font-bold ${
                          form.meetupPolicy === option.value
                            ? "border-[#F4773D] bg-[#FFF3EA]"
                            : "border-[#F0DDCF]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="meetup"
                          value={option.value}
                          checked={form.meetupPolicy === option.value}
                          onChange={() => updateField("meetupPolicy", option.value)}
                          className="accent-[#F4773D]"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {form.meetupPolicy === "selected_areas" && (
                  <fieldset>
                    <legend className={labelStyle}>
                      Areas you can meet in
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {localities.map((area) => (
                        <label
                          key={area.id}
                          className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold ${
                            meetupAreaIds.includes(area.id)
                              ? "border-[#F4773D] bg-[#FFF0E5] text-[#B6653A]"
                              : "border-[#E9D8CC] text-[#80685A]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={meetupAreaIds.includes(area.id)}
                            onChange={() => toggleArea(area.id)}
                          />
                          {area.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <div>
                  <label htmlFor="sell-note" className={labelStyle}>
                    Meetup note (optional)
                  </label>
                  <input
                    id="sell-note"
                    className={fieldStyle}
                    maxLength={500}
                    value={form.travelNote}
                    onChange={(e) => updateField("travelNote", e.target.value)}
                    placeholder="e.g. Available near City Centre on weekends"
                  />
                </div>

                
<div className="space-y-4">
  <div>
    <h3 className="text-base font-black text-[#46342A]">
      How can buyers contact you?
    </h3>
    <p className="mt-1 text-xs leading-5 text-[#A08778]">
      Choose how you'd like to be contacted. Keep at least one
      method selected and provide contact information for it.
    </p>
  </div>

  {[
    {
      field: "whatsapp",
      title: "WhatsApp",
      icon: "💬",
      description: "Let buyers message you directly",
      placeholder: "919876543210",
      hint: "Include country code, digits only, without +",
      type: "tel",
    },
    {
      field: "phone",
      title: "Phone calls",
      icon: "📞",
      description: "Allow buyers to call your number",
      placeholder: "+919876543210",
      hint: "Include + and country code",
      type: "tel",
    },
    {
      field: "contactEmail",
      title: "Email",
      icon: "✉️",
      description: "Communicate without sharing your phone number",
      placeholder: "you@example.com",
      hint: "Your sign-up email is not shared automatically",
      type: "email",
    },
  ].map((method) => {
    const selected = selectedContacts.includes(method.field);

    return (
      <div
        key={method.field}
        className={`overflow-hidden rounded-[22px] border transition-all duration-200 ${
          selected
            ? "border-[#F1B68E] bg-[#FFF8F2] shadow-[3px_5px_14px_#F3E1D5]"
            : "border-[#F0DDCF] bg-white"
        }`}
      >
        <label className="flex cursor-pointer items-center gap-3 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#FFF0E5] text-xl">
            {method.icon}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-[#46342A]">
              {method.title}
            </span>
            <span className="mt-1 block text-xs leading-5 text-[#A08778]">
              {method.description}
            </span>
          </span>

          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleContact(method.field)}
            className="h-5 w-5 shrink-0 cursor-pointer accent-[#F4773D]"
          />
        </label>

        {selected && (
          <div className="border-t border-[#F3DFD0] px-4 pb-4 pt-4">
            <input
              type={method.type}
              className={fieldStyle}
              value={form[method.field]}
              onChange={(e) =>
                updateField(method.field, e.target.value)
              }
              placeholder={method.placeholder}
              maxLength={method.field === "contactEmail" ? 254 : undefined}
            />

            <p className="mt-2 text-xs text-[#A38B7C]">
              {method.hint}
            </p>
          </div>
        )}
      </div>
    );
  })}

  <div className="rounded-2xl bg-[#FFF0E5] px-4 py-3">
    <p className="text-xs font-semibold leading-5 text-[#A16E50]">
      🔒 Only the contact information you provide will be
      displayed publicly after your listing is approved.
    </p>
  </div>
</div>

              </div>
            </section>

            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || localitiesLoading || Boolean(localitiesError)}
              className="orange-button flex w-full items-center justify-center py-4 text-sm font-extrabold disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Submitting for review..." : "Submit for review →"}
            </button>
            <p className="text-center text-xs text-[#A48B7E]">
              Your item stays private until a DGP Finds owner or moderator approves it.
            </p>
          </form>

          <aside className="rounded-[28px] border border-[#F2DECE] bg-[#FFF2E8] p-6 text-[#6E503D] lg:sticky lg:top-8">
            <span className="text-3xl">✦</span>
            <h2 className="mt-4 text-xl font-black">
              Make a great first impression.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#907462]">
              The best listings are simple, specific, and honest. Show the
              actual item and explain its condition clearly.
            </p>
            <div className="mt-6 space-y-4 text-sm font-semibold">
              <p>✓ Photograph the item in good light</p>
              <p>✓ Mention damage or missing parts</p>
              <p>✓ Choose a realistic asking price</p>
              <p>✓ Meet in a safe public place</p>
            </div>
            <div className="mt-7 rounded-2xl bg-white/75 p-4 text-xs leading-6 text-[#916E56]">
              Once approved, your listing is visible to local visitors, even
              without an account.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
