// Core TypeScript interfaces and types for MineBridges

/**
 * Unified content item interface
 * Represents a Minecraft asset (mod, plugin, shader, resource pack) from any source
 */
export interface ContentItem {
  id: string;
  source: 'modrinth' | 'curseforge';
  title: string;
  description: string;
  iconUrl: string;
  author: string;
  downloadCount: number;
  category: 'mod' | 'plugin' | 'shader' | 'resourcepack';
  lastUpdated: Date;
  sourceUrl: string;
}

/**
 * Version file interface
 * Represents a downloadable file for a specific game version and loader
 */
export interface VersionFile {
  id: string;
  gameVersions: string[];
  loaders: string[];
  fileName: string;
  downloadUrl: string;
  fileSize: number;
  releaseDate: Date;
  changelog?: string;
}

/**
 * Modrinth project type
 * Raw API response structure from Modrinth
 */
export type ModrinthProject = {
  source: 'modrinth';
  project_id: string;
  title: string;
  description: string;
  icon_url: string;
  author: string;
  downloads: number;
  project_type: string;
  date_modified: string;
  slug?: string;
  categories?: string[];
  client_side?: string;
  server_side?: string;
};

/**
 * CurseForge project type
 * Raw API response structure from CurseForge
 */
export type CurseForgeProject = {
  source: 'curseforge';
  id: number;
  name: string;
  summary: string;
  logo: { url: string };
  authors: Array<{ name: string }>;
  downloadCount: number;
  classId: number;
  dateModified: string;
  links?: {
    websiteUrl?: string;
  };
  categories?: Array<{ name: string }>;
};

/**
 * Discriminated union type for API projects
 * Allows type-safe handling of both Modrinth and CurseForge responses
 */
export type APIProject = ModrinthProject | CurseForgeProject;

/**
 * Search parameters interface
 * Defines all possible search and filter options
 */
export interface SearchParams {
  query: string;
  category?: 'mod' | 'plugin' | 'shader' | 'resourcepack';
  sort?: 'popularity' | 'latest' | 'followed';
  source?: 'modrinth' | 'curseforge' | 'all';
}
