'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { Command, CommandInput } from '@/components/ui/command';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

export function SearchBar({ onSearch, initialValue = '' }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [isSearching, setIsSearching] = useState(false);

  // Track when user is typing (debounce in progress)
  useEffect(() => {
    if (searchTerm !== debouncedSearch) {
      setIsSearching(true);
    }
  }, [searchTerm, debouncedSearch]);

  // Execute search when debounce completes
  useEffect(() => {
    onSearch(debouncedSearch);
    setIsSearching(false);
  }, [debouncedSearch, onSearch]);

  const handleValueChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  return (
    <div className="relative w-full">
      <Command className="rounded-lg border border-white/10 bg-zinc-950">
        <CommandInput
          placeholder="Search for mods, plugins, shaders, and resource packs..."
          value={searchTerm}
          onValueChange={handleValueChange}
          className="text-white placeholder:text-zinc-400"
        />
      </Command>
      
      {/* Thin progress bar during debounce */}
      {isSearching && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800 overflow-hidden">
          <div className="h-full bg-emerald-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}
