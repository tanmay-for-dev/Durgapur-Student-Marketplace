import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getMarketplaceListings, getMarketplaceLocalities } from "../services/listings.js";
import { useAuth } from "../context/AuthContext.jsx";
import AuthPrompt from "../components/AuthPrompt.jsx";
import ProfileShortcut from "../components/ProfileShortcut.jsx";

const categories = [
  { name: "All", icon: "✳" },
  { name: "Books", icon: "📚" },
  { name: "Electronics", icon: "🎧" },
  { name: "Furniture", icon: "🪑" },
  { name: "Cycles", icon: "🚲" },
  { name: "Others", icon: "📦" },
];

const conditions = ["Like new", "Good", "Used"];
const pageSize = 12;
const money = (price) => `₹${Number(price).toLocaleString("en-IN")}`;

function readPrice(value) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function readFilters(params) {
  const category = params.get("category") || "All";
  const sort = params.get("sort") || "newest";

  return {
    search: params.get("q") || "",
    category: categories.some((item) => item.name === category) ? category : "All",
    localityIds: (params.get("locality") || "")
      .split(",")
      .filter((item) => /^\d+$/.test(item) && Number(item) > 0),
    conditions: (params.get("condition") || "")
      .split(",")
      .filter((item) => conditions.includes(item)),
    minPrice: readPrice(params.get("min")),
    maxPrice: readPrice(params.get("max")),
    sort: ["newest", "oldest", "price_low", "price_high"].includes(sort)
      ? sort
      : "newest",
    availableOnly: params.get("show") !== "all",
  };
}

function ListingCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link to={`/product/${product.id}`} className="group block min-w-0 text-inherit no-underline">
      <article>
        <div className="relative aspect-[1.08] overflow-hidden rounded-[21px] bg-[#EFE2D4] sm:rounded-[27px]">
          {!imageFailed && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-6xl">📦</div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-[#FFFAF2]/95 px-3 py-1.5 text-[10px] font-extrabold text-[#4B5A43] shadow-sm sm:text-xs">
            {product.condition}
          </span>
          {product.status !== "available" && (
            <span className="absolute bottom-3 left-3 rounded-full bg-[#353B30] px-3 py-1.5 text-xs font-black uppercase text-white">
              {product.status}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#A07357]">
              {product.category}
            </p>
            <h3 className="line-clamp-2 text-sm font-black leading-snug text-[#30372C] sm:text-base">
              {product.name}
            </h3>
          </div>
          <span className="shrink-0 text-sm font-black text-[#DE704B] sm:text-lg">
            {money(product.price)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[#898276]">
          <span>📍 {product.location}</span>
          <span>·</span>
          <span>{product.posted}</span>
        </div>
      </article>
    </Link>
  );
}

function Filters({
  filters,
  localities,
  localitiesError,
  priceDraft,
  onPriceDraft,
  priceError,
  onApplyPrice,
  onCategory,
  onLocality,
  onCondition,
  onAvailability,
  onReset,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl text-[#ED764E]">✳</span>
          <h2 className="text-lg font-black tracking-tight">Make it yours</h2>
        </div>
        <button type="button" onClick={onReset} className="text-xs font-extrabold text-[#D97650] hover:underline">
          Reset all
        </button>
      </div>

      <fieldset className="rounded-[20px] border border-[#F0E1D1] bg-[#FFF6EC] p-4">
        <legend className="sr-only">Finds by locality</legend>
        <h3 className="mb-1 text-sm font-black">📍 Where's it at?</h3>
        <p className="mb-3 text-xs text-[#8B8073]">Discover nearby finds</p>
        <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-extrabold">
          <input
            type="checkbox"
            checked={filters.localityIds.length === 0}
            onChange={() => onLocality(null)}
            className="accent-[#EF784E]"
          />
          All Durgapur
        </label>
        {localitiesError && <p className="mb-2 text-xs text-red-700">{localitiesError}</p>}
        <div className="grid grid-cols-2 gap-2">
          {localities.map((area) => (
            <label
              key={area.id}
              className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2.5 text-[11px] font-bold ${
                filters.localityIds.includes(String(area.id))
                  ? "border-[#E7AF8D] bg-[#FFE5D2] text-[#9E5B3C]"
                  : "border-[#E8DED2] bg-white text-[#676459]"
              }`}
            >
              <input
                type="checkbox"
                checked={filters.localityIds.includes(String(area.id))}
                onChange={() => onLocality(String(area.id))}
                className="h-3.5 w-3.5 shrink-0 accent-[#EF784E]"
              />
              <span className="min-w-0 break-words">{area.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-black">What are you looking for?</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map(({ name, icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => onCategory(name)}
              aria-pressed={filters.category === name}
              className={`rounded-full border px-3 py-2 text-xs font-extrabold transition ${
                filters.category === name
                  ? "border-[#30392D] bg-[#30392D] text-white"
                  : "border-[#EBE0D4] bg-white text-[#747065] hover:border-[#EF784E]"
              }`}
            >
              {icon} {name === "All" ? "All finds" : name}
            </button>
          ))}
        </div>
      </fieldset>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApplyPrice();
        }}
        className="border-t border-[#F1E6DA] pt-5"
      >
        <h3 className="mb-3 text-sm font-black">Your budget</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="text-xs font-bold text-[#85796D]">
            Min price (₹)
            <input
              type="number"
              min="0"
              step="1"
              value={priceDraft.min}
              onChange={(event) => onPriceDraft("min", event.target.value)}
              placeholder="0"
              className="mt-1.5 w-full rounded-xl border border-[#E8DCCF] bg-white p-2.5 text-sm font-bold text-[#30392D] outline-none focus:border-[#EF784E]"
            />
          </label>
          <label className="text-xs font-bold text-[#85796D]">
            Max price (₹)
            <input
              type="number"
              min="0"
              step="1"
              value={priceDraft.max}
              onChange={(event) => onPriceDraft("max", event.target.value)}
              placeholder="No limit"
              className="mt-1.5 w-full rounded-xl border border-[#E8DCCF] bg-white p-2.5 text-sm font-bold text-[#30392D] outline-none focus:border-[#EF784E]"
            />
          </label>
        </div>
        {priceError && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{priceError}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => onApplyPrice("500")} className="rounded-full bg-[#FFF0E4] px-3 py-2 text-[11px] font-bold text-[#9A6142]">Under ₹500</button>
          <button type="button" onClick={() => onApplyPrice("1500")} className="rounded-full bg-[#FFF0E4] px-3 py-2 text-[11px] font-bold text-[#9A6142]">Under ₹1,500</button>
          <button type="submit" className="rounded-full bg-[#DDE9C9] px-3 py-2 text-[11px] font-black text-[#425339]">Apply budget ↗</button>
        </div>
      </form>

      <fieldset className="border-t border-[#F1E6DA] pt-5">
        <legend className="mb-3 text-sm font-black">How's the condition?</legend>
        <div className="space-y-3">
          {conditions.map((condition) => (
            <label key={condition} className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-[#64655C]">
              {condition}
              <input
                type="checkbox"
                checked={filters.conditions.includes(condition)}
                onChange={() => onCondition(condition)}
                className="h-4 w-4 accent-[#EF784E]"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-[#F1E6DA] pt-5">
        <span>
          <span className="block text-sm font-black">Only available items</span>
          <span className="block text-[11px] text-[#8E847A]">Hide sold and reserved finds</span>
        </span>
        <input
          type="checkbox"
          checked={filters.availableOnly}
          onChange={(event) => onAvailability(event.target.checked)}
          className="h-5 w-5 accent-[#EF784E]"
        />
      </label>
    </div>
  );
}

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const urlKey = searchParams.toString();
  const filters = useMemo(() => readFilters(new URLSearchParams(urlKey)), [urlKey]);

  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [priceDraft, setPriceDraft] = useState({
    min: filters.minPrice === null ? "" : String(filters.minPrice),
    max: filters.maxPrice === null ? "" : String(filters.maxPrice),
  });
  const [priceError, setPriceError] = useState("");
  const [localities, setLocalities] = useState([]);
  const [localitiesError, setLocalitiesError] = useState("");
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const requestVersion = useRef(0);

  function patchFilters(patch, replace = false) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "" || value === undefined) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      return next;
    }, { replace });
  }

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  useEffect(() => {
    setPriceDraft({
      min: filters.minPrice === null ? "" : String(filters.minPrice),
      max: filters.maxPrice === null ? "" : String(filters.maxPrice),
    });
  }, [filters.minPrice, filters.maxPrice]);

  useEffect(() => {
    if (searchDraft === filters.search) return;
    const timer = window.setTimeout(() => patchFilters({ q: searchDraft.trim() }, true), 400);
    return () => window.clearTimeout(timer);
  }, [searchDraft, filters.search]);

  useEffect(() => {
    let active = true;
    getMarketplaceLocalities()
      .then((data) => {
        if (active) setLocalities(data);
      })
      .catch(() => {
        if (active) setLocalitiesError("Couldn't load Durgapur localities.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const version = ++requestVersion.current;
    setIsLoading(true);
    setIsLoadingMore(false);
    setError("");
    setPage(1);
    setProducts([]);

    getMarketplaceListings({ ...filters, page: 1, pageSize })
      .then((result) => {
        if (version !== requestVersion.current) return;
        setProducts(result.items);
        setTotalCount(result.totalCount);
      })
      .catch((failure) => {
        if (version !== requestVersion.current) return;
        setError(failure.message || "Couldn't load marketplace listings.");
        setTotalCount(0);
      })
      .finally(() => {
        if (version === requestVersion.current) setIsLoading(false);
      });
  }, [urlKey]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileFiltersOpen]);

  async function loadMore() {
    if (isLoadingMore || isLoading || products.length >= totalCount) return;
    const version = requestVersion.current;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getMarketplaceListings({ ...filters, page: nextPage, pageSize });
      if (version !== requestVersion.current) return;
      setProducts((previous) => {
        const seen = new Set(previous.map((item) => item.id));
        return [...previous, ...result.items.filter((item) => !seen.has(item.id))];
      });
      setTotalCount(result.totalCount);
      setPage(nextPage);
    } catch (failure) {
      if (version === requestVersion.current) setError(failure.message || "Couldn't load more listings.");
    } finally {
      if (version === requestVersion.current) setIsLoadingMore(false);
    }
  }

  function handleSellClick() {
    if (authLoading) return;
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    navigate("/sell");
  }

  function toggleLocality(id) {
    if (id === null) {
      patchFilters({ locality: null });
      return;
    }
    const next = filters.localityIds.includes(id)
      ? filters.localityIds.filter((item) => item !== id)
      : [...filters.localityIds, id];
    patchFilters({ locality: next.length ? next.join(",") : null });
  }

  function toggleCondition(condition) {
    const next = filters.conditions.includes(condition)
      ? filters.conditions.filter((item) => item !== condition)
      : [...filters.conditions, condition];
    patchFilters({ condition: next.length ? next.join(",") : null });
  }

  function applyPrice(presetMax) {
    const min = presetMax ? "" : priceDraft.min.trim();
    const max = presetMax || priceDraft.max.trim();
    const invalid = (value) => value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0);
    if (invalid(min) || invalid(max) || (min !== "" && max !== "" && Number(min) > Number(max))) {
      setPriceError("Enter a valid price range.");
      return;
    }
    setPriceError("");
    setPriceDraft({ min, max });
    patchFilters({ min: min || null, max: max || null });
  }

  function resetAll() {
    setSearchDraft("");
    setPriceError("");
    setSearchParams(new URLSearchParams());
  }

  const activeCount = (filters.category !== "All" ? 1 : 0) + filters.localityIds.length +
    filters.conditions.length + (filters.minPrice !== null ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) + (!filters.availableOnly ? 1 : 0);

  const filterProps = {
    filters,
    localities,
    localitiesError,
    priceDraft,
    priceError,
    onPriceDraft: (field, value) => {
      setPriceDraft((previous) => ({ ...previous, [field]: value }));
      setPriceError("");
    },
    onApplyPrice: applyPrice,
    onCategory: (category) => patchFilters({ category: category === "All" ? null : category }),
    onLocality: toggleLocality,
    onCondition: toggleCondition,
    onAvailability: (checked) => patchFilters({ show: checked ? null : "all" }),
    onReset: resetAll,
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] pb-20 text-[#30372C] md:pb-0">
      <div className="bg-[#30392D] px-4 py-2 text-center text-[11px] font-extrabold text-[#FFF9F2]">
        ✳ The student marketplace for local finds in Durgapur
      </div>

      <header className="sticky top-0 z-20 border-b border-[#EEE4D7] bg-[#FFF9F2]/95 backdrop-blur-lg">
        <div className="relative mx-auto flex max-w-[1380px] items-center gap-3 px-5 py-4 md:px-10">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-inherit no-underline">
            <span className="grid h-10 w-10 -rotate-6 place-items-center rounded-[13px] bg-[#F5794D] text-2xl text-white shadow-[3px_4px_0_#30392D]">✳</span>
            <span className="text-2xl font-black tracking-[-1px]">dgp<span className="text-[#F5794D]">finds</span></span>
          </Link>
          <span className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-sm font-black lg:block">
            Durgapur Student Marketplace
          </span>
          <div className="flex-1" />
          <span className="hidden md:block"><ProfileShortcut /></span>
          <button
            onClick={handleSellClick}
            disabled={authLoading}
            className="rounded-full bg-[#F5794D] px-4 py-3 text-xs font-black text-white shadow-[3px_4px_0_#30392D] disabled:opacity-60 sm:px-5 sm:text-sm"
          >
            ＋ Sell something ↗
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1380px] px-5 pb-16 pt-9 md:px-10 md:pt-14">
        <div className="mb-9 grid gap-6 border-b border-[#EADFCF] pb-9 md:grid-cols-[1fr_390px] md:items-end">
          <div>
            <span className="inline-block -rotate-1 rounded-full border border-[#E9CFAB] bg-[#FFF0DD] px-4 py-2 text-[10px] font-black uppercase tracking-[1.5px] text-[#AB7049]">
              ✳ The good stuff / discover
            </span>
            <h1 className="mt-5 text-[clamp(38px,4.3vw,64px)] font-black leading-[1.04] tracking-[-0.055em]">
              Browse the neighborhood<span className="text-[#EF7750]">.</span>
            </h1>
            <p className="mt-3 text-sm font-semibold text-[#827D72] sm:text-base">
              Something for your desk, your weekends, your next chapter.
            </p>
          </div>
          <label className="flex items-center gap-3 rounded-[19px] border-2 border-[#E9DCCA] bg-white px-4 py-4 shadow-[3px_4px_0_#F2E4D4] focus-within:border-[#F5794D]">
            <span aria-hidden="true" className="text-2xl text-[#BF9579]">⌕</span>
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              type="search"
              aria-label="Search marketplace products"
              placeholder="Search books, cycles, gadgets..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#AD9F91]"
            />
          </label>
        </div>

        <div className="grid gap-8 lg:grid-cols-[285px_minmax(0,1fr)] lg:gap-9">
          <aside className="hidden self-start rounded-[28px] border border-[#EBDCCD] bg-white p-5 shadow-[5px_7px_0_#F0E6D7] lg:sticky lg:top-28 lg:block">
            <Filters {...filterProps} />
          </aside>

          <section className="min-w-0" aria-label="Marketplace results">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#E1EDCC] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#526346]">✳ Local finds</span>
                <span aria-live="polite" className="text-xs font-extrabold text-[#777468]">
                  {isLoading ? "Looking for finds..." : error && !products.length ? "Unavailable" : `${totalCount} ${totalCount === 1 ? "find" : "finds"}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="rounded-xl border border-[#E8DCCA] bg-white px-4 py-2.5 text-xs font-black lg:hidden"
                >
                  ☷ Filters{activeCount ? ` (${activeCount})` : ""}
                </button>
                <select
                  value={filters.sort}
                  onChange={(event) => patchFilters({ sort: event.target.value === "newest" ? null : event.target.value })}
                  aria-label="Sort marketplace listings"
                  className="max-w-[165px] rounded-xl border border-[#E8DCCA] bg-white px-3 py-2.5 text-xs font-extrabold outline-none sm:max-w-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="price_low">Price: low to high</option>
                  <option value="price_high">Price: high to low</option>
                </select>
              </div>
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-2 lg:hidden">
              <button onClick={() => setMobileFiltersOpen(true)} className="shrink-0 rounded-full border border-[#E5D8C8] bg-[#FFF0E5] px-4 py-2.5 text-xs font-black text-[#A36141]">
                📍 {filters.localityIds.length === 0 ? "All Durgapur" : `${filters.localityIds.length} area(s)`} ⌄
              </button>
              {categories.slice(1).map(({ name, icon }) => (
                <button
                  key={name}
                  onClick={() => patchFilters({ category: filters.category === name ? null : name })}
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black ${filters.category === name ? "border-[#30392D] bg-[#30392D] text-white" : "border-[#E5D8C8] bg-white"}`}
                >
                  {icon} {name}
                </button>
              ))}
            </div>

            {activeCount > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {filters.category !== "All" && <button onClick={() => patchFilters({ category: null })} className="rounded-full bg-[#F4E8DB] px-3 py-2 text-xs font-bold">{filters.category} ×</button>}
                {filters.localityIds.map((id) => <button key={id} onClick={() => toggleLocality(id)} className="rounded-full bg-[#F4E8DB] px-3 py-2 text-xs font-bold">📍 {localities.find((area) => String(area.id) === id)?.name || "Area"} ×</button>)}
                {filters.conditions.map((condition) => <button key={condition} onClick={() => toggleCondition(condition)} className="rounded-full bg-[#F4E8DB] px-3 py-2 text-xs font-bold">{condition} ×</button>)}
                {(filters.minPrice !== null || filters.maxPrice !== null) && <button onClick={() => patchFilters({ min: null, max: null })} className="rounded-full bg-[#F4E8DB] px-3 py-2 text-xs font-bold">Budget ×</button>}
                {!filters.availableOnly && <button onClick={() => patchFilters({ show: null })} className="rounded-full bg-[#F4E8DB] px-3 py-2 text-xs font-bold">Including sold ×</button>}
                <button onClick={resetAll} className="px-2 text-xs font-black text-[#C77454] underline underline-offset-2">Clear all</button>
              </div>
            )}

            {isLoading ? (
              <div role="status" className="rounded-[28px] bg-white p-12 text-center text-sm font-bold text-[#7C776C]">Finding the good stuff around Durgapur... ✳</div>
            ) : error && products.length === 0 ? (
              <div role="alert" className="rounded-[28px] border border-[#F0D7C6] bg-white p-10 text-center">
                <h2 className="text-xl font-black">Couldn't load the marketplace</h2>
                <p className="mt-3 text-sm text-[#81796E]">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-5 rounded-full bg-[#30392D] px-5 py-3 text-sm font-bold text-white">Try again</button>
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-[28px] border-2 border-dashed border-[#EADAC8] bg-[#FFF3E8] px-6 py-14 text-center">
                <p className="text-5xl">📦</p>
                <h2 className="mt-4 text-2xl font-black">No finds in this corner... yet!</h2>
                <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[#81766A]">
                  {activeCount || filters.search ? "Try another search or clear your filters." : "The marketplace is ready for its next approved listing."}
                </p>
                {activeCount || filters.search ? (
                  <button onClick={resetAll} className="mt-6 rounded-full bg-[#30392D] px-6 py-3 text-sm font-black text-white">Show everything ↗</button>
                ) : (
                  <button onClick={handleSellClick} className="mt-6 rounded-full bg-[#F5794D] px-6 py-3 text-sm font-black text-white">List something ↗</button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => <ListingCard key={product.id} product={product} />)}
                </div>
                {error && <p role="alert" className="mt-5 text-center text-xs font-semibold text-red-700">{error}</p>}
                {products.length < totalCount && (
                  <div className="mt-11 flex flex-col items-center gap-2">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="rounded-full border-2 border-[#30392D] px-8 py-3.5 text-sm font-black shadow-[4px_5px_0_#E9D7C1] disabled:opacity-60"
                    >
                      {isLoadingMore ? "Loading..." : "Show more finds ↓"}
                    </button>
                    <p className="text-xs font-semibold text-[#9C9387]">Showing {products.length} of {totalCount} finds</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-5 rounded-[30px] bg-[#DEEBCA] px-8 py-10 sm:flex-row sm:items-center">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[1.4px] text-[#64754F]">Good things go around ✳</span>
            <h2 className="mt-2 text-2xl font-black">Got something worth passing on?</h2>
            <p className="mt-2 text-sm font-semibold text-[#6E7B60]">Someone in Durgapur might be looking for exactly that.</p>
          </div>
          <button onClick={handleSellClick} className="shrink-0 rounded-full bg-[#30392D] px-6 py-3.5 text-sm font-black text-white">Post a find ↗</button>
        </div>
      </main>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)} className="absolute inset-0 bg-[#252B22]/50" />
          <section role="dialog" aria-modal="true" aria-label="Marketplace filters" className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[30px] bg-[#FFF9F2] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#E8DCCD] px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[1.5px] text-[#E47B52]">Discover your next favorite</p>
                <h2 className="mt-1 text-xl font-black">Find your kind of find ✳</h2>
              </div>
              <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" className="grid h-10 w-10 place-items-center rounded-full bg-white text-lg">×</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5"><Filters {...filterProps} /></div>
            <div className="shrink-0 border-t border-[#E8DCCD] bg-[#FFF9F2] px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-4">
              <button onClick={() => setMobileFiltersOpen(false)} className="w-full rounded-full bg-[#F5794D] px-6 py-3.5 text-sm font-black text-white shadow-[3px_4px_0_#30392D]">
                {isLoading ? "Updating finds..." : `Show ${totalCount} ${totalCount === 1 ? "find" : "finds"} ↗`}
              </button>
            </div>
          </section>
        </div>
      )}

      <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-[#E7DBCD] bg-[#FFF9F2]/95 px-2 py-2.5 backdrop-blur-md md:hidden">
        <Link to="/marketplace" aria-current="page" className="flex flex-col items-center text-[10px] font-black text-[#E87650] no-underline"><span className="text-xl">⌕</span>Explore</Link>
        <button disabled title="Saved items are coming next" className="flex flex-col items-center text-[10px] font-bold text-[#AAA095]"><span className="text-xl">♡</span>Saved soon</button>
        <button onClick={handleSellClick} className="flex flex-col items-center text-[10px] font-bold text-[#756E64]"><span className="text-xl">＋</span>Sell</button>
        <Link to="/profile" className="flex flex-col items-center text-[10px] font-bold text-[#756E64] no-underline"><span className="text-xl">☺</span>Profile</Link>
      </nav>

      <AuthPrompt open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} action="sell" returnTo="/sell" />
    </div>
  );
}
