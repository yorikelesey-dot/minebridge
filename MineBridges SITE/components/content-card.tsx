'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ContentItem } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ContentCardProps {
  item: ContentItem;
  onClick?: () => void;
}

export function ContentCard({ item, onClick }: ContentCardProps) {
  // Format download count for display (e.g., 1.2M, 45.3K)
  const formatDownloads = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Link href={`/item/${item.id}?source=${item.source}`}>
      <Card
        className="bg-zinc-950 border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden group"
        onClick={onClick}
      >
        <div className="p-4">
          {/* Icon and Source Badge */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900">
              <Image
                src={item.iconUrl}
                alt={`${item.title} icon`}
                width={64}
                height={64}
                className="object-cover"
                unoptimized={item.iconUrl.startsWith('http')}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-lg line-clamp-2 group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                by {item.author}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-300 line-clamp-2 mb-3">
            {item.description}
          </p>

          {/* Footer: Downloads and Source Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-zinc-400 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>{formatDownloads(item.downloadCount)}</span>
            </div>

            <Badge
              className="flex items-center gap-1.5 border-white/10 bg-zinc-900/50 text-zinc-300"
            >
              {item.source === 'modrinth' ? (
                <>
                  <Image
                    src="/icons/modrinth.svg"
                    alt="Modrinth"
                    width={14}
                    height={14}
                    className="text-emerald-500"
                  />
                  <span>Modrinth</span>
                </>
              ) : (
                <>
                  <Image
                    src="/icons/curseforge.svg"
                    alt="CurseForge"
                    width={14}
                    height={14}
                    className="text-orange-500"
                  />
                  <span>CurseForge</span>
                </>
              )}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
