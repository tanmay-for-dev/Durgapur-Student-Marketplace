
import { Link } from "react-router-dom";
import logoIcon from "../assets/brand/dgp-logo-icon.png";

export default function BrandLogo() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 no-underline"
      aria-label="DGP Finds home"
    >
      <img
        src={logoIcon}
        alt=""
        className="h-11 w-11 object-contain"
      />

      <span className="whitespace-nowrap text-[27px] font-black leading-none tracking-[-0.07em] text-[#29382A]">
        dgp<span className="text-[#F47750]">finds</span>
      </span>
    </Link>
  );
}
