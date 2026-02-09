import axios from 'axios';
import { config } from '../config';

const CURSEFORGE_API = 'https://api.curseforge.com/v1';
const MINECRAFT_GAME_ID = 432;

export interface CurseForgeProject {
  id: number;
  name: string;
  summary: string;
  downloadCount: number;
  logo?: {
    url: string;
  };
  links: {
    websiteUrl: string;
  };
}

export interface CurseForgeFile {
  id: number;
  displayName: string;
  fileName: string;
  fileLength: number;
  downloadUrl: string;
  gameVersions: string[];
}

export async function searchCurseForge(query: string, classId: number = 6): Promise<CurseForgeProject[]> {
  try {
    const response = await axios.get(`${CURSEFORGE_API}/mods/search`, {
      headers: {
        'x-api-key': config.curseforgeApiKey,
      },
      params: {
        gameId: MINECRAFT_GAME_ID,
        classId, // 6 = Mods, 12 = Resource Packs, 6552 = Shaders
        searchFilter: query,
        pageSize: 10,
      },
    });

    return response.data.data || [];
  } catch (error) {
    console.error('CurseForge search error:', error);
    return [];
  }
}

export async function getCurseForgeFiles(modId: number): Promise<CurseForgeFile[]> {
  try {
    const response = await axios.get(`${CURSEFORGE_API}/mods/${modId}/files`, {
      headers: {
        'x-api-key': config.curseforgeApiKey,
      },
      params: {
        pageSize: 10,
      },
    });

    return response.data.data || [];
  } catch (error) {
    console.error('CurseForge files error:', error);
    return [];
  }
}
