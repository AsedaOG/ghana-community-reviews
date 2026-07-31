export default function RatingStars({
  rating,
  size = "text-base",
}: {
  rating: number | null;
  size?: string;
}) {
  if (rating == null) {
    return <span className="text-sm text-stone-400">No ratings yet</span>;
  }
  const rounded = Math.round(rating);
  return (
    <span className={`inline-flex items-center gap-1 ${size}`}>
      <span aria-hidden className="tracking-tight">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= rounded ? "text-gold-500" : "text-stone-300"}>
            ★
          </span>
        ))}
      </span>
      <span className="text-sm font-medium text-stone-600">{rating.toFixed(1)}</span>
    </span>
  );
}
