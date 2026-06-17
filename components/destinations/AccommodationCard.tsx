import type { Accommodation } from "@/types";

interface Props {
  accommodation: Accommodation;
  destSlug: string;
  subSlug: string;
  typLabel: string;
}

export default function AccommodationCard({ accommodation, typLabel }: Props) {
  return (
    <div className="bg-[#161616] border border-[#1e1a10] rounded-xl p-4">
      <div className="flex items-start gap-3">
        {accommodation.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={accommodation.cover_url} alt={accommodation.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-[#1a1500] border border-[#2a2010] flex items-center justify-center text-2xl flex-shrink-0">
            🏕️
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-[#d4b870]">{accommodation.name}</h3>
          <span className="text-[10px] bg-[#1e1800] text-[#c9a84c] border border-[#c9a84c30] rounded px-1.5 py-0.5 mt-1 inline-block">
            {typLabel}
          </span>
          {accommodation.description && (
            <p className="text-xs text-[#7a6a4a] mt-2 line-clamp-3">{accommodation.description}</p>
          )}
          {accommodation.website_url && (
            <a
              href={accommodation.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#c9a84c] hover:text-[#e0bc60] mt-2 inline-block transition-colors"
            >
              Visit website ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
