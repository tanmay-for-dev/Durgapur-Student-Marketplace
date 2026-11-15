import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { products } from "../data/products.js";

export default function ProductDetails() {
  const { id } = useParams();

  const product = products.find((item) => String(item.id) === id);

  const [activeTab, setActiveTab] = useState("contact");
  const [saved, setSaved] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (item) =>
          item.id !== product.id &&
          (item.category === product.category || item.location === product.location)
      )
      .slice(0, 3);
  }, [product]);

  function handleFavorite() {
    setSaved((prev) => !prev);
    alert(!saved ? "Saved to favorites" : "Removed from favorites");
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#FFF9F5] px-5 py-12 text-[#342720]">
        <div className="mx-auto max-w-3xl rounded-[30px] bg-white p-10 text-center shadow-lg">
          <div className="text-5xl">😕</div>
          <h1 className="mt-4 text-3xl font-black">Product not found</h1>
          <p className="mt-2 text-[#8A7367]">
            This listing may have been removed or the link may be incorrect.
          </p>
          <Link to="/" className="orange-button mt-6 inline-flex">
            Back to marketplace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF9F5] px-4 py-6 text-[#342720] md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        {/* top back */}
        <div className="mb-5">
          <Link to="/#explore" className="back-pill">
            ← Back to marketplace
          </Link>
        </div>

        {/* main product section */}
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* image side */}
          <div className="product-showcase">
            <button
              type="button"
              onClick={handleFavorite}
              className={`favorite-float ${saved ? "active" : ""}`}
              aria-label={saved ? "Remove from favorites" : "Save to favorites"}
            >
              ★
            </button>

            <div className="product-main-image">
              {imageFailed ? (
                <div className="flex h-full w-full items-center justify-center text-8xl">
                  {product.emoji}
                </div>
              ) : (
                <img
                  src={product.image}
                  alt={product.name}
                  onError={() => setImageFailed(true)}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="mt-4 rounded-[24px] bg-white/80 p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <span className="detail-chip">{product.category}</span>
                <span className="detail-chip">{product.condition}</span>
                <span className="detail-chip">Secondhand</span>
              </div>
            </div>
          </div>

          {/* info side */}
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

                <div className="text-right">
                  <p className="text-sm font-semibold text-[#7B6356]">
                    by{" "}
                    <span className="font-black text-[#342720]">
                      @{product.username}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-[#A48D80]">{product.posted}</p>
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
                    Distance
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-[#46342A]">
                    ~ {product.distance}
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <h2 className="text-lg font-black">Product details</h2>
                <p className="mt-3 leading-7 text-[#7D675B]">
                  {product.description}
                </p>
              </div>

              {/* tabs */}
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
                          Choose a contact method below to discuss availability,
                          product condition, or meetup timing.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <a
                          href={product.whatsapp}
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

                        <a
                          href={`tel:${product.phone.replace(/\s+/g, "")}`}
                          className="contact-action"
                        >
                          <span className="text-xl">📞</span>
                          <div>
                            <p className="font-extrabold">Call Owner</p>
                            <p className="text-xs text-[#6F655F]">{product.phone}</p>
                          </div>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="location-card">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#A68573]">
                          Exact area
                        </p>
                        <p className="mt-2 text-base font-extrabold text-[#43332A]">
                          {product.exactLocation}
                        </p>
                      </div>

                      <div className="location-card">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#A68573]">
                          Can travel to
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {product.canTravelTo?.length ? (
                            product.canTravelTo.map((place) => (
                              <span key={place} className="travel-chip">
                                {place}
                              </span>
                            ))
                          ) : (
                            <span className="travel-chip">Cannot travel</span>
                          )}
                        </div>

                        <p className="mt-4 text-sm text-[#7D675B]">
                          {product.travelNote || "Meetup details can be discussed with the seller."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* related items */}
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
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="product-category">{item.category}</span>
                    <span className="text-xs text-[#A48D80]">{item.posted}</span>
                  </div>

                  <h3 className="mt-3 text-lg font-black leading-snug">
                    {item.name}
                  </h3>

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
      </div>
    </main>
  );
}