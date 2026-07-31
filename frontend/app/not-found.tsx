import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Page not found</h1>
      <p className="mt-2 text-sm text-stone-500">
        That listing or page doesn&apos;t exist (yet).
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Back home
      </Link>
    </div>
  );
}
