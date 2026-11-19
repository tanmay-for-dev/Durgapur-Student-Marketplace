import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import ProfileShortcut from "../components/ProfileShortcut.jsx";
import { supabase } from "../lib/supabase.js";

const categoryIcons = {
  Books: "📚",
  Electronics: "🎧",
  Furniture: "🪑",
  Cycles: "🚲",
  Others: "📦",
};

const money = (price) => `₹${Number(price).toLocaleString("en-IN")}`;

function SavedCard({ item, removing, onRemove }) {
  const listing = item.listing;
  const imagePath = [...(listing?.images ?? [])].sort(
    (first, second) => first.position - second.position
  )[0]?.storage_path;
  const image = imagePath
    ? supabase.storage.from("listing-images").getPublicUrl(imagePath).data.publicUrl
    : null;
  const [imageFailed, setImageFailed] = useState(false);
  const status = listing?.status;
  const unavailable = !listing || !["available", "reserved", "sold"].includes(status);

  return (
    <div className="relative min-w-0">
      {unavailable ? (
        <article className="h-full opacity-75">
          <div className="grid aspect-[1.08] place-items-center rounded-[21px] bg-[#E8E4DE] text-6xl sm:rounded-[27px]">
            📦
          </div>
          <h2 className="mt-3 text-sm font-black text-[#50544A] sm:text-base">Listing unavailable</h2>
          <p className="mt-1 text-xs font-semibold text-[#898276]">This find is no longer public.</p>
        </article>
      ) : (
        <Link to={`/product/${listing.id}`} className="group block min-w-0 text-inherit no-underline">
          <article>
            <div className="relative aspect-[1.08] overflow-hidden rounded-[21px] bg-[#EFE2D4] sm:rounded-[27px]">
              {image && !imageFailed ? (
                <img
                  src={image}
                  alt={listing.title}
                  loading="lazy"
                  onError={() => setImageFailed(true)}
                  className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.05] ${status === "sold" ? "opacity-75" : ""}`}
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-6xl">
                  {categoryIcons[listing.category] ?? "📦"}
                </div>
              )}
              {listing.condition && (
                <span className="absolute left-3 top-3 rounded-full bg-[#FFFAF2]/95 px-3 py-1.5 text-[10px] font-extrabold text-[#4B5A43] shadow-sm sm:text-xs">
                  {listing.condition}
                </span>
              )}
              {status !== "available" && (
                <span className="absolute bottom-3 left-3 rounded-full bg-[#353B30] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white sm:text-xs">
                  {status}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#A07357]">
                  {listing.category}
                </p>
                <h2 className="line-clamp-2 text-sm font-black leading-snug text-[#30372C] sm:text-base">
                  {listing.title}
                </h2>
              </div>
              <span className="shrink-0 text-sm font-black text-[#DE704B] sm:text-lg">
                {money(listing.price)}
              </span>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-[#898276]">
              📍 {listing.locality?.name ?? "Durgapur"}
            </p>
          </article>
        </Link>
      )}
      <button
        type="button"
        onClick={() => onRemove(item.listing_id)}
        disabled={removing}
        aria-label={listing ? `Remove ${listing.title} from saved items` : "Remove unavailable listing from saved items"}
        title="Remove from saved"
        className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/95 text-xl font-black text-[#F4773D] shadow-[2px_4px_11px_#42372D30] transition hover:scale-105 disabled:cursor-wait disabled:opacity-50"
      >
        {removing ? "…" : "♥"}
      </button>
    </div>
  );
}

export default function SavedItems() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingIds, setRemovingIds] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    async function loadSaved() {
      const { data, error: queryError } = await supabase
        .from("favorites")
        .select(`
          listing_id,
          created_at,
          listing:listings!favorites_listing_id_fkey(
            id,
            title,
            price,
            category,
            condition,
            status,
            locality:localities!listings_locality_id_fkey(name),
            images:listing_images(storage_path, position)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (queryError) {
        setError(queryError.message || "Couldn't load your saved finds.");
        setItems([]);
      } else {
        setItems(data ?? []);
      }
      setLoading(false);
    }

    loadSaved();
    return () => {
      active = false;
    };
  }, [user?.id, authLoading]);

  async function removeSaved(listingId) {
    if (!user || removingIds.includes(listingId)) return;
    setRemovingIds((current) => [...current, listingId]);
    setError("");

    const { error: removeError } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    if (removeError) {
      setError("Couldn't remove this saved item. Please try again.");
    } else {
      setItems((current) => current.filter((item) => item.listing_id !== listingId));
    }
    setRemovingIds((current) => current.filter((id) => id !== listingId));
  }

  const availableCount = items.filter((item) => item.listing?.status === "available").length;

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#30372C]" style={{ fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif" }}>
      <div className="bg-[#30392D] px-4 py-2 text-center text-[11px] font-extrabold text-[#FFF9F2]">
        ✳ The student marketplace for local finds in Durgapur
      </div>
      <header className="border-b border-[#EEE4D7] bg-[#FFF9F2]">
        <div className="mx-auto flex max-w-[1380px] items-center gap-3 px-4 py-4 md:px-10">
          <BrandLogo />
          <div className="flex-1" />
          <Link to="/marketplace" className="rounded-full border border-[#E6D9CB] bg-white px-4 py-2.5 text-xs font-black text-[#30392D] no-underline sm:text-sm">
            Browse finds ↗
          </Link>
          <ProfileShortcut />
        </div>
      </header>

      <main className="mx-auto max-w-[1380px] px-5 pb-20 pt-9 md:px-10 md:pt-14">
        <div className="mb-9 border-b border-[#EADFCF] pb-8">
          <span className="inline-block -rotate-1 rounded-full border border-[#E9CFAB] bg-[#FFF0DD] px-4 py-2 text-[10px] font-black uppercase tracking-[1.5px] text-[#AB7049]">
            ♡ Your little collection
          </span>
          <h1 className="mt-5 text-[clamp(38px,4.3vw,64px)] font-black leading-[1.04] tracking-[-0.055em]">
            Saved finds<span className="text-[#EF7750]">.</span>
          </h1>
          <p className="mt-3 text-sm font-semibold text-[#827D72] sm:text-base">
            Keep the good stuff close until you're ready to make a move.
          </p>
        </div>

        {authLoading || loading ? (
          <div role="status" className="rounded-[28px] bg-white p-12 text-center text-sm font-bold text-[#7C776C]">
            Loading your saved finds...
          </div>
        ) : !user ? (
          <section className="rounded-[28px] border border-[#EADAC8] bg-white px-6 py-14 text-center shadow-[5px_7px_0_#F0E6D7]">
            <p className="text-5xl">♡</p>
            <h2 className="mt-4 text-2xl font-black">Your favorites deserve a home.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[#81766A]">
              Log in or join DGP Finds to see the items you've saved.
            </p>
            <Link to="/auth?mode=login&next=%2Fsaved" className="mt-6 inline-block rounded-full bg-[#F5794D] px-6 py-3 text-sm font-black text-white no-underline shadow-[3px_4px_0_#30392D]">
              Log in to continue ↗
            </Link>
          </section>
        ) : error && items.length === 0 ? (
          <section role="alert" className="rounded-[28px] border border-[#F0D7C6] bg-white p-10 text-center">
            <h2 className="text-xl font-black">Couldn't load saved finds</h2>
            <p className="mt-3 text-sm text-[#81796E]">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-full bg-[#30392D] px-5 py-3 text-sm font-bold text-white">Try again</button>
          </section>
        ) : items.length === 0 ? (
          <section className="rounded-[28px] border-2 border-dashed border-[#EADAC8] bg-[#FFF3E8] px-6 py-14 text-center">
            <p className="text-5xl">♡</p>
            <h2 className="mt-4 text-2xl font-black">Nothing saved just yet.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[#81766A]">
              Found something worth coming back to? Tap the star on its product page to keep it here.
            </p>
            <Link to="/marketplace" className="mt-6 inline-block rounded-full bg-[#F5794D] px-6 py-3 text-sm font-black text-white no-underline shadow-[3px_4px_0_#30392D]">
              Explore the marketplace ↗
            </Link>
          </section>
        ) : (
          <section aria-label="Saved products">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-extrabold text-[#777468]">
                <span className="rounded-lg bg-[#E1EDCC] px-3 py-2 text-[#526346]">
                  {items.length} saved
                </span>
                <span className="ml-3">{availableCount} still available</span>
              </p>
              <Link to="/marketplace" className="text-xs font-black text-[#C77454] no-underline hover:underline">Keep exploring ↗</Link>
            </div>
            {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
              {items.map((item) => (
                <SavedCard
                  key={item.listing_id}
                  item={item}
                  removing={removingIds.includes(item.listing_id)}
                  onRemove={removeSaved}
                />
              ))}
            </div>
            <p className="mt-10 text-xs font-semibold text-[#988A7C]">
              Sold or reserved finds remain here until you remove them.
            </p>
          </section>
        )}
      </main>
      <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-[#E7DBCD] bg-[#FFF9F2]/95 px-2 py-2.5 backdrop-blur-md md:hidden">
        <Link to="/marketplace" className="flex flex-col items-center text-[10px] font-bold text-[#756E64] no-underline"><span className="text-xl">⌕</span>Explore</Link>
        <Link to="/saved" aria-current="page" className="flex flex-col items-center text-[10px] font-black text-[#E87650] no-underline"><span className="text-xl">♥</span>Saved</Link>
        <Link to={user ? "/sell" : "/auth?mode=login&next=%2Fsell"} className="flex flex-col items-center text-[10px] font-bold text-[#756E64] no-underline"><span className="text-xl">＋</span>Sell</Link>
        <Link to="/profile" className="flex flex-col items-center text-[10px] font-bold text-[#756E64] no-underline"><span className="text-xl">☺</span>Profile</Link>
      </nav>
    </div>
  );
}
