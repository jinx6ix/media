import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 opacity-20">📷</div>
        <h1 className="text-xl font-medium text-[#c9a84c] mb-2">
          Page not found
        </h1>
        <p className="text-sm text-[#5a4a2a] mb-6">
          This gallery link may have been changed or the album made private.
        </p>
        <Link
          href="/"
          className="border border-[#2a2010] text-[#a09070] hover:text-[#c9a84c] hover:border-[#c9a84c40] rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
