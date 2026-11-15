
import { useState } from "react";

const categories = [
  { name: "All", icon: "✨" },
  { name: "Books", icon: "📚" },
  { name: "Electronics", icon: "🎧" },
  { name: "Furniture", icon: "🪑" },
  { name: "Cycles", icon: "🚲" },
  { name: "Others", icon: "📦" },
];

// Temporary sample data.
// Later, these listings will come from Supabase.
const products = [
  {
    id: 1,
    name: "Engineering Books Bundle",
    category: "Books",
    price: 450,
    location: "City Centre",
    distance: "650 m away",
    posted: "2 days ago",
    ageHours: 48,
    condition: "Good",
    emoji: "📚",
    image:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Wireless Bluetooth Headphones",
    category: "Electronics",
    price: 1800,
    location: "Benachity",
    distance: "2.4 km away",
    posted: "5 hours ago",
    ageHours: 5,
    condition: "Like new",
    emoji: "🎧",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Wooden Study Chair",
    category: "Furniture",
    price: 900,
    location: "Bidhannagar",
    distance: "3.2 km away",
    posted: "1 day ago",
    ageHours: 24,
    condition: "Good",
    emoji: "🪑",
    image:
      "https://images.unsplash.com/photo-1503602642458-232111445657?w=800&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Hybrid Bicycle",
    category: "Cycles",
    price: 3200,
    location: "Muchipara",
    distance: "4.5 km away",
    posted: "3 days ago",
    ageHours: 72,
    condition: "Used",
    emoji: "🚲",
    image:
      "https://images.unsplash.com/photo-1541625602330-2277b4c461de?w=800&auto=format&fit=crop",
  },
  {
    id: 5,
    name: "Minimal Table Lamp",
    category: "Others",
    price: 350,
    location: "A-Zone",
    distance: "1.8 km away",
    posted: "4 hours ago",
    ageHours: 4,
    condition: "Like new",
    emoji: "💡",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop",
  },
];

const locations = [
  "All areas",
  ...new Set(products.map((product) => product.location)),
];

function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="product-clay">
      <div className="product-image">
        {imageFailed ? (
          <span className="text-7xl">{product.emoji}</span>
        ) : (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}

        <span className="condition-badge">
          {product.condition}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="product-category">
            {product.category}
          </span>
          <span className="text-xs text-[#A48D80]">
            {product.posted}
          </span>
        </div>

        <h3 className="mt-3 line-clamp-2 min-h-12 text-lg font-extrabold leading-snug">
          {product.name}
        </h3>

        <p className="mt-2 text-2xl font-black text-[#32231B]">
          ₹{product.price.toLocaleString("en-IN")}
        </p>

        <div className="mt-4 border-t border-[#F4E7DF] pt-3">
          <p className="text-sm font-semibold text-[#755F53]">
            📍 {product.location}
          </p>
          <p className="mt-1 text-xs text-[#A48D80]">
            {product.distance}
          </p>
        </div>
      </div>
    </article>
  );
}

