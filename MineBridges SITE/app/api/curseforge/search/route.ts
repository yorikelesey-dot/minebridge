import { NextRequest, NextResponse } from 'next/server';
import { transformCurseForgeProject } from '@/lib/transformers';
import type { CurseForgeProject } from '@/lib/types';

/**
 * CurseForge Search Proxy Handler
 * Forwards search requests to CurseForge API with proper authentication and caching
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export async function GET(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.CURSEFORGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'CurseForge API key not configured',
          code: 'API_KEY_MISSING'
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const classId = searchParams.get('classId') || '';
    const pageSize = searchParams.get('pageSize') || '20';
    const index = searchParams.get('index') || '0';

    // Build CurseForge API URL
    // gameId 432 is Minecraft
    const curseforgeUrl = new URL('https://api.curseforge.com/v1/mods/search');
    curseforgeUrl.searchParams.set('gameId', '432');
    curseforgeUrl.searchParams.set('searchFilter', query);
    if (classId) {
      curseforgeUrl.searchParams.set('classId', classId);
    }
    curseforgeUrl.searchParams.set('pageSize', pageSize);
    curseforgeUrl.searchParams.set('index', index);

    // Fetch from CurseForge API
    const response = await fetch(curseforgeUrl.toString(), {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'MineBridges/1.0'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      return handleAPIError(
        new Error(`CurseForge API error: ${response.status} ${response.statusText}`),
        response.status
      );
    }

    const data = await response.json();

    // Transform CurseForge mods to unified format
    const transformedResults = data.data?.map((mod: any) => {
      const curseforgeProject: CurseForgeProject = {
        source: 'curseforge',
        id: mod.id,
        name: mod.name,
        summary: mod.summary,
        logo: mod.logo,
        authors: mod.authors,
        downloadCount: mod.downloadCount,
        classId: mod.classId,
        dateModified: mod.dateModified,
        links: mod.links,
        categories: mod.categories
      };
      return transformCurseForgeProject(curseforgeProject);
    }) || [];

    return NextResponse.json({
      results: transformedResults,
      total: data.pagination?.totalCount || 0,
      index: data.pagination?.index || 0,
      pageSize: data.pagination?.pageSize || 20
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * Centralized error handler for API routes
 * @param error - Error object
 * @param statusCode - Optional HTTP status code
 * @returns NextResponse with error details
 */
function handleAPIError(error: unknown, statusCode?: number): NextResponse {
  console.error('CurseForge API Error:', error);

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'CURSEFORGE_API_ERROR'
      },
      { status: statusCode || 500 }
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
