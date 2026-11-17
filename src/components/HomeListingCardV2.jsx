import { useState } from "react";
import { Link } from "react-router-dom";

export default function HomeListingCardV2({ product }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link to={`/product/${product.id}`} className="group block min-w-0 text-inherit no-underline">
      <article className="h-full">
        <div className="relative aspect-[1.12/1] overflow-hidden rounded-[20px] bg-[#EDE1D3] sm:rounded-[26px]">
          {!imageFailed && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.045]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-6xl" aria-label="Product photo not available">
              📦
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-[#FFFDF6]/95 px-3 py-1.5 text-[10px] font-black text-[#44503E] shadow-sm sm:text-xs">
            {product.condition}
          </span>
        </div>
        <div className="flex min-w-0 items-start justify-between gap-2 pt-3 sm:pt-4">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#B47B56]">
              {product.category}
            </span>
            <h3 className="mt-1 line-clamp-2 text-sm font-black leading-snug tracking-[-0.3px] text-[#30372C] sm:text-[17px]">
              {product.name}
            </h3>
            <p className="mt-1.5 text-[11px] font-semibold text-[#8A867A] sm:text-xs">
              📍 {product.location} · {product.posted}
            </p>
          </div>
          <strong className="shrink-0 text-sm font-black text-[#E6754B] sm:text-lg">
            ₹{Number(product.price).toLocaleString("en-IN")}
          </strong>
        </div>
      </article>
    </Link>
  );
}
