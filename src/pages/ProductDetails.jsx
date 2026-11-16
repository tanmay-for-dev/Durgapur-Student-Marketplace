import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AuthPrompt from "../components/AuthPrompt.jsx";
import { supabase } from "../lib/supabase.js";
import { getListingById, getListings } from "../services/listings.js";

const categoryIcons = {
  Books: "📚",
  Electronics: "🎧",
  Furniture: "🪑",
  Cycles: "🚲",
  Others: "📦",
};

function ImagePlaceholder({ category, small = false }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#FFF1E7]">
      <span className={small ? "text-5xl" : "text-8xl"}>
        {categoryIcons[category] ?? "📦"}
      </span>
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [product, setProduct] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("contact");
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteChecked, setFavoriteChecked] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  const pendingSave = searchParams.get("save") === "1";

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setError("");
      setProduct(null);
      setListings([]);
      setSelectedImage(0);
      setImageFailed(false);
      setActiveTab("contact");
      setSaved(false);
      setFavoriteChecked(false);
      setFavoriteError("");

      try {
        const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

        if (!validId) {
          if (active) setProduct(null);
          return;
        }

        const [listing, availableListings] = await Promise.all([
          getListingById(id),
          getListings(),
        ]);

        if (!active) return;
        setProduct(listing);
        setListings(availableListings);
      } catch (err) {
        if (active) setError(err.message || "Couldn't load this listing.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!product || authLoading) return;

    if (!user) {
      setSaved(false);
      setFavoriteLoading(false);
      setFavoriteChecked(true);
      return;
    }

    let active = true;

    async function checkFavorite() {
      setFavoriteLoading(true);
      setFavoriteChecked(false);
      setFavoriteError("");

      const { data, error: queryError } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id)
        .eq("listing_id", product.id)
        .maybeSingle();

      if (!active) return;

      if (queryError) {
        setFavoriteError("Couldn't check your saved items.");
      } else {
        setSaved(Boolean(data));
      }

      setFavoriteLoading(false);
      setFavoriteChecked(true);
    }

    checkFavorite();

    return () => {
      active = false;
    };
  }, [product?.id, user?.id, authLoading]);

  useEffect(() => {
    if (!pendingSave || !product || !user || authLoading || favoriteLoading || !favoriteChecked) return;

    let active = true;

    async function finishSaving() {
      const { error: saveError } = await supabase
        .from("favorites")
        .upsert(
          { user_id: user.id, listing_id: product.id },
          { onConflict: "user_id,listing_id", ignoreDuplicates: true }
        );

      if (!active) return;

      if (saveError) {
        setFavoriteError(saveError.message);
      } else {
        setSaved(true);
        setFavoriteError("");
      }

      setSearchParams((current) => {
        const updated = new URLSearchParams(current);
        updated.delete("save");
        return updated;
      }, { replace: true });
    }

    finishSaving();

    return () => {
      active = false;
    };
  }, [pendingSave, product?.id, user?.id, authLoading, favoriteLoading, favoriteChecked, setSearchParams]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];

    return listings
      .filter(
        (item) =>
          item.id !== product.id &&
          (item.category === product.category || item.location === product.location)
      )
      .slice(0, 3);
  }, [listings, product]);

  async function handleFavorite() {
    if (authLoading || favoriteLoading || !product) return;

    if (!user) {
      setAuthPromptOpen(true);
      return;
    }

    setFavoriteLoading(true);
    setFavoriteError("");

    const result = saved
      ? await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", product.id)
      : await supabase
          .from("favorites")
          .upsert(
            { user_id: user.id, listing_id: product.id },
            { onConflict: "user_id,listing_id", ignoreDuplicates: true }
          );

    if (result.error) {
      setFavoriteError(result.error.message);
    } else {
      setSaved((previous) => !previous);
    }

    setFavoriteLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF9F5] px-5 text-[#806C60]">
        <p className="text-sm font-semibold" role="status">Loading listing...</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#FFF9F5] px-5 py-12 text-[#342720]">
        <div className="mx-auto max-w-3xl rounded-[30px] bg-white p-10 text-center shadow-lg">
          <div className="text-5xl">{error ? "⚠️" : "😕"}</div>
          <h1 className="mt-4 text-3xl font-black">
            {error ? "Couldn't load this listing" : "Product not found"}
          </h1>
          <p className="mt-2 text-[#8A7367]">
            {error || "This listing may have been removed or the link may be incorrect."}
          </p>
          <Link to="/" className="orange-button mt-6 inline-flex">
            Back to marketplace
          </Link>
        </div>
      </main>
    );
  }

  const photo = product.images[selectedImage];
  const whatsappUrl = product.whatsapp
    ? `https://wa.me/${product.whatsapp.replace(/\D/g, "")}`
    : null;
  const phoneUrl = product.phone
    ? `tel:${product.phone.replace(/\s/g, "")}`
    : null;

  return (
    <main className="min-h-screen bg-[#FFF9F5] px-4 py-6 text-[#342720] md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <Link to="/#explore" className="back-pill">
            ← Back to marketplace
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="product-showcase">
            <button
              type="button"
              onClick={handleFavorite}
              disabled={authLoading || favoriteLoading}
              className={`favorite-float ${saved ? "active" : ""}`}
              aria-label={saved ? "Remove from favorites" : "Save to favorites"}
              aria-pressed={saved}
            >
              ★
            </button>

            <div className="product-main-image">
              {!photo || imageFailed ? (
                <ImagePlaceholder category={product.category} />
              ) : (
                <img
                  src={photo}
                  alt={product.name}
                  onError={() => setImageFailed(true)}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {product.images.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {product.images.map((image, index) => (
                  <button
                    type="button"
                    key={image}
                    onClick={() => {
                      setSelectedImage(index);
                      setImageFailed(false);
                    }}
                    aria-label={`View product photo ${index + 1}`}
                    aria-pressed={selectedImage === index}
                    className={`h-20 w-20 overflow-hidden rounded-2xl border-2 bg-white ${
                      selectedImage === index
                        ? "border-[#F4773D]"
                        : "border-white"
                    }`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {favoriteError && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {favoriteError}
              </p>
            )}

            <div className="mt-4 rounded-[24px] bg-white/80 p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <span className="detail-chip">{product.category}</span>
                <span className="detail-chip">{product.condition}</span>
                <span className="detail-chip">{product.status === "available" ? "Available" : product.status}</span>
              </div>
            </div>
          </div>

          <div className="product-info-shell">
            <div className="rounded-[32px] bg-white p-6 shadow-[10px_15px_35px_#ecd6c7] md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="product-page-badge">{product.category}</span>
                <span className="text-sm font-semibold text-[#9D8579]">
                  Posted {product.posted}
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight md:text-5xl">
                {product.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <p className="text-4xl font-black tracking-tight text-[#F4773D] md:text-5xl">
                  ₹{product.price.toLocaleString("en-IN")}
                </p>
                
<div className="flex items-center gap-3">
  <Link
    to={`/u/${product.username}`}
    aria-label={`View ${product.username}'s profile`}
    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#F4C6A9] bg-[#FFE6D4] text-lg font-black text-[#D9733D] transition hover:scale-105"
  >
    {product.sellerAvatar ? (
      <img
        src={product.sellerAvatar}
        alt=""
        className="h-full w-full object-cover"
      />
    ) : (
      (product.sellerName || "D").charAt(0).toUpperCase()
    )}
  </Link>

  <div className="text-right">
    <p className="text-xs font-semibold text-[#9D8579]">
      Listed by
    </p>

    <Link
      to={`/u/${product.username}`}
      className="mt-1 block text-sm font-black text-[#342720] no-underline transition hover:text-[#F4773D]"
    >
      @{product.username}
    </Link>
  </div>
</div>

              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="meta-clay">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#A68573]">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-[#46342A]">
                    📍 {product.location}, Durgapur
                  </p>
                </div>
                <div className="meta-clay">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#A68573]">
                    Meetup preference
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-[#46342A]">
                    {product.meetupPolicy === "selected_areas" ? "Selected areas" : "Pickup only"}
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <h2 className="text-lg font-black">Product details</h2>
                <p className="mt-3 whitespace-pre-line leading-7 text-[#7D675B]">
                  {product.description || "The seller hasn't added a description yet."}
                </p>
              </div>

              <div className="mt-8">
                <div className="tab-row">
                  <button
                    type="button"
                    onClick={() => setActiveTab("contact")}
                    className={`product-tab ${activeTab === "contact" ? "active" : ""}`}
                  >
                    Contact Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("location")}
                    className={`product-tab ${activeTab === "location" ? "active" : ""}`}
                  >
                    Location & Meetup
                  </button>
                </div>

                <div className="tab-panel mt-5">
                  {activeTab === "contact" ? (
                    <div className="space-y-4">
                      <div className="rounded-[22px] bg-[#FFF6F0] p-4">
                        <p className="text-sm font-bold text-[#9C7A66]">
                          Connect with the seller directly
                        </p>
                        <p className="mt-1 text-sm text-[#7D675B]">
                          Choose a contact method to discuss availability, condition, or meetup timing.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="contact-action whatsapp"
                          >
                            <span className="text-xl">💬</span>
                            <div>
                              <p className="font-extrabold">WhatsApp</p>
                              <p className="text-xs text-[#6F655F]">Message seller</p>
                            </div>
                          </a>
                        )}

                        {phoneUrl && (
                          <a href={phoneUrl} className="contact-action">
                            <span className="text-xl">📞</span>
                            <div>
                              <p className="font-extrabold">Call Owner</p>
                              <p className="text-xs text-[#6F655F]">{product.phone}</p>
                            </div>
                          </a>
                        )}
                      </div>

                      {!whatsappUrl && !phoneUrl && (
                        <p className="text-sm text-[#7D675B]">Contact details are unavailable for this listing.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="location-card">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#A68573]">
                          Seller's area
                        </p>
                        <p className="mt-2 text-base font-extrabold text-[#43332A]">
                          {product.exactLocation}, Durgapur
                        </p>
                      </div>

                      <div className="location-card">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#A68573]">
                          Meetup arrangements
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="travel-chip">
                            {product.meetupPolicy === "selected_areas"
                              ? "Selected meetup areas"
                              : "Pickup in seller's area"}
                          </span>
                        </div>
                        <p className="mt-4 text-sm text-[#7D675B]">
                          {product.travelNote ||
                            (product.meetupPolicy === "selected_areas"
                              ? "Ask the seller which areas work for a meetup."
                              : "Contact the seller to arrange pickup.")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-10">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">You may also like</h2>
                <p className="mt-1 text-sm text-[#8B7568]">
                  Similar local finds from the marketplace
                </p>
              </div>
              <Link to="/#explore" className="white-button hidden sm:inline-flex">
                Browse more
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {relatedProducts.map((item) => (
                <Link
                  key={item.id}
                  to={`/product/${item.id}`}
                  className="related-card text-inherit no-underline"
                >
                  <div className="related-image">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlaceholder category={item.category} small />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="product-category">{item.category}</span>
                      <span className="text-xs text-[#A48D80]">{item.posted}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black leading-snug">{item.name}</h3>
                    <p className="mt-2 text-2xl font-black text-[#F4773D]">
                      ₹{item.price.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#7C6559]">
                      📍 {item.location}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <AuthPrompt
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        action="favorite"
        returnTo={`/product/${product.id}?save=1`}
      />
    </main>
  );
}
