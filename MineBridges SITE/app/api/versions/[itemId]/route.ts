import { NextRequest, NextResponse } from 'next/server';
import type { VersionFile } from '@/lib/types';

/**
 * Versions Endpoint
 * Fetches version files for a specific content item from the appropriate source
 * Requirements: 4.1, 4.6
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const { itemId } = await params;

    if (!source || (source !== 'modrinth' && source !== 'curseforge')) {
      return NextResponse.json(
        {
          error: 'Invalid or missing source parameter. Must be "modrinth" or "curseforge"',
          code: 'INVALID_SOURCE'
        },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        {
          error: 'Missing itemId parameter',
          code: 'INVALID_ITEM_ID'
        },
        { status: 400 }
      );
    }

    let versions: VersionFile[] = [];

    if (source === 'modrinth') {
      versions = await fetchModrinthVersions(itemId);
    } else if (source === 'curseforge') {
      versions = await fetchCurseForgeVersions(itemId);
    }

    return NextResponse.json({
      versions,
      total: versions.length,
      itemId,
      source
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * Fetch versions from Modrinth API
 */
async function fetchModrinthVersions(projectId: string): Promise<VersionFile[]> {
  const apiKey = process.env.MODRINTH_API_KEY;
  
  const response = await fetch(
    `https://api.modrinth.com/v2/project/${projectId}/version`,
    {
      headers: {
        'User-Agent': 'MineBridges/1.0',
        ...(apiKey && { 'Authorization': apiKey })
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    }
  );

  if (!response.ok) {
    throw new Error(`Modrinth API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform Modrinth versions to VersionFile format
  return data.map((version: any) => {
    const primaryFile = version.files?.[0];
    
    return {
      id: version.id,
      gameVersions: version.game_versions || [],
      loaders: version.loaders || [],
      fileName: primaryFile?.filename || 'unknown.jar',
      downloadUrl: primaryFile?.url || '',
      fileSize: primaryFile?.size || 0,
      releaseDate: new Date(version.date_published),
      changelog: version.changelog || undefined
    } as VersionFile;
  });
}

/**
 * Fetch versions from CurseForge API
 */
async function fetchCurseForgeVersions(modId: string): Promise<VersionFile[]> {
  const apiKey = process.env.CURSEFORGE_API_KEY;
  
  if (!apiKey) {
    throw new Error('CurseForge API key not configured');
  }

  const response = await fetch(
    `https://api.curseforge.com/v1/mods/${modId}/files`,
    {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'MineBridges/1.0'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    }
  );

  if (!response.ok) {
    throw new Error(`CurseForge API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform CurseForge files to VersionFile format
  return (data.data || []).map((file: any) => {
    // Extract game versions
    const gameVersions = file.gameVersions || [];
    
    // Extract loaders from game versions
    // CurseForge includes loaders like "Forge", "Fabric" in gameVersions array
    const loaders = gameVersions
      .filter((v: string) => 
        ['forge', 'fabric', 'quilt', 'neoforge'].includes(v.toLowerCase())
      )
      .map((v: string) => v.toLowerCase());
    
    // Filter out loaders from game versions to get actual Minecraft versions
    const minecraftVersions = gameVersions.filter((v: string) => 
      !['forge', 'fabric', 'quilt', 'neoforge'].includes(v.toLowerCase())
    );

    return {
      id: file.id.toString(),
      gameVersions: minecraftVersions,
      loaders: loaders.length > 0 ? loaders : ['forge'], // Default to forge if no loader specified
      fileName: file.fileName || 'unknown.jar',
      downloadUrl: file.downloadUrl || '',
      fileSize: file.fileLength || 0,
      releaseDate: new Date(file.fileDate),
      changelog: undefined // CurseForge doesn't provide changelog in files endpoint
    } as VersionFile;
  });
}

/**
 * Centralized error handler for API routes
 */
function handleAPIError(error: unknown): NextResponse {
  console.error('Versions API Error:', error);

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'VERSIONS_API_ERROR'
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
