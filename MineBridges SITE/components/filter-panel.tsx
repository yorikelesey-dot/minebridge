'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FilterPanelProps {
  selectedCategory?: string;
  selectedSort?: string;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
}

const categories = [
  { value: 'mod', label: 'Mod' },
  { value: 'plugin', label: 'Plugin' },
  { value: 'shader', label: 'Shader' },
  { value: 'resourcepack', label: 'Resource Pack' },
] as const;

const sortOptions = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'latest', label: 'Latest' },
  { value: 'followed', label: 'Followed' },
] as const;

export function FilterPanel({
  selectedCategory,
  selectedSort,
  onCategoryChange,
  onSortChange,
}: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateURLParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    router.push(`?${params.toString()}`);
  };

  const handleCategoryClick = (category: string) => {
    const newCategory = selectedCategory === category ? '' : category;
    onCategoryChange(newCategory);
    updateURLParams('category', newCategory);
  };

  const handleSortClick = (sort: string) => {
    const newSort = selectedSort === sort ? '' : sort;
    onSortChange(newSort);
    updateURLParams('sort', newSort);
  };

  return (
    <Card className="p-6 bg-zinc-950 border-white/10">
      <div className="space-y-6">
        {/* Category Filter Section */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Category
          </h3>
          <div className="flex flex-col gap-2">
            {categories.map((category) => {
              const isActive = selectedCategory === category.value;
              const buttonVariant = isActive ? 'default' : 'outline';
              return (
                <Button
                  key={category.value}
                  // @ts-expect-error - Button variant prop exists but TS is not recognizing it
                  variant={buttonVariant}
                  onClick={() => handleCategoryClick(category.value)}
                  className={
                    isActive
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500'
                      : 'bg-transparent border-white/10 text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }
                >
                  {category.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Sort Options Section */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Sort By
          </h3>
          <div className="flex flex-col gap-2">
            {sortOptions.map((option) => {
              const isActive = selectedSort === option.value;
              const buttonVariant = isActive ? 'default' : 'outline';
              return (
                <Button
                  key={option.value}
                  // @ts-expect-error - Button variant prop exists but TS is not recognizing it
                  variant={buttonVariant}
                  onClick={() => handleSortClick(option.value)}
                  className={
                    isActive
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500'
                      : 'bg-transparent border-white/10 text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
