'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ContentItem } from '@/lib/types';
import { ContentDescription } from '@/components/content-description';
import { VersionSelector } from '@/components/version-selector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ItemDetailPageProps {
  params: {
    id: string;
  };
}

interface ItemDetailData {
  item: ContentItem;
  gallery: Array<{ url: string; title?: string }>;
  body: string;
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const searchParams = useSearchParams();
  const source = searchParams.get('source') as 'modrinth' | 'curseforge' | null;
  
  const [data, setData] = useState<ItemDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItemDetail() {
      if (!source) {
        setError('Missing source parameter');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/item/${params.id}?source=${source}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch item details');
        }

        const itemData = await response.json();
        setData(itemData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchItemDetail();
  }, [params.id, source]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format download count
  const formatDownloads = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="h-8 w-32 bg-zinc-900 animate-pulse rounded" />
            <div className="h-32 bg-zinc-900 animate-pulse rounded-lg" />
            <div className="h-64 bg-zinc-900 animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Item</h2>
              <p className="text-zinc-300">{error || 'Item not found'}</p>
              <Link href="/">
                <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { item, gallery, body } = data;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Back Button */}
          <Link href="/">
            <Button className="text-zinc-400 hover:text-white bg-transparent hover:bg-zinc-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Search
            </Button>
          </Link>

          {/* Header Section */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Icon */}
              <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900">
                <Image
                  src={item.iconUrl}
                  alt={`${item.title} icon`}
                  width={128}
                  height={128}
                  className="object-cover"
                  unoptimized={item.iconUrl.startsWith('http')}
                />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{item.title}</h1>
                  <p className="text-lg text-zinc-400">by {item.author}</p>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-zinc-400"
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
                    <span className="text-white font-semibold">
                      {formatDownloads(item.downloadCount)}
                    </span>
                    <span className="text-zinc-400">downloads</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-zinc-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-zinc-400">Updated {formatDate(item.lastUpdated)}</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 capitalize">
                    {item.category}
                  </Badge>
                  <Badge className="flex items-center gap-1.5 border-white/10 bg-zinc-900 text-zinc-300">
                    {item.source === 'modrinth' ? (
                      <>
                        <Image
                          src="/icons/modrinth.svg"
                          alt="Modrinth"
                          width={14}
                          height={14}
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
                        />
                        <span>CurseForge</span>
                      </>
                    )}
                  </Badge>
                </div>

                {/* External Link */}
                <div>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>View on {item.source === 'modrinth' ? 'Modrinth' : 'CurseForge'}</span>
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Description and Gallery */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">About</h2>
                <ContentDescription html={body} />
              </div>

              {/* Gallery/Screenshots */}
              {gallery && gallery.length > 0 && (
                <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Screenshots</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gallery.map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900"
                      >
                        <Image
                          src={image.url}
                          alt={image.title || `Screenshot ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Version Selector */}
            <div className="lg:col-span-1">
              <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-white mb-4">Download</h2>
                <VersionSelector
                  itemId={params.id}
                  source={item.source}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
