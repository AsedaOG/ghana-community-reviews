import Link from "next/link";

/**
 * The Star Gate mark: a gateway arch (84×88) with Ghana's five-point star
 * knocked out of it. Star is always Harmattan Gold; the gate flips between
 * Canopy Green (light grounds) and white (dark grounds) — see brand identity
 * guidelines §03–04.
 */
export default function Logo({
  variant = "light",
  iconOnly = false,
  href,
  className = "",
  iconClassName = "h-9 w-9",
  textClassName = "text-sm",
}: {
  variant?: "light" | "dark";
  iconOnly?: boolean;
  href?: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  const gateFill = variant === "dark" ? "#FFFFFF" : "#1D3E26";
  const nameColor = variant === "dark" ? "text-white" : "text-stone-900";
  const reviewsColor = variant === "dark" ? "text-gold-400" : "text-gold-600";

  const mark = (
    <span className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 84 88" className={iconClassName} aria-hidden="true">
        <path
          d="M4.0,88.0 A4.0,4.0 0 0 1 0,84.0 L0,42.0 A42.0,42.0 0 0 1 84.0,42.0 L84.0,84.0 A4.0,4.0 0 0 1 80.0,88.0 Z"
          fill={gateFill}
        />
        <path
          d="M42.000,20.000 L47.613,37.274 L65.776,37.275 L51.083,47.951 L56.695,65.225 L42.000,54.550 L27.305,65.225 L32.917,47.951 L18.224,37.275 L36.387,37.274 Z"
          fill="#E9C260"
        />
      </svg>
      {!iconOnly && (
        <span className={`font-display font-extrabold leading-tight tracking-tight ${textClassName}`}>
          <span className={`block ${nameColor}`}>Ghana Community</span>
          <span className={`block ${reviewsColor}`}>Reviews</span>
        </span>
      )}
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex items-center" aria-label="Ghana Community Reviews home">
      {mark}
    </Link>
  );
}
