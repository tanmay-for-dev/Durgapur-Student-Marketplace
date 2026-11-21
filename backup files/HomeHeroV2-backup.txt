import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./HomeHeroV2.css";

const slides = [
  {
    eyebrow: "MADE FOR DURGAPUR'S STUDENTS",
    lines: ["Durgapur's own", "second-hand", "marketplace."],
    highlighted: 1,
    description: "A marketplace built for students across Durgapur. Buy and sell pre-loved books, gadgets, furniture, and everyday essentials with fellow students nearby.",
  },
  {
    eyebrow: "GOOD THINGS GO AROUND",
    lines: ["Your old stuff.", "Someone's", "new favorite."],
    highlighted: 1,
    description: "That book you finished, the lamp you replaced, the things you no longer need — they could be exactly what another student is looking for.",
  },
  {
    eyebrow: "RIGHT AROUND THE CORNER",
    lines: ["Good finds live", "closer than", "you think."],
    highlighted: 1,
    description: "From college essentials to everyday favorites, discover useful second-hand finds around Durgapur without having to search far.",
  },
];

function SpotlightCard({ product, pending }) {
  const [failed, setFailed] = useState(false);

  if (!product) {
    return (
      <div className="flex h-full flex-col justify-between bg-[#F8D6BC] p-5 sm:p-6">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[.1em] text-[#865D41]">
          <span>THE LOCAL FINDS CLUB</span>
          <span className="text-lg">✳</span>
        </div>
        <div className="relative grid flex-1 place-items-center">
          <div className="grid h-[74%] w-[80%] place-items-center rounded-[24px] border-2 border-dashed border-[#C68F6B] bg-[#FFF1E0]/70">
            <span className="text-[64px] sm:text-[90px]">📦</span>
          </div>
          <span className="absolute -right-1 top-[12%] rotate-[11deg] rounded-xl bg-[#D9EDAE] px-3 py-2 text-[11px] font-black text-[#46513B] shadow-sm">📚 · 🎧 · 🚲</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-1 text-[#394133]">
          <p className="text-sm font-black sm:text-lg">{pending ? "Looking for local finds..." : "Your first find could be here"}</p>
          <span className="text-xs font-black text-[#8D704F]">✦ DGP Finds</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#E7DACB]">
      <div className="relative min-h-0 flex-1 p-2.5 sm:p-3">
        {!failed && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setFailed(true)}
            className="h-full w-full rounded-[23px] object-cover sm:rounded-[29px]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center rounded-[23px] bg-[#F9EBDD] text-[76px]">📦</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-2 sm:px-5">
        <span className="min-w-0 truncate text-xs font-black text-[#343B2F] sm:text-sm">{product.name}</span>
        <span className="shrink-0 rounded-full bg-[#FFFDF5] px-3 py-1.5 text-xs font-black text-[#E6754B] sm:text-sm">
          ₹{Number(product.price).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

export default function HomeHeroV2({ products, productsLoading, onSell }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    if (media.addEventListener) {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 6800);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  const slide = slides[active];
  const product = products[active] ?? null;
  const go = (step) => setActive((index) => (index + step + slides.length) % slides.length);
  const jump = () => document.getElementById("discover")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });

  return (
    <section
      className="relative isolate overflow-hidden border-b border-[#EFDCC7] bg-[#FFF3E3]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      aria-label="Welcome to DGP Finds"
    >
      <div className="pointer-events-none absolute -right-20 -top-28 h-[450px] w-[450px] rounded-full bg-[#FFE4BB] opacity-65 blur-3xl" />
      <div className="pointer-events-none absolute left-[7%] top-[23%] h-[230px] w-[230px] rounded-full bg-[#FCE0C6] opacity-80 blur-3xl" />
      <div className="mx-auto grid max-w-[1360px] items-center gap-6 px-5 pb-12 pt-9 md:grid-cols-[.97fr_1.03fr] md:gap-14 md:px-10 md:pb-19 md:pt-15 lg:min-h-[620px]">
        <div className="order-2 relative mx-auto h-[285px] w-full max-w-[490px] sm:h-[420px] lg:h-[480px]">
          <div className="absolute left-[8%] top-[12%] h-[75%] w-[78%] -rotate-[11deg] rounded-[32px] border-[3px] border-[#374032] bg-[#DFE8BC]" />
          <div className="absolute left-[17%] top-[10%] h-[78%] w-[74%] rotate-[9deg] rounded-[34px] border-[3px] border-[#374032] bg-[#F2C5AA]" />
          <div key={`spot-${active}-${product?.id ?? "empty"}`} className="dgp-hero-card-in absolute left-[13%] top-[5%] h-[82%] w-[75%] -rotate-[5deg] overflow-hidden rounded-[31px] border-[3px] border-[#374032] shadow-[9px_12px_0_#C8CCA3] sm:rounded-[38px]">
            {product ? (
              <Link to={`/product/${product.id}`} aria-label={`View ${product.name}`} className="block h-full">
                <SpotlightCard key={product.id} product={product} pending={false} />
              </Link>
            ) : (
              <SpotlightCard product={null} pending={productsLoading} />
            )}
          </div>
          <span className="dgp-chip-in-left absolute bottom-[6%] left-0 -rotate-[8deg] rounded-xl border-2 border-[#394133] bg-[#FFFDF6] px-3 py-2.5 text-xs font-black text-[#394133] shadow-[3px_4px_0_#394133] sm:text-sm">
            📍 {product?.location ?? "Durgapur"}
          </span>
          <span className="dgp-chip-in-right absolute right-[-1%] top-[13%] rotate-[8deg] rounded-xl border-2 border-[#394133] bg-[#D9EDAB] px-3 py-2.5 text-xs font-black text-[#394133] shadow-[3px_4px_0_#394133] sm:text-sm">
            ✳ {product?.category ?? "Made for students"}
          </span>
          <span className="absolute bottom-[14%] right-[-1%] rotate-[6deg] rounded-xl border-2 border-[#394133] bg-[#FFE6A8] px-3 py-2 text-[10px] font-black tracking-wide text-[#394133] shadow-[3px_4px_0_#394133] sm:text-xs">
            PRELOVED, RELOVED
          </span>
          <span aria-hidden="true" className="absolute left-[-1%] top-[21%] -rotate-[18deg] text-[45px] text-[#EE754B]">✳</span>
        </div>
        <div className="order-1 relative z-10 flex min-w-0 flex-col items-start">
          <span className="mb-6 inline-flex -rotate-2 items-center gap-2 rounded-full border border-[#DFC4A3] bg-[#FFFDF7] px-4 py-2 text-[10px] font-black uppercase tracking-[1.3px] text-[#906D4C] shadow-[2px_3px_0_#ECD6B6] sm:text-xs">
            ☀️ <span key={`eyebrow-${active}`} className="dgp-hero-text-in">{slide.eyebrow}</span>
          </span>
          <div key={`slide-${active}`} className="dgp-hero-text-in w-full">
            <h1 className={`max-w-[680px] font-black leading-[1.035] tracking-[-.065em] text-[#30372C] ${active === 0 ? "text-[clamp(36px,4.6vw,68px)]" : "text-[clamp(42px,5.3vw,80px)]"}`}>
              {slide.lines.map((line, index) => (
                <span key={line} className={`block ${index === slide.highlighted ? "text-[#EF754B]" : ""}`}>{line}</span>
              ))}
            </h1>
            <p className="mt-7 max-w-[485px] text-[15px] font-semibold leading-[1.8] text-[#6C6D60] sm:text-[17px]">
              {slide.description}
            </p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={jump} className="rounded-full bg-[#30392D] px-6 py-3.5 text-sm font-black text-white shadow-[4px_5px_0_#E5C4A2] transition hover:-translate-y-0.5">
              Explore local finds ↗
            </button>
            <button type="button" onClick={onSell} className="rounded-full border-2 border-[#30392D] bg-transparent px-6 py-3 text-sm font-black text-[#30392D] transition hover:bg-white/70">
              ＋ Sell something
            </button>
          </div>
          <div className="mt-10 flex w-full max-w-[475px] items-center gap-4">
            <button type="button" onClick={() => go(-1)} aria-label="Previous welcome slide" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#DDD0BE] bg-white text-xl font-black text-[#353C30] transition hover:border-[#E97751]">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Next welcome slide" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#DDD0BE] bg-white text-xl font-black text-[#353C30] transition hover:border-[#E97751]">›</button>
            <div className="flex flex-1 items-center gap-2" role="group" aria-label="Choose welcome slide">
              {slides.map((item, index) => (
                <button
                  key={item.eyebrow}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={active === index ? "true" : undefined}
                  onClick={() => setActive(index)}
                  className={`h-2.5 flex-1 rounded-full transition ${active === index ? "bg-[#F0764E]" : "bg-[#E7D7C3]"}`}
                />
              ))}
            </div>
            <span className="text-xs font-black tabular-nums text-[#807465]">0{active + 1} / 0{slides.length}</span>
          </div>
          <p className="mt-3 text-xs font-semibold text-[#998778]">Your corner of Durgapur, online.</p>
        </div>
      </div>
    </section>
  );
}
