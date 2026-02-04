/**
 * Zustand store for game data management
 * Orchestrates loading, validation, and indexing of game data
 */

import { create, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { loadRawGameData } from "../core/data/loader";
import { validateGameData } from "../core/data/validator";
import {
  buildGameDataMaps,
  buildGameDataIndices,
  type GameData,
  type GameDataIndices,
} from "../core/data/indices";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Game data store state
 */
export interface GameDataState {
  gameData: GameData | null;
  indices: GameDataIndices | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Game data store actions
 */
export interface GameDataActions {
  /** Load game data: fetch -> validate -> build maps -> build indices */
  loadGameData: () => Promise<void>;
  /** Get game data, throws if not loaded */
  getGameData: () => GameData;
  /** Get indices, throws if not loaded */
  getIndices: () => GameDataIndices;
}

export type GameDataStore = GameDataState & GameDataActions;

// ─────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────

const initialState: GameDataState = {
  gameData: null,
  indices: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

/**
 * Zustand store for game data
 */
export const gameDataStore = create<GameDataStore>((set, get) => ({
  ...initialState,

  loadGameData: async () => {
    // Set loading state, clear previous error
    set({ isLoading: true, error: null });

    try {
      // Step 1: Load raw game data from JSON files
      const rawData = await loadRawGameData();

      // Step 2: Validate cross-references
      const validationResult = validateGameData(rawData);

      if (!validationResult.isValid) {
        // Format validation errors into a single message
        const errorMessages = validationResult.errors
          .map((e) => `[${e.code}] ${e.message}`)
          .join("\n");
        set({
          gameData: null,
          indices: null,
          isLoading: false,
          error: `Validation failed:\n${errorMessages}`,
        });
        return;
      }

      // Step 3: Build Maps from arrays
      const gameData = buildGameDataMaps(rawData);

      // Step 4: Build indices for efficient lookups
      const indices = buildGameDataIndices(gameData);

      // Success: update state
      set({
        gameData,
        indices,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      // Handle loader errors (network, file not found, invalid JSON)
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      set({
        gameData: null,
        indices: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  getGameData: () => {
    const { gameData } = get();
    if (!gameData) {
      throw new Error("Game data not loaded. Call loadGameData() first.");
    }
    return gameData;
  },

  getIndices: () => {
    const { indices } = get();
    if (!indices) {
      throw new Error("Game data indices not loaded. Call loadGameData() first.");
    }
    return indices;
  },
}));

// ─────────────────────────────────────────────────────────────
// React Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Hook to get game data. Throws if not loaded.
 * Use this when you expect data to be loaded (e.g., after a loading screen)
 */
export function useGameData(): GameData {
  const gameData = useStore(gameDataStore, (state) => state.gameData);
  if (!gameData) {
    throw new Error("Game data not loaded. Call loadGameData() first.");
  }
  return gameData;
}

/**
 * Hook to get game data or null.
 * Use this when you need to handle the not-loaded state in your component
 */
export function useGameDataOrNull(): GameData | null {
  return useStore(gameDataStore, (state) => state.gameData);
}

/**
 * Hook to get loading state with data.
 * Use this in components that need to show loading/error states
 */
export function useGameDataLoading(): {
  data: GameData | null;
  isLoading: boolean;
  error: string | null;
} {
  return useStore(
    gameDataStore,
    useShallow((state) => ({
      data: state.gameData,
      isLoading: state.isLoading,
      error: state.error,
    }))
  );
}

/**
 * Hook to get game data indices. Throws if not loaded.
 * Use this when you need pre-computed indices for lookups
 */
export function useGameDataIndices(): GameDataIndices {
  const indices = useStore(gameDataStore, (state) => state.indices);
  if (!indices) {
    throw new Error("Game data indices not loaded. Call loadGameData() first.");
  }
  return indices;
}

// Default export is the store
export default gameDataStore;

// ─────────────────────────────────────────────────────────────
// Re-exports: Lookup Helpers
// ─────────────────────────────────────────────────────────────

// Item lookups
export {
  getItem,
  getItemsByType,
  getItemsByTier,
  getAllItems,
} from "../core/data/lookups";

// Building lookups
export {
  getBuilding,
  getBuildingsByType,
  getBuildingsByCorporation,
  getAllBuildings,
} from "../core/data/lookups";

// Recipe lookups
export {
  getRecipe,
  getRecipesByBuilding,
  getRecipesProducing,
  getRecipesConsuming,
  getAllRecipes,
} from "../core/data/lookups";

// Rail lookups
export { getRail, getRailsByMinCapacity, getAllRails } from "../core/data/lookups";

// Corporation lookups
export {
  getCorporation,
  getAllCorporations,
  getCorporationLevels,
  getRewardsAtLevel,
  getRewardsByType,
  getRailsUnlockedBy,
  getBuildingsUnlockedBy,
} from "../core/data/lookups";

// ─────────────────────────────────────────────────────────────
// Re-exports: Game Types
// ─────────────────────────────────────────────────────────────

export type {
  Item,
  ItemType,
  Building,
  BuildingType,
  UnlockRequirement,
  Recipe,
  RecipeItem,
  Purity,
  Rail,
  Corporation,
  CorporationLevel,
  CorporationComponent,
  CorporationReward,
  RewardType,
  RecipesByItem,
} from "../core/types/game";

// Re-export GameData and GameDataIndices (already in scope)
export type { GameData, GameDataIndices };
