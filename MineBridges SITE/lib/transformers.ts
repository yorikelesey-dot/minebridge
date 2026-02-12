import type { ContentItem, ModrinthProject, CurseForgeProject } from './types';

/**
 * Transform Modrinth project to unified ContentItem format
 * @param project - Raw Modrinth API response
 * @returns Unified ContentItem
 */
export function transformModrinthProject(project: ModrinthProject): ContentItem {
  return {
    id: project.project_id,
    source: 'modrinth',
    title: project.title,
    description: project.description,
    iconUrl: project.icon_url || '/default-icon.png',
    author: project.author,
    downloadCount: project.downloads,
    category: mapModrinthCategory(project.project_type),
    lastUpdated: new Date(project.date_modified),
    sourceUrl: `https://modrinth.com/mod/${project.slug || project.project_id}`
  };
}

/**
 * Transform CurseForge project to unified ContentItem format
 * @param project - Raw CurseForge API response
 * @returns Unified ContentItem
 */
export function transformCurseForgeProject(project: CurseForgeProject): ContentItem {
  return {
    id: project.id.toString(),
    source: 'curseforge',
    title: project.name,
    description: sanitizeHTML(project.summary),
    iconUrl: project.logo?.url || '/default-icon.png',
    author: project.authors[0]?.name || 'Unknown',
    downloadCount: project.downloadCount,
    category: mapCurseForgeCategory(project.classId),
    lastUpdated: new Date(project.dateModified),
    sourceUrl: project.links?.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${project.id}`
  };
}

/**
 * Map Modrinth project types to unified categories
 * @param projectType - Modrinth project type string
 * @returns Unified category
 */
export function mapModrinthCategory(projectType: string): ContentItem['category'] {
  const mapping: Record<string, ContentItem['category']> = {
    'mod': 'mod',
    'plugin': 'plugin',
    'shader': 'shader',
    'resourcepack': 'resourcepack',
    'modpack': 'mod' // Treat modpacks as mods for simplicity
  };
  return mapping[projectType.toLowerCase()] || 'mod';
}

/**
 * Map CurseForge class IDs to unified categories
 * @param classId - CurseForge class ID number
 * @returns Unified category
 */
export function mapCurseForgeCategory(classId: number): ContentItem['category'] {
  const mapping: Record<number, ContentItem['category']> = {
    6: 'mod',
    5: 'plugin',
    6552: 'shader',
    12: 'resourcepack'
  };
  return mapping[classId] || 'mod';
}

/**
 * Sanitize HTML content from CurseForge
 * CurseForge descriptions often contain malformed HTML with inline styles
 * that conflict with dark theme. This function removes dangerous content
 * and inline styles while preserving basic formatting.
 * 
 * @param html - Raw HTML string from CurseForge
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  return html
    // Remove inline styles that conflict with dark theme
    .replace(/style="[^"]*"/gi, '')
    .replace(/style='[^']*'/gi, '')
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags and their content
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove event handlers (onclick, onload, etc.)
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    // Remove javascript: protocol links
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .replace(/href='javascript:[^']*'/gi, "href='#'");
}
