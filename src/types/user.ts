export interface UserState {
  action: string;
  data?: any;
  projectId?: string;
  projectType?: string;
  gameVersion?: string;
  loader?: string;
  results?: any[];
  currentPage?: number;
  timestamp: number;
}

export interface SearchResults {
  results: any[];
  projectType: string;
  gameVersion?: string;
  loader?: string;
  timestamp: number;
}
