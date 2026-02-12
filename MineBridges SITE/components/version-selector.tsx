'use client';

import { useState, useEffect } from 'react';
import { VersionFile } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface VersionSelectorProps {
  itemId: string;
  source: 'modrinth' | 'curseforge';
  onVersionSelect?: (file: VersionFile) => void;
}

export function VersionSelector({ itemId, source, onVersionSelect }: VersionSelectorProps) {
  const [versions, setVersions] = useState<VersionFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedGameVersion, setSelectedGameVersion] = useState<string>('');
  const [selectedLoader, setSelectedLoader] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<VersionFile | null>(null);

  // Fetch versions on mount
  useEffect(() => {
    async function fetchVersions() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/versions/${itemId}?source=${source}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch versions');
        }
        
        const data = await response.json();
        setVersions(data.versions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchVersions();
  }, [itemId, source]);

  // Get unique game versions from all version files
  const availableGameVersions = Array.from(
    new Set(versions.flatMap(v => v.gameVersions))
  ).sort((a, b) => {
    // Sort versions in descending order (newest first)
    const parseVersion = (v: string) => {
      const parts = v.split('.').map(p => parseInt(p) || 0);
      return parts;
    };
    
    const aParts = parseVersion(a);
    const bParts = parseVersion(b);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) return bVal - aVal;
    }
    return 0;
  });

  // Get loaders compatible with selected game version
  const availableLoaders = selectedGameVersion
    ? Array.from(
        new Set(
          versions
            .filter(v => v.gameVersions.includes(selectedGameVersion))
            .flatMap(v => v.loaders)
        )
      ).sort()
    : [];

  // Find the matching version file
  useEffect(() => {
    if (selectedGameVersion && selectedLoader) {
      const matchingVersion = versions.find(v =>
        v.gameVersions.includes(selectedGameVersion) &&
        v.loaders.includes(selectedLoader)
      );
      
      setSelectedVersion(matchingVersion || null);
      
      if (matchingVersion && onVersionSelect) {
        onVersionSelect(matchingVersion);
      }
    } else {
      setSelectedVersion(null);
    }
  }, [selectedGameVersion, selectedLoader, versions, onVersionSelect]);

  // Reset loader when game version changes
  useEffect(() => {
    setSelectedLoader('');
  }, [selectedGameVersion]);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-zinc-900 animate-pulse rounded-md" />
        <div className="h-10 bg-zinc-900 animate-pulse rounded-md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm p-4 bg-red-950/20 border border-red-900/50 rounded-md">
        Error loading versions: {error}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-zinc-400 text-sm p-4 bg-zinc-900/50 border border-white/10 rounded-md">
        No versions available for this item.
      </div>
    );
  }

  const hasCompatibleVersion = selectedGameVersion && selectedLoader && selectedVersion;
  const noCompatibleVersion = selectedGameVersion && selectedLoader && !selectedVersion;

  return (
    <div className="space-y-4">
      {/* Game Version Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Minecraft Version
        </label>
        <Select value={selectedGameVersion} onValueChange={setSelectedGameVersion}>
          <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
            <SelectValue placeholder="Select game version" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            {availableGameVersions.map(version => (
              <SelectItem
                key={version}
                value={version}
                className="text-white focus:bg-zinc-800 focus:text-white"
              >
                {version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loader/Core Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Mod Loader / Server Core
        </label>
        <Select
          value={selectedLoader}
          onValueChange={setSelectedLoader}
          disabled={!selectedGameVersion || availableLoaders.length === 0}
        >
          <SelectTrigger className="bg-zinc-900 border-white/10 text-white disabled:opacity-50">
            <SelectValue placeholder="Select loader" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            {availableLoaders.map(loader => (
              <SelectItem
                key={loader}
                value={loader}
                className="text-white focus:bg-zinc-800 focus:text-white capitalize"
              >
                {loader}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* No Compatible Version Message */}
      {noCompatibleVersion && (
        <div className="text-amber-400 text-sm p-3 bg-amber-950/20 border border-amber-900/50 rounded-md">
          No compatible version found for {selectedGameVersion} with {selectedLoader}.
        </div>
      )}

      {/* Version Metadata */}
      {hasCompatibleVersion && selectedVersion && (
        <div className="space-y-3 p-4 bg-zinc-900/50 border border-white/10 rounded-md">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">File Name:</span>
              <span className="text-white font-mono text-xs">{selectedVersion.fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">File Size:</span>
              <span className="text-white">{formatFileSize(selectedVersion.fileSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Release Date:</span>
              <span className="text-white">{formatDate(selectedVersion.releaseDate)}</span>
            </div>
            {selectedVersion.changelog && (
              <div className="pt-2 border-t border-white/10">
                <span className="text-zinc-400">Changelog:</span>
                <p className="text-white text-xs mt-1 line-clamp-3">
                  {selectedVersion.changelog}
                </p>
              </div>
            )}
          </div>

          {/* Download Button */}
          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => {
              if (selectedVersion.downloadUrl) {
                window.open(selectedVersion.downloadUrl, '_blank');
              }
            }}
            disabled={!selectedVersion.downloadUrl}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
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
            Download
          </Button>
        </div>
      )}
    </div>
  );
}
