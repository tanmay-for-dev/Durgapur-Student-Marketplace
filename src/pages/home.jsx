import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AuthPrompt from "../components/AuthPrompt.jsx";
import ProfileShortcut from "../components/ProfileShortcut.jsx";
import HomeHeroV2 from "../components/HomeHeroV2.jsx";
import HomePreviewV2 from "../components/HomePreviewV2.jsx";
import { getHomepageListings } from "../services/listings.js";

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getHomepageListings(3)
      .then((products) => { if (active) setFeatured(products); })
      .catch(() => { if (active) setFeatured([]); })
      .finally(() => { if (active) setFeaturedLoading(false); });
    return () => { active = false; };
  }, []);

  function handleSellClick() {
    if (loading) return;
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    navigate("/sell");
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#30372C]" style={{ fontFamily: "'Nunito Sans', 'Segoe UI', sans-serif" }}>
      <div className="bg-[#2E372B] px-4 py-2 text-center text-[11px] font-black tracking-wide text-[#FFF5E5]">
        ✳ Made for Durgapur's student community <span className="mx-2 text-[#B7C79F]">·</span> Good things deserve a second story
      </div>
      <header className="sticky top-0 z-30 border-b border-[#EDE1D1] bg-[#FFF9F2]/95 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-[1360px] items-center gap-3 px-5 py-4 md:px-10">
          <Link to="/" aria-label="DGP Finds home" className="flex shrink-0 items-center gap-2.5 no-underline text-[#30372C]">
            <span className="grid h-10 w-10 -rotate-[7deg] place-items-center rounded-[13px] bg-[#F5794D] text-2xl font-black text-white shadow-[3px_4px_0_#30392D]">✳</span>
            <span className="text-[23px] font-black tracking-[-1.4px] sm:text-[27px]">dgp<span className="text-[#F5794D]">finds</span></span>
          </Link>
          <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-center xl:block">
            <p className="text-sm font-black tracking-[.02em]">Durgapur Student Marketplace</p>
            <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-[.19em] text-[#B67F5F]">Find it · Love it · Pass it on</p>
          </div>
          <div className="flex-1" />
          <Link to="/marketplace" className="hidden rounded-full px-3 py-2 text-sm font-black text-[#545C4D] hover:text-[#EB7650] md:inline-flex">Browse</Link>
          <ProfileShortcut />
          <button onClick={handleSellClick} disabled={loading} className="shrink-0 rounded-full bg-[#F5794D] px-4 py-2.5 text-xs font-black text-white shadow-[3px_3px_0_#30392D] transition hover:-translate-y-0.5 disabled:opacity-60 sm:px-5 sm:py-3 sm:text-sm">
            <span className="sm:hidden">＋ Sell</span><span className="hidden sm:inline">＋ Sell something ↗</span>
          </button>
        </div>
      </header>

      <main>
        <div className="px-5 pt-5 text-center text-[11px] font-black uppercase tracking-[.16em] text-[#7D6F61] xl:hidden">Durgapur Student Marketplace</div>
        <HomeHeroV2 products={featured} productsLoading={featuredLoading} onSell={handleSellClick} />
        <div className="border-y border-[#D6E2C2] bg-[#E4EED3] px-4 py-4">
          <div className="mx-auto flex max-w-[1360px] flex-wrap justify-center gap-x-9 gap-y-3 text-center text-[11px] font-black uppercase tracking-[.11em] text-[#4C5D43] md:justify-between md:text-xs">
            <span>✳ Find it nearby</span><span>✳ Save some money</span><span>✳ Pass it forward</span><span>✳ Keep good things going</span>
          </div>
        </div>
        <HomePreviewV2 onSell={handleSellClick} />
        <section className="bg-[#F5E8D9] px-5 py-19 md:px-10">
          <div className="mx-auto max-w-[1360px]">
            <span className="text-[11px] font-black uppercase tracking-[.2em] text-[#D57850]">02 / HOW IT WORKS</span>
            <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <h2 className="max-w-[540px] text-4xl font-black leading-[1.08] tracking-[-.055em] md:text-[56px]">Good things go around. <span className="text-[#EE784F]">↗</span></h2>
              <p className="max-w-[480px] text-sm font-semibold leading-7 text-[#827365] md:text-base">A book that got you through finals. A desk setup ready for its next chapter. Someone nearby could love it next.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                { number: "01", icon: "🔎", title: "Spot a find", body: "Explore real preloved items around Durgapur." },
                { number: "02", icon: "💬", title: "Say hello", body: "Contact the seller using the available contact options." },
                { number: "03", icon: "🤝", title: "Make it yours", body: "Arrange a safe handoff and give good things a new story." },
              ].map((step) => <div key={step.number} className="rounded-[28px] border border-[#EAD9C9] bg-[#FFF9F2] p-7 shadow-[4px_6px_0_#EBD2BF]"><div className="flex items-center justify-between"><span className="text-5xl">{step.icon}</span><span className="text-sm font-black text-[#EE875D]">{step.number}</span></div><h3 className="mt-7 text-xl font-black">{step.title}</h3><p className="mt-2 text-sm font-semibold leading-6 text-[#8B7D6E]">{step.body}</p></div>)}
            </div>
          </div>
        </section>
        <section className="px-5 py-14 md:px-10">
          <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-5 rounded-[32px] bg-[#DCEACA] px-7 py-10 md:flex-row md:items-center md:px-12">
            <div><span className="text-[11px] font-black uppercase tracking-[.17em] text-[#65804F]">FOR THE SERIAL DECLUTTERERS</span><h2 className="mt-2 text-2xl font-black tracking-[-1px] md:text-3xl">Your stuff deserves a second act. ✳</h2><p className="mt-2 text-sm font-semibold text-[#67765D]">Make space in your room. Make someone's day.</p></div>
            <button type="button" onClick={handleSellClick} className="shrink-0 rounded-full bg-[#30392D] px-7 py-3.5 text-sm font-black text-white">List something ↗</button>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#EBE1D6] px-5 py-9 md:px-10"><div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left"><Link to="/" className="text-xl font-black tracking-[-1px] text-[#30372C] no-underline">dgp<span className="text-[#F5794D]">finds</span> ✳</Link><span className="text-xs font-semibold text-[#8C857A]">Good stuff. Good people. Durgapur, always. © 2026 DGP Finds</span></div></footer>
      <AuthPrompt open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} action="sell" returnTo="/sell" />
    </div>
  );
}
