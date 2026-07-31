const LEVELS: Record<string, { label: string; classes: string }> = {
  community: { label: "Community Review", classes: "bg-stone-100 text-stone-600" },
  verified: { label: "Verified Experience", classes: "bg-primary-100 text-primary-700" },
  trusted: { label: "Trusted Reviewer", classes: "bg-gold-100 text-gold-600" },
};

export default function VerificationBadge({ level }: { level: string }) {
  const info = LEVELS[level] ?? LEVELS.community;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${info.classes}`}
    >
      {level !== "community" && <span className="mr-1">✓</span>}
      {info.label}
    </span>
  );
}
