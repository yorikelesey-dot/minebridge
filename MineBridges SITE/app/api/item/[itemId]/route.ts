import { NextRequest, NextResponse } from 'next/server';
import { transformModrinthProject, transformCurseForgeProject } from '@/lib/transformers';
import type { ModrinthProject, CurseForgeProject } from '@/lib/types';

/**
 * Item Detail API Route
 * Fetches detailed information for a specific item from Modrinth or CurseForge
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const itemId = params.itemId;

    if (!source || (source !== 'modrinth' && source !== 'curseforge')) {
      return NextResponse.json(
        { error: 'Invalid or missing source parameter' },
        { status: 400 }
      );
    }

    if (source === 'modrinth') {
      return await fetchModrinthItem(itemId);
    } else {
      return await fetchCurseForgeItem(itemId);
    }
  } catch (error) {
    return handleAPIError(error);
  }
}

async function fetchModrinthItem(projectId: string): Promise<NextResponse> {
  const response = await fetch(
    `https://api.modrinth.com/v2/project/${projectId}`,
    {
      headers: {
        'User-Agent': 'MineBridges/1.0',
        ...(process.env.MODRINTH_API_KEY && {
          'Authorization': process.env.MODRINTH_API_KEY
        })
      },
      next: { revalidate: 1800 } // Cache for 30 minutes
    }
  );

  if (!response.ok) {
    throw new Error(`Modrinth API error: ${response.status}`);
  }

  const data = await response.json();

  const modrinthProject: ModrinthProject = {
    source: 'modrinth',
    project_id: data.id,
    title: data.title,
    description: data.body || data.description,
    icon_url: data.icon_url,
    author: data.team || 'Unknown',
    downloads: data.downloads,
    project_type: data.project_type,
    date_modified: data.updated,
    slug: data.slug
  };

  const transformedItem = transformModrinthProject(modrinthProject);

  return NextResponse.json({
    item: transformedItem,
    gallery: data.gallery || [],
    body: data.body || data.description
  });
}

async function fetchCurseForgeItem(modId: string): Promise<NextResponse> {
  const apiKey = process.env.CURSEFORGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'CurseForge API key not configured' },
      { status: 500 }
    );
  }

  const response = await fetch(
    `https://api.curseforge.com/v1/mods/${modId}`,
    {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'MineBridges/1.0'
      },
      next: { revalidate: 1800 } // Cache for 30 minutes
    }
  );

  if (!response.ok) {
    throw new Error(`CurseForge API error: ${response.status}`);
  }

  const data = await response.json();
  const mod = data.data;

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
    links: mod.links
  };

  const transformedItem = transformCurseForgeProject(curseforgeProject);

  return NextResponse.json({
    item: transformedItem,
    gallery: mod.screenshots || [],
    body: mod.summary
  });
}

function handleAPIError(error: unknown): NextResponse {
  console.error('Item Detail API Error:', error);

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message, code: 'ITEM_DETAIL_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' },
    { status: 500 }
  );
}
