import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getHomepageListings, getMarketplaceListings, getMarketplaceLocalities } from "../services/listings.js";
import HomeListingCardV2 from "./HomeListingCardV2.jsx";

const categories = [
  { name: "All", icon: "✳" },
  { name: "Books", icon: "📚" },
  { name: "Electronics", icon: "🎧" },
  { name: "Furniture", icon: "🪑" },
  { name: "Cycles", icon: "🚲" },
  { name: "Others", icon: "📦" },
];

export default function HomePreviewV2({ onSell }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");
  const [localityId, setLocalityId] = useState("");
  const [localities, setLocalities] = useState([]);
  const [localitiesError, setLocalitiesError] = useState("");
  const [queryText, setQueryText] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    getMarketplaceLocalities()
      .then((areas) => {
        if (active) setLocalities(areas);
      })
      .catch(() => {
        if (active) setLocalitiesError("Locality options are temporarily unavailable.");
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    const promise = category === "All" && localityId === ""
      ? getHomepageListings(8)
      : getMarketplaceListings({ category, localityIds: localityId ? [localityId] : [], availableOnly: true, pageSize: 8 });

    promise
      .then((result) => {
        if (!active) return;
        setItems(Array.isArray(result) ? result : result.items);
      })
      .catch((reason) => {
        if (!active) return;
        setItems([]);
        setError(reason?.message || "Couldn't load local finds.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [category, localityId, attempt]);

  const browsePath = useMemo(() => {
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (localityId) params.set("locality", localityId);
    const search = params.toString();
    return search ? `/marketplace?${search}` : "/marketplace";
  }, [category, localityId]);

  function searchMarketplace(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (queryText.trim()) params.set("q", queryText.trim());
    if (category !== "All") params.set("category", category);
    if (localityId) params.set("locality", localityId);
    const search = params.toString();
    navigate(search ? `/marketplace?${search}` : "/marketplace");
  }

  return (
    <section id="discover" className="scroll-mt-24 px-5 pb-20 pt-16 md:px-10 md:pb-24 md:pt-22">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[.2em] text-[#E77850]">01 / THE GOOD STUFF</span>
            <h2 className="mt-2 text-[clamp(35px,4.4vw,58px)] font-black leading-[1.08] tracking-[-.055em] text-[#30372C]">Fresh finds around you<span className="text-[#EF794D]">.</span></h2>
            <p className="mt-3 text-sm font-semibold text-[#827E72] sm:text-base">Actual listings from people in Durgapur. Good things deserve another story.</p>
          </div>
          <form onSubmit={searchMarketplace} className="flex w-full max-w-[425px] items-center gap-2 rounded-full border-2 border-[#E8DCCB] bg-white py-1.5 pl-4 pr-1.5 shadow-[3px_4px_0_#EFE3D4] focus-within:border-[#F07950]">
            <span aria-hidden="true" className="text-lg text-[#A69D8D]">⌕</span>
            <input type="search" value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search books, gadgets, cycles..." aria-label="Search the full marketplace" className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm font-semibold text-[#343B30] outline-none placeholder:text-[#AAA297]" />
            <button type="submit" className="shrink-0 rounded-full bg-[#303A2E] px-4 py-2.5 text-xs font-black text-white">Search ↗</button>
          </form>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="home-locality" className="text-xs font-black text-[#8A786B]">📍 Find nearby</label>
            <select id="home-locality" value={localityId} onChange={(event) => setLocalityId(event.target.value)} className="max-w-[220px] rounded-full border-2 border-[#E6D8C8] bg-white px-4 py-2.5 text-xs font-black text-[#434A3A] outline-none focus:border-[#EF794D] sm:text-sm">
              <option value="">All Durgapur</option>
              {localities.map((area) => <option key={area.id} value={String(area.id)}>{area.name}</option>)}
            </select>
          </div>
          <Link to={browsePath} className="hidden text-sm font-black text-[#D9744F] underline-offset-4 hover:underline sm:inline-flex">Explore all finds ↗</Link>
        </div>
        {localitiesError && <p role="status" className="mb-4 text-xs font-semibold text-[#9F5F44]">{localitiesError}</p>}

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2" aria-label="Product category filters">
          {categories.map(({ name, icon }) => (
            <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)} className={`shrink-0 rounded-full border-2 px-4 py-2.5 text-xs font-black transition sm:text-sm ${category === name ? "border-[#323C2F] bg-[#323C2F] text-white shadow-[2px_3px_0_#DECAB1]" : "border-[#E9DFD1] bg-white text-[#747066] hover:border-[#EE815B]"}`}>
              {icon} {name === "All" ? "Everything" : name}
            </button>
          ))}
        </div>

        {loading ? (
          <div role="status" aria-label="Loading local finds" className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="animate-pulse"><div className="aspect-[1.12/1] rounded-[24px] bg-[#F1E7D9]" /><div className="mt-3 h-4 w-3/4 rounded bg-[#EEE2D2]" /><div className="mt-2 h-3 w-2/3 rounded bg-[#F2EADF]" /></div>)}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-[28px] border-2 border-dashed border-[#E6D6C6] bg-[#FFF3E8] px-6 py-12 text-center">
            <h3 className="text-xl font-black">Couldn't load finds right now</h3>
            <p className="mt-2 text-sm font-semibold text-[#83766B]">{error}</p>
            <button onClick={() => setAttempt((value) => value + 1)} className="mt-5 rounded-full bg-[#30392D] px-6 py-3 text-sm font-black text-white">Try again</button>
          </div>
        ) : items.length ? (
          <>
            <p className="mb-5 text-xs font-extrabold text-[#9A8E7F]">Showing {items.length} recent {items.length === 1 ? "find" : "finds"} · Browse all to see the full inventory</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
              {items.map((product) => <HomeListingCardV2 key={product.id} product={product} />)}
            </div>
          </>
        ) : (
          <div className="rounded-[30px] border-2 border-dashed border-[#E8D9C6] bg-[#FFF3E6] px-7 py-13 text-center">
            <div className="text-5xl">📦</div>
            <h3 className="mt-4 text-xl font-black text-[#343B30]">{category !== "All" || localityId ? "No finds in this corner, yet" : "Something good is coming"}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-7 text-[#857B6F]">{category !== "All" || localityId ? "Try another category or neighborhood, or explore the whole city." : "There are no available products right now. Every new listing will appear here after approval."}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {(category !== "All" || localityId) && <button onClick={() => { setCategory("All"); setLocalityId(""); }} className="rounded-full border-2 border-[#30392D] px-6 py-3 text-sm font-black text-[#30392D]">Clear filters</button>}
              <button onClick={onSell} className="rounded-full bg-[#30392D] px-6 py-3 text-sm font-black text-white">＋ Sell your first find ↗</button>
            </div>
          </div>
        )}

        <div className="mt-12 flex justify-center">
          <Link to={browsePath} className="rounded-full bg-[#303A2E] px-8 py-4 text-sm font-black text-white shadow-[4px_5px_0_#E2C9AC] transition hover:-translate-y-0.5">Explore all finds ↗</Link>
        </div>
      </div>
    </section>
  );
}
