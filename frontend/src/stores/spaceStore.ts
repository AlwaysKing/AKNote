import { create } from 'zustand';
import { spacesApi, Space } from '../api/spaces';
import { pagesApi, Page } from '../api/pages';

interface SpaceState {
  spaces: Space[];
  currentSpace: Space | null;
  pageTree: Page[];
  starredPages: Page[];
  recentPages: Page[];
  isLoading: boolean;
  error: string | null;
  fetchSpaces: () => Promise<void>;
  setCurrentSpace: (space: Space | null) => void;
  fetchPageTree: (spaceSlug: string) => Promise<void>;
  refreshPageTree: () => Promise<void>;
  fetchStarred: (spaceSlug: string) => Promise<void>;
  fetchRecent: (spaceSlug: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useSpaceStore = create<SpaceState>((set, get) => ({
  spaces: [],
  currentSpace: null,
  pageTree: [],
  starredPages: [],
  recentPages: [],
  isLoading: false,
  error: null,

  fetchSpaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const spaces = await spacesApi.list();
      set({ spaces, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setCurrentSpace: (space) => {
    set({ currentSpace: space });
    if (space) {
      get().fetchPageTree(space.slug);
      get().fetchStarred(space.slug);
      get().fetchRecent(space.slug);
    } else {
      set({ pageTree: [], starredPages: [], recentPages: [] });
    }
  },

  fetchPageTree: async (spaceSlug) => {
    set({ isLoading: true, error: null });
    try {
      const pageTree = await pagesApi.getTree(spaceSlug);
      set({ pageTree: pageTree || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  refreshPageTree: async () => {
    const { currentSpace } = get();
    if (currentSpace) {
      await get().fetchPageTree(currentSpace.slug);
    }
  },

  fetchStarred: async (spaceSlug) => {
    try {
      const pages = await pagesApi.listStarred(spaceSlug);
      set({ starredPages: pages || [] });
    } catch (error: any) {
      console.error('Failed to fetch starred pages:', error);
    }
  },

  fetchRecent: async (spaceSlug) => {
    try {
      const pages = await pagesApi.listRecent(spaceSlug);
      set({ recentPages: pages || [] });
    } catch (error: any) {
      console.error('Failed to fetch recent pages:', error);
    }
  },

  refreshAll: async () => {
    const { currentSpace } = get();
    if (currentSpace) {
      await Promise.all([
        get().fetchPageTree(currentSpace.slug),
        get().fetchStarred(currentSpace.slug),
        get().fetchRecent(currentSpace.slug),
      ]);
    }
  },
}));
