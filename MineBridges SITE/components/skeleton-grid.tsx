import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface SkeletonGridProps {
  count?: number;
}

export function SkeletonGrid({ count = 6 }: SkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="bg-zinc-950 border-white/10 overflow-hidden"
        >
          <div className="p-4">
            {/* Icon and Title Section */}
            <div className="flex items-start gap-3 mb-3">
              <Skeleton className="w-16 h-16 flex-shrink-0 rounded-lg bg-zinc-900" />
              
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-3/4 bg-zinc-900" />
                <Skeleton className="h-4 w-1/2 bg-zinc-900" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 mb-3">
              <Skeleton className="h-4 w-full bg-zinc-900" />
              <Skeleton className="h-4 w-5/6 bg-zinc-900" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16 bg-zinc-900" />
              <Skeleton className="h-6 w-24 rounded-full bg-zinc-900" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
