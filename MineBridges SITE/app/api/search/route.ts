import { NextRequest, NextResponse } from 'next/server';
import type { ContentItem } from '@/lib/types';

/**
 * Unified Search Endpoint
 * Aggregates results from both Modrinth and CurseForge APIs
 * Requirements: 1.2, 1.3, 7.3, 7.4
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const source = searchParams.get('source') || 'all';
    const category = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || 'popularity';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const results: ContentItem[] = [];
    const errors: string[] = [];

    // Fetch from Modrinth if requested
    if (source === 'modrinth' || source === 'all') {
      try {
        const modrinthResults = await fetchModrinthResults(query, category, limit);
        results.push(...modrinthResults);
      } catch (error) {
        console.error('Modrinth fetch error:', error);
        errors.push('modrinth');
      }
    }

    // Fetch from CurseForge if requested
    if (source === 'curseforge' || source === 'all') {
      try {
        const curseforgeResults = await fetchCurseForgeResults(query, category, limit);
        results.push(...curseforgeResults);
      } catch (error) {
        console.error('CurseForge fetch error:', error);
        errors.push('curseforge');
      }
    }

    // Sort results based on sort parameter
    const sortedResults = sortResults(results, sort);

    // Limit results to requested amount
    const limitedResults = sortedResults.slice(0, limit);

    return NextResponse.json({
      results: limitedResults,
      total: sortedResults.length,
      source,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * Fetch results from Modrinth API
 */
async function fetchModrinthResults(
  query: string,
  category: string,
  limit: number
): Promise<ContentItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`${baseUrl}/api/modrinth/search`);
  
  url.searchParams.set('query', query);
  url.searchParams.set('limit', limit.toString());
  
  // Add category facet if specified
  if (category) {
    const facets = buildModrinthFacets(category);
    if (facets) {
      url.searchParams.set('facets', facets);
    }
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw new Error(`Modrinth proxy error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Fetch results from CurseForge API
 */
async function fetchCurseForgeResults(
  query: string,
  category: string,
  limit: number
): Promise<ContentItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`${baseUrl}/api/curseforge/search`);
  
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', limit.toString());
  
  // Add classId if category is specified
  if (category) {
    const classId = getCurseForgeClassId(category);
    if (classId) {
      url.searchParams.set('classId', classId);
    }
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw new Error(`CurseForge proxy error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Build Modrinth facets string for category filtering
 */
function buildModrinthFacets(category: string): string | null {
  const categoryMap: Record<string, string> = {
    'mod': 'mod',
    'plugin': 'plugin',
    'shader': 'shader',
    'resourcepack': 'resourcepack'
  };

  const modrinthCategory = categoryMap[category];
  if (!modrinthCategory) return null;

  // Modrinth facets format: [["project_type:mod"]]
  return JSON.stringify([['project_type:' + modrinthCategory]]);
}

/**
 * Get CurseForge classId for category
 */
function getCurseForgeClassId(category: string): string | null {
  const classIdMap: Record<string, string> = {
    'mod': '6',
    'plugin': '5',
    'shader': '6552',
    'resourcepack': '12'
  };

  return classIdMap[category] || null;
}

/**
 * Sort results based on sort parameter
 */
function sortResults(results: ContentItem[], sort: string): ContentItem[] {
  const sorted = [...results];

  switch (sort) {
    case 'popularity':
      return sorted.sort((a, b) => b.downloadCount - a.downloadCount);
    
    case 'latest':
      return sorted.sort((a, b) => 
        b.lastUpdated.getTime() - a.lastUpdated.getTime()
      );
    
    case 'followed':
      // For now, just sort by popularity
      // In the future, this could integrate with user favorites
      return sorted.sort((a, b) => b.downloadCount - a.downloadCount);
    
    default:
      return sorted;
  }
}

/**
 * Centralized error handler for API routes
 */
function handleAPIError(error: unknown): NextResponse {
  console.error('Unified Search API Error:', error);

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'SEARCH_API_ERROR'
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  );
}
