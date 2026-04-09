import { SearchResults, UserState } from '../types/user';

class StateService {
  private userStates = new Map<number, UserState>();
  private searchResults = new Map<number, SearchResults>();

  constructor() {
    // Автоочистка старых состояний (старше 1 часа)
    setInterval(() => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      
      for (const [userId, state] of this.userStates.entries()) {
        if (state.timestamp < oneHourAgo) {
          this.userStates.delete(userId);
        }
      }
      
      for (const [userId, search] of this.searchResults.entries()) {
        if (search.timestamp < oneHourAgo) {
          this.searchResults.delete(userId);
        }
      }
      
      if (this.userStates.size > 0 || this.searchResults.size > 0) {
        console.log(`Active states: ${this.userStates.size}, Active searches: ${this.searchResults.size}`);
      }
    }, 10 * 60 * 1000); // Каждые 10 минут
  }

  setUserState(userId: number, state: Omit<UserState, 'timestamp'>): void {
    this.userStates.set(userId, { ...state, timestamp: Date.now() });
  }

  getUserState(userId: number): UserState | undefined {
    return this.userStates.get(userId);
  }

  deleteUserState(userId: number): void {
    this.userStates.delete(userId);
  }

  setSearchResults(userId: number, results: Omit<SearchResults, 'timestamp'>): void {
    this.searchResults.set(userId, { ...results, timestamp: Date.now() });
  }

  getSearchResults(userId: number): SearchResults | undefined {
    return this.searchResults.get(userId);
  }

  deleteSearchResults(userId: number): void {
    this.searchResults.delete(userId);
  }
}

export const stateService = new StateService();
