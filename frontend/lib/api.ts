export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

/** Empty when Google sign-in isn't configured — callers should hide the button. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  allows_photos: boolean;
  listing_count?: number;
}

export interface AreaInfo {
  name: string;
  district: string;
  region: string;
}

export interface Listing {
  id: number;
  name: string;
  slug: string;
  description: string;
  address: string;
  is_claimed: boolean;
  created_at: string;
  category: Category;
  area: AreaInfo;
  average_rating: number | null;
  review_count: number;
}

export interface ReviewPhoto {
  id: number;
  image: string;
  caption: string;
}

export interface ReviewReply {
  id: number;
  review: number;
  body: string;
  reviewer: string;
  created_at: string;
}

export interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  verification_level: "community" | "verified" | "trusted";
  created_at: string;
  reviewer: string;
  reviewer_badges: { name: string; icon: string }[];
  photos: ReviewPhoto[];
  owner_response: { id: number; body: string; created_at: string } | null;
  listing: { name: string; slug: string };
  has_evidence: boolean;
  replies: ReviewReply[];
  upvotes: number;
  downvotes: number;
  my_vote: "up" | "down" | null;
  reported_by_me: boolean;
  can_reply_unlimited: boolean;
  reply_limit: number;
}

export interface District {
  id: number;
  name: string;
  slug: string;
}

export interface AreaOption {
  id: number;
  name: string;
  slug: string;
}

export interface Region {
  id: number;
  name: string;
  slug: string;
  districts: District[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ListingRequest {
  id: number;
  name: string;
  description: string;
  address: string;
  category: Category;
  location: { region: string; district: string; area: string };
  status: "pending" | "approved" | "rejected";
  admin_note: string;
  created_at: string;
  requester_email?: string;
}

export function mediaUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_URL.replace(/\/api$/, "")}${path}`;
}