function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All areas");
  const [sortBy, setSortBy] = useState("newest");
  const [showNotice, setShowNotice] = useState(false);

  const filteredProducts = products
    .filter((product) => {
      const matchesCategory =
        activeCategory === "All" ||
        product.category === activeCategory;

      const matchesSearch = [
        product.name,
        product.category,
        product.location,
        product.condition,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesLocation =
        location === "All areas" ||
        product.location === location;

      return matchesCategory && matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      if (sortBy === "low") return a.price - b.price;
      if (sortBy === "high") return b.price - a.price;
      return a.ageHours - b.ageHours;
    });

  function resetFilters() {
    setActiveCategory("All");
    setSearch("");
    setLocation("All areas");
    setSortBy("newest");
  }

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-[#342720]">
      {/* NAVBAR */}
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 md:px-10">
        <a href="#" className="flex items-center gap-3">
          <span className="logo-clay">↗</span>
          <span className="text-2xl font-black tracking-tight">
            dgp<span className="text-[#F4773D]">finds.</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#735C50] md:flex">
          <a href="#explore" className="hover:text-[#F4773D]">
            Explore marketplace
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-[#FFF0E5] px-4 py-3 text-sm font-semibold text-[#A65B36] sm:block">
            📍 Durgapur
          </span>
          <button
            onClick={() => setShowNotice(true)}
            className="orange-button text-sm"
          >
            + Sell an item
          </button>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-12 md:grid-cols-2 md:px-10 md:pt-20">
          <div>
            <span className="inline-flex rounded-full border border-[#F9D8C3] bg-white px-4 py-2 text-xs font-extrabold tracking-widest text-[#D66D39]">
              ✦ YOUR NEIGHBORHOOD MARKETPLACE
            </span>

            <h1 className="mt-7 text-5xl font-black leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl">
              Pre-loved stuff.
              <br />
              <span className="text-[#F4773D]">
                Fresh beginnings.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#806C60]">
              That old textbook, a cool desk lamp, or your next cycle.
              Discover amazing secondhand finds from people right here
              in Durgapur.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#explore" className="orange-button">
                Explore local finds ↗
              </a>
              <a href="#explore" className="white-button">
                Browse listings
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-5 text-sm font-medium text-[#8E7365]">
              <span>✳ Buy & sell locally</span>
              <span>✳ Give things a second life</span>
            </div>
          </div>

          <div className="hero-stage">
            <div className="hero-halo" />

            <div className="feature-clay">
              <div className="flex items-center justify-between text-xs font-extrabold tracking-widest text-[#A87556]">
                <span>THE LOCAL FINDS CLUB</span>
                <span className="text-xl text-[#F4773D]">✳</span>
              </div>

              <div className="item-spotlight">
                <span className="hero-emoji">🪑</span>
              </div>

              <h3 className="mt-5 text-xl font-extrabold">
                Good stuff, new stories.
              </h3>
              <p className="mt-1 text-sm text-[#917B6C]">
                Discover • Connect • Reuse
              </p>
            </div>

            <div className="floating-clay floating-top">
              ✨ Hidden gems nearby
            </div>
            <div className="floating-clay floating-bottom">
              🧡 Pre-loved, re-loved
            </div>
            <div className="side-item side-item-one">📚</div>
            <div className="side-item side-item-two">🎧</div>
          </div>
        </section>

        {/* EXPLORE MARKETPLACE */}
        <section
          id="explore"
          className="mx-auto max-w-7xl scroll-mt-8 px-5 pb-24 md:px-10"
        >
          <div className="mb-8">
            <span className="text-sm font-extrabold uppercase tracking-widest text-[#E47E4C]">
              THE LOCAL MARKET
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Explore marketplace<span className="text-[#F4773D]">.</span>
            </h2>
            <p className="mt-2 text-[#92796B]">
              A little bit of everything, right around your corner.
            </p>
          </div>

          <div className="grid gap-7 lg:grid-cols-[235px_minmax(0,1fr)]">
            {/* DESKTOP CATEGORY SIDEBAR */}
            <aside className="hidden lg:block">
              <div className="sidebar-clay sticky top-5 p-4">
                <h3 className="mb-4 px-3 text-sm font-black uppercase tracking-wider text-[#9C7963]">
                  Categories
                </h3>

                <div className="space-y-2">
                  {categories.map((category) => {
                    const count =
                      category.name === "All"
                        ? products.length
                        : products.filter(
                            (p) => p.category === category.name
                          ).length;

                    return (
                      <button
                        key={category.name}
                        onClick={() => setActiveCategory(category.name)}
                        aria-pressed={activeCategory === category.name}
                        className={`category-filter ${
                          activeCategory === category.name ? "active" : ""
                        }`}
                      >
                        <span className="text-xl">{category.icon}</span>
                        <span className="flex-1 text-left">
                          {category.name}
                        </span>
                        <span className="category-count">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-7 rounded-2xl bg-[#FFF0E4] p-4">
                  <span className="text-2xl">🧡</span>
                  <p className="mt-2 text-sm font-extrabold">
                    Shop small. Shop local.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#947362]">
                    Find good things from people in your own city.
                  </p>
                </div>
              </div>
            </aside>

            {/* LISTING AREA */}
            <div className="min-w-0">
              {/* LARGE SEARCH BOX */}
              <div className="search-clay flex items-center gap-3 px-5 py-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C08260"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search books, cycles, electronics, furniture..."
                  aria-label="Search marketplace listings"
                  className="min-w-0 flex-1 bg-transparent text-base font-medium text-[#503D31] outline-none placeholder:text-[#B39A8D]"
                />

                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-sm font-bold text-[#D47B48]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* MOBILE CATEGORIES */}
              <div className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:hidden">
                {categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => setActiveCategory(category.name)}
                    aria-pressed={activeCategory === category.name}
                    className={`mobile-category ${
                      activeCategory === category.name ? "active" : ""
                    }`}
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>

              {/* FILTERS */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">
                    Fresh finds near you
                  </h3>
                  <p className="mt-1 text-sm text-[#9B8172]">
                    {filteredProducts.length}{" "}
                    {filteredProducts.length === 1 ? "listing" : "listings"} found
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    aria-label="Filter by locality"
                    className="filter-select"
                  >
                    {locations.map((area) => (
                      <option key={area} value={area}>
                        {area === "All areas" ? "📍 All areas" : area}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort listings"
                    className="filter-select"
                  >
                    <option value="newest">Newest first</option>
                    <option value="low">Price: Low to High</option>
                    <option value="high">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* PRODUCT GRID */}
              {filteredProducts.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] bg-white p-12 text-center shadow-sm">
                  <div className="text-5xl">🔎</div>
                  <h3 className="mt-4 text-xl font-black">
                    No listings found
                  </h3>
                  <p className="mt-2 text-[#9B8172]">
                    Try another search or change your filters.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="orange-button mt-6"
                  >
                    Reset filters
                  </button>
                </div>
              )}

              <p className="mt-7 text-center text-xs text-[#AC968A]">
                Sample listings for UI testing. Locations, distances,
                and posting times are illustrative.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* TEMPORARY SELL BUTTON MESSAGE */}
      {showNotice && (
        <div
          role="status"
          className="fixed bottom-6 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-[#342720] p-4 text-sm text-white shadow-xl"
        >
          <span>Seller registration is coming in our next phase!</span>
          <button
            onClick={() => setShowNotice(false)}
            aria-label="Dismiss notification"
            className="text-xl"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
