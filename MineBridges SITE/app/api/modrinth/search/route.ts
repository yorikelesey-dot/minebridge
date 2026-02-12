import { NextRequest, NextResponse } from 'next/server';
import { transformModrinthProject } from '@/lib/transformers';
import type { ModrinthProject } from '@/lib/types';

/**
 * Modrinth Search Proxy Handler
 * Forwards search requests to Modrinth API with proper authentication and caching
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const facets = searchParams.get('facets') || '';
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    // Build Modrinth API URL
    const modrinthUrl = new URL('https://api.modrinth.com/v2/search');
    modrinthUrl.searchParams.set('query', query);
    if (facets) {
      modrinthUrl.searchParams.set('facets', facets);
    }
    modrinthUrl.searchParams.set('limit', limit);
    modrinthUrl.searchParams.set('offset', offset);

    // Fetch from Modrinth API
    const response = await fetch(modrinthUrl.toString(), {
      headers: {
        'User-Agent': 'MineBridges/1.0',
        ...(process.env.MODRINTH_API_KEY && {
          'Authorization': process.env.MODRINTH_API_KEY
        })
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      return handleAPIError(
        new Error(`Modrinth API error: ${response.status} ${response.statusText}`),
        response.status
      );
    }

    const data = await response.json();

    // Transform Modrinth projects to unified format
    const transformedResults = data.hits?.map((hit: any) => {
      const modrinthProject: ModrinthProject = {
        source: 'modrinth',
        project_id: hit.project_id,
        title: hit.title,
        description: hit.description,
        icon_url: hit.icon_url,
        author: hit.author,
        downloads: hit.downloads,
        project_type: hit.project_type,
        date_modified: hit.date_modified,
        slug: hit.slug,
        categories: hit.categories
      };
      return transformModrinthProject(modrinthProject);
    }) || [];

    return NextResponse.json({
      results: transformedResults,
      total: data.total_hits || 0,
      offset: data.offset || 0,
      limit: data.limit || 20
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
  console.error('Modrinth API Error:', error);

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'MODRINTH_API_ERROR'
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
