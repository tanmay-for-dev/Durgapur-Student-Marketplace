
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";

const categoryIcons = {
  Books: "📚",
  Electronics: "🎧",
  Furniture: "🪑",
  Cycles: "🚲",
  Others: "📦",
};

function ListingCard({ listing }) {
  const firstPhoto = [...(listing.photos ?? [])].sort(
    (a, b) => a.position - b.position
  )[0];

  const image = firstPhoto
    ? supabase.storage
        .from("listing-images")
        .getPublicUrl(firstPhoto.storage_path).data.publicUrl
    : null;

  const card = (
    <article className="h-full overflow-hidden rounded-[24px] bg-white shadow-[5px_8px_22px_#EEDDD1] transition hover:-translate-y-1 hover:shadow-[8px_12px_28px_#E8D1C2]">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#FFF0E6]">
        {image ? (
          <img
            src={image}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-6xl">
            {categoryIcons[listing.category] ?? "📦"}
          </span>
        )}

        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold capitalize text-[#8C6147] shadow-sm">
          {listing.status}
        </span>
      </div>

      <div className="p-4">
        <p className="text-xs font-bold text-[#BA835F]">
          {listing.category}
        </p>

        <h3 className="mt-2 line-clamp-2 min-h-12 text-base font-black leading-snug text-[#342720]">
          {listing.title}
        </h3>

        <p className="mt-2 text-xl font-black text-[#E9783D]">
          ₹{Number(listing.price).toLocaleString("en-IN")}
        </p>
      </div>
    </article>
  );

  if (listing.status === "draft") {
    return <div>{card}</div>;
  }

  return (
    <Link
      to={`/product/${listing.id}`}
      className="block h-full text-inherit no-underline"
    >
      {card}
    </Link>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [tab, setTab] = useState("listings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username && authLoading) return;

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");
      setTab("listings");

      if (!username && !user) {
        setProfile(null);
        setListings([]);
        setLoading(false);
        return;
      }

      try {
        const column = username ? "username" : "id";
        const value = username || user.id;

        const { data: account, error: profileError } = await supabase
          .from("profiles")
          .select(`
            id,
            username,
            display_name,
            bio,
            avatar_path,
            locality:localities!profiles_locality_id_fkey(name)
          `)
          .eq(column, value)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!account) {
          if (!cancelled) {
            setProfile(null);
            setListings([]);
          }
          return;
        }

        const isOwner = user?.id === account.id;

        const { data, error: listingsError } = await supabase
          .from("listings")
          .select(`
            id,
            title,
            price,
            category,
            status,
            created_at,
            photos:listing_images(storage_path, position)
          `)
          .eq("seller_id", account.id)
          .in(
            "status",
            isOwner
              ? ["available", "reserved", "sold", "draft"]
              : ["available", "reserved", "sold"]
          )
          .order("created_at", { ascending: false });

        if (listingsError) throw listingsError;

        if (!cancelled) {
          setProfile(account);
          setListings(data ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [username, user?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FFF9F5]">
        <p className="font-semibold text-[#A8795F]">
          Loading storefront...
        </p>
      </main>
    );
  }

  if (!username && !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FFF9F5] px-5">
        <div className="rounded-[28px] bg-white p-10 text-center shadow-lg">
          <h1 className="text-2xl font-black">Your profile awaits.</h1>
          <p className="mt-3 text-[#907769]">
            Sign in to see your personal storefront.
          </p>
          <Link
            to="/auth?mode=login&next=%2Fprofile"
            className="orange-button mt-6 inline-flex"
          >
            Continue
          </Link>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FFF9F5] px-5">
        <div className="rounded-[28px] bg-white p-10 text-center">
          <h1 className="text-2xl font-black">
            {error ? "Couldn't load profile" : "Profile not found"}
          </h1>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          <Link to="/" className="orange-button mt-6 inline-flex">
            Back to marketplace
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = user?.id === profile.id;

  const available = listings.filter(
    (item) => item.status === "available" || item.status === "reserved"
  );
  const sold = listings.filter((item) => item.status === "sold");
  const drafts = listings.filter((item) => item.status === "draft");

  const tabs = [
    { id: "listings", label: "Listings", count: available.length },
    { id: "sold", label: "Sold", count: sold.length },
    ...(isOwner
      ? [{ id: "drafts", label: "Drafts", count: drafts.length }]
      : []),
  ];

  const displayedListings =
    tab === "sold" ? sold : tab === "drafts" ? drafts : available;

  const avatarUrl = profile.avatar_path
    ? supabase.storage
        .from("avatars")
        .getPublicUrl(profile.avatar_path).data.publicUrl
    : null;

  return (
    <main className="min-h-screen bg-[#FFF9F5] px-4 py-7 text-[#342720] md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="back-pill">
          ← Back to marketplace
        </Link>

        <section className="mt-7 overflow-hidden rounded-[32px] bg-white shadow-[10px_15px_35px_#ECD6C7]">
          <div className="bg-gradient-to-br from-[#FFEAD9] to-[#FFD4B6] p-6 md:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#FFF7F0] text-4xl font-black text-[#DB7540] shadow-[5px_8px_18px_#DFAE8E] md:h-32 md:w-32">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile.display_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (profile.display_name || "D").charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-widest text-[#BF794F]">
                  {isOwner ? "My storefront" : "DGP Finds member"}
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                  {profile.display_name}
                </h1>

                <p className="mt-2 break-all text-sm font-semibold text-[#A06B4C]">
                  @{profile.username}
                </p>

                <p className="mt-2 text-sm text-[#8B6854]">
                  📍 {profile.locality?.name ?? "Durgapur"}
                </p>
              </div>

              {isOwner && (
                <Link
                  to="/profile/edit"
                  className="self-start rounded-2xl border border-white bg-white px-5 py-3 text-sm font-extrabold text-[#986043] no-underline shadow-[4px_6px_15px_#E4B99F]"
                >
                  ✎ Edit profile
                </Link>
              )}
            </div>

            {profile.bio && (
              <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-[#795747]">
                {profile.bio}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-8 px-6 py-5 md:px-10">
            <div>
              <span className="text-xl font-black">{available.length}</span>
              <span className="ml-2 text-sm text-[#957F72]">
                Active listings
              </span>
            </div>

            <div>
              <span className="text-xl font-black">{sold.length}</span>
              <span className="ml-2 text-sm text-[#957F72]">
                Sold
              </span>
            </div>

            {isOwner && (
              <Link
                to="/sell"
                className="ml-auto text-sm font-extrabold text-[#E8793D] no-underline"
              >
                + Sell an item
              </Link>
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex gap-6 border-b border-[#EEDBCF]">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`border-b-[3px] px-2 pb-4 text-sm font-extrabold transition ${
                  tab === item.id
                    ? "border-[#F4773D] text-[#C96836]"
                    : "border-transparent text-[#9B8274] hover:text-[#C96836]"
                }`}
              >
                {item.label}
                <span className="ml-2 text-xs opacity-70">
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          {displayedListings.length ? (
            <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {displayedListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-[28px] bg-white px-6 py-16 text-center shadow-sm">
              <div className="text-5xl">
                {tab === "sold" ? "📦" : tab === "drafts" ? "📝" : "🛍️"}
              </div>

              <h2 className="mt-4 text-xl font-black">
                {tab === "sold"
                  ? "No sold items yet"
                  : tab === "drafts"
                    ? "No drafts yet"
                    : "No listings yet"}
              </h2>

              <p className="mt-2 text-sm text-[#957F72]">
                {isOwner
                  ? "Your items will appear here as you list them."
                  : "This member hasn't posted anything in this section."}
              </p>

              {isOwner && tab === "listings" && (
                <Link
                  to="/sell"
                  className="orange-button mt-6 inline-flex"
                >
                  Post your first item
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
