import axios from 'axios';

const MODRINTH_API = 'https://api.modrinth.com/v2';

export interface ModrinthProject {
  slug: string;
  title: string;
  description: string;
  project_type: string;
  downloads: number;
  icon_url?: string;
  project_id: string;
}

export interface ModrinthVersion {
  id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  files: Array<{
    url: string;
    filename: string;
    size: number;
  }>;
}

export async function searchModrinth(query: string, projectType: string = 'mod'): Promise<ModrinthProject[]> {
  try {
    const response = await axios.get(`${MODRINTH_API}/search`, {
      params: {
        query,
        facets: `[["project_type:${projectType}"]]`,
        limit: 10,
      },
    });

    return response.data.hits || [];
  } catch (error) {
    console.error('Modrinth search error:', error);
    return [];
  }
}

export async function getModrinthVersions(projectId: string): Promise<ModrinthVersion[]> {
  try {
    const response = await axios.get(`${MODRINTH_API}/project/${projectId}/version`);
    return response.data || [];
  } catch (error) {
    console.error('Modrinth versions error:', error);
    return [];
  }
}
