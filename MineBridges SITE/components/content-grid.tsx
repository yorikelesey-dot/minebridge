'use client';

import { motion } from 'framer-motion';
import { ContentItem } from '@/lib/types';
import { ContentCard } from '@/components/content-card';
import { SkeletonGrid } from '@/components/skeleton-grid';

interface ContentGridProps {
  items: ContentItem[];
  isLoading: boolean;
  onItemClick?: (item: ContentItem) => void;
}

export function ContentGrid({ items, isLoading, onItemClick }: ContentGridProps) {
  // Display skeleton grid when loading
  if (isLoading) {
    return <SkeletonGrid />;
  }

  // Display message when no items found
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-zinc-400 text-lg mb-2">No results found</div>
        <p className="text-zinc-500 text-sm">
          Try different search terms or adjust your filters
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <motion.div
          key={`${item.source}-${item.id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <ContentCard
            item={item}
            onClick={() => onItemClick?.(item)}
          />
        </motion.div>
      ))}
    </div>
  );
}
