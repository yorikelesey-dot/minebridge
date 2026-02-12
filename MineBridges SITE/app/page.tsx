'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { SearchBar } from '@/components/search-bar';
import { FilterPanel } from '@/components/filter-panel';
import { ContentGrid } from '@/components/content-grid';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/lib/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get state from URL query parameters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSort, setSelectedSort] = useState(searchParams.get('sort') || 'popularity');
  const [selectedSource, setSelectedSource] = useState(searchParams.get('source') || 'all');

  // Fetch data using React Query
  const { data: items = [], isLoading } = useQuery<ContentItem[]>({
    queryKey: ['search', searchQuery, selectedCategory, selectedSort, selectedSource],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedSort) params.set('sort', selectedSort);
      if (selectedSource) params.set('source', selectedSource);
      
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      return response.json();
    },
    enabled: true,
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSort) params.set('sort', selectedSort);
    if (selectedSource && selectedSource !== 'all') params.set('source', selectedSource);
    
    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : '/';
    router.push(newUrl, { scroll: false });
  }, [searchQuery, selectedCategory, selectedSort, selectedSource, router]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation Bar */}
      <nav className="border-b border-white/10 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-emerald-500">MineBridges</h1>
            <span className="text-sm text-zinc-400">Ultimate Minecraft Asset Aggregator</span>
          </div>
          <Button
            asChild
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <a
              href="https://t.me/MineBridges_bot"
              target="_blank"
              rel="noopener noreferrer"
            >
              @MineBridges_bot
            </a>
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar
            onSearch={handleSearch}
            initialValue={searchQuery}
          />
        </div>

        {/* Content Area with Sidebar */}
        <div className="flex gap-8">
          {/* Filter Panel Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <FilterPanel
              selectedCategory={selectedCategory}
              selectedSort={selectedSort}
              onCategoryChange={handleCategoryChange}
              onSortChange={handleSortChange}
            />
          </aside>

          {/* Content Grid */}
          <main className="flex-1">
            <ContentGrid items={items} isLoading={isLoading} />
          </main>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>
  );
}
