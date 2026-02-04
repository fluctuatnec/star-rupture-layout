/**
 * Tests for game data Zustand store
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { mockRawGameData } from "../fixtures/gameData";

// Mock the dependencies
vi.mock("../../core/data/loader", () => ({
  loadRawGameData: vi.fn(),
}));

vi.mock("../../core/data/validator", () => ({
  validateGameData: vi.fn(),
}));

vi.mock("../../core/data/indices", () => ({
  buildGameDataMaps: vi.fn(),
  buildGameDataIndices: vi.fn(),
}));

// Import after mocking
import {
  gameDataStore,
  useGameData,
  useGameDataOrNull,
  useGameDataLoading,
  useGameDataIndices,
} from "../../state/gameDataStore";
import { loadRawGameData } from "../../core/data/loader";
import { validateGameData } from "../../core/data/validator";
import { buildGameDataMaps, buildGameDataIndices } from "../../core/data/indices";
import type { GameData, GameDataIndices } from "../../core/data/indices";
import type { Item, Building, Recipe, Rail, Corporation } from "../../core/types/game";

// ─────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────

const mockGameData: GameData = {
  items: new Map<string, Item>([["ore_titanium", mockRawGameData.items[0]]]),
  buildings: new Map<string, Building>([["ore_excavator", mockRawGameData.buildings[0]]]),
  recipes: new Map<string, Recipe>([["titanium_ore_normal", mockRawGameData.recipes[0]]]),
  rails: new Map<string, Rail>([["rail_v1", mockRawGameData.rails[0]]]),
  corporations: new Map<string, Corporation>([
    ["selenian_corporation", mockRawGameData.corporations[0]],
  ]),
};

const mockIndices: GameDataIndices = {
  recipesByBuilding: new Map(),
  recipesByOutputItem: new Map(),
  recipesByInputItem: new Map(),
  buildingsByType: new Map(),
  buildingsByCorporation: new Map(),
  itemsByType: new Map(),
  itemsByTier: new Map(),
  railsSortedByCapacity: [],
  railsByMinCapacity: new Map(),
  rewardsByCorpLevel: new Map(),
};

// ─────────────────────────────────────────────────────────────
// Helper to reset store state
// ─────────────────────────────────────────────────────────────

function resetStore() {
  gameDataStore.setState({
    gameData: null,
    indices: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe("gameDataStore", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = gameDataStore.getState();

      expect(state.gameData).toBeNull();
      expect(state.indices).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });
  });

  describe("loadGameData", () => {
    it("should set isLoading to true during load", async () => {
      // Create a deferred promise to control when loading finishes
      let resolveLoad: (value: unknown) => void;
      const loadPromise = new Promise((resolve) => {
        resolveLoad = resolve;
      });

      vi.mocked(loadRawGameData).mockReturnValue(loadPromise as Promise<typeof mockRawGameData>);

      // Start loading
      const loadAction = gameDataStore.getState().loadGameData();

      // Check loading state immediately
      expect(gameDataStore.getState().isLoading).toBe(true);
      expect(gameDataStore.getState().error).toBeNull();

      // Complete the load
      resolveLoad!(mockRawGameData);
      vi.mocked(validateGameData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(buildGameDataMaps).mockReturnValue(mockGameData);
      vi.mocked(buildGameDataIndices).mockReturnValue(mockIndices);

      await loadAction;
    });

    it("should successfully load, validate, and build indices", async () => {
      vi.mocked(loadRawGameData).mockResolvedValue(mockRawGameData);
      vi.mocked(validateGameData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(buildGameDataMaps).mockReturnValue(mockGameData);
      vi.mocked(buildGameDataIndices).mockReturnValue(mockIndices);

      await gameDataStore.getState().loadGameData();

      const state = gameDataStore.getState();
      expect(state.gameData).toBe(mockGameData);
      expect(state.indices).toBe(mockIndices);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeInstanceOf(Date);
    });

    it("should call all loader functions in correct order", async () => {
      vi.mocked(loadRawGameData).mockResolvedValue(mockRawGameData);
      vi.mocked(validateGameData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(buildGameDataMaps).mockReturnValue(mockGameData);
      vi.mocked(buildGameDataIndices).mockReturnValue(mockIndices);

      await gameDataStore.getState().loadGameData();

      expect(loadRawGameData).toHaveBeenCalledTimes(1);
      expect(validateGameData).toHaveBeenCalledWith(mockRawGameData);
      expect(buildGameDataMaps).toHaveBeenCalledWith(mockRawGameData);
      expect(buildGameDataIndices).toHaveBeenCalledWith(mockGameData);
    });

    it("should set error state when loader throws", async () => {
      const errorMessage = "Failed to fetch game data file: items_catalog.json";
      vi.mocked(loadRawGameData).mockRejectedValue(new Error(errorMessage));

      await gameDataStore.getState().loadGameData();

      const state = gameDataStore.getState();
      expect(state.gameData).toBeNull();
      expect(state.indices).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it("should set error state when validation fails", async () => {
      vi.mocked(loadRawGameData).mockResolvedValue(mockRawGameData);
      vi.mocked(validateGameData).mockReturnValue({
        isValid: false,
        errors: [
          {
            code: "MISSING_BUILDING_REF",
            message: 'Recipe "test" references non-existent building "unknown"',
            file: "recipes.json",
            entityId: "test",
          },
          {
            code: "MISSING_ITEM_REF",
            message: 'Recipe "test2" output references non-existent item "bad_item"',
            file: "recipes.json",
            entityId: "test2",
          },
        ],
      });

      await gameDataStore.getState().loadGameData();

      const state = gameDataStore.getState();
      expect(state.gameData).toBeNull();
      expect(state.indices).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toContain("Validation failed");
      expect(state.error).toContain("MISSING_BUILDING_REF");
      expect(state.error).toContain("MISSING_ITEM_REF");
    });

    it("should clear error on new load attempt", async () => {
      // First load fails
      vi.mocked(loadRawGameData).mockRejectedValueOnce(new Error("Network error"));
      await gameDataStore.getState().loadGameData();
      expect(gameDataStore.getState().error).toBe("Network error");

      // Second load starts - error should be cleared
      let resolveLoad: (value: unknown) => void;
      const loadPromise = new Promise((resolve) => {
        resolveLoad = resolve;
      });
      vi.mocked(loadRawGameData).mockReturnValue(loadPromise as Promise<typeof mockRawGameData>);

      const loadAction = gameDataStore.getState().loadGameData();
      expect(gameDataStore.getState().error).toBeNull();

      // Complete the load
      resolveLoad!(mockRawGameData);
      vi.mocked(validateGameData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(buildGameDataMaps).mockReturnValue(mockGameData);
      vi.mocked(buildGameDataIndices).mockReturnValue(mockIndices);
      await loadAction;
    });

    it("should handle non-Error thrown values", async () => {
      vi.mocked(loadRawGameData).mockRejectedValue("string error");

      await gameDataStore.getState().loadGameData();

      const state = gameDataStore.getState();
      expect(state.error).toBe("Unknown error occurred");
    });
  });

  describe("getGameData", () => {
    it("should return game data when loaded", async () => {
      vi.mocked(loadRawGameData).mockResolvedValue(mockRawGameData);
      vi.mocked(validateGameData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(buildGameDataMaps).mockReturnValue(mockGameData);
      vi.mocked(buildGameDataIndices).mockReturnValue(mockIndices);

      await gameDataStore.getState().loadGameData();

      const data = gameDataStore.getState().getGameData();
      expect(data).toBe(mockGameData);
    });

    it("should throw when game data is not loaded", () => {
      expect(() => gameDataStore.getState().getGameData()).toThrow(
        "Game data not loaded. Call loadGameData() first."
      );
    });
  });

  describe("getIndices", () => {
    it("should return indices when loaded", async () => {
      vi.mocked(loadRawGameData).mockResolvedValue(mockRawGameData);
      vi.mocked(validateGameData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(buildGameDataMaps).mockReturnValue(mockGameData);
      vi.mocked(buildGameDataIndices).mockReturnValue(mockIndices);

      await gameDataStore.getState().loadGameData();

      const indices = gameDataStore.getState().getIndices();
      expect(indices).toBe(mockIndices);
    });

    it("should throw when indices are not loaded", () => {
      expect(() => gameDataStore.getState().getIndices()).toThrow(
        "Game data indices not loaded. Call loadGameData() first."
      );
    });
  });
});

describe("React hooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetStore();
  });

  afterEach(() => {
    // Reset store synchronously
    resetStore();
  });

  describe("useGameData", () => {
    it("should return game data when loaded", () => {
      // Set up loaded state before rendering hook
      gameDataStore.setState({
        gameData: mockGameData,
        indices: mockIndices,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      const { result, unmount } = renderHook(() => useGameData());
      expect(result.current).toBe(mockGameData);
      unmount(); // Clean up before state reset
    });

    // Note: Testing that useGameData throws when not loaded is covered
    // by the store's getGameData tests. Testing hooks that throw during
    // render with renderHook() is not straightforward in React 19.
  });

  describe("useGameDataOrNull", () => {
    it("should return game data when loaded", () => {
      gameDataStore.setState({
        gameData: mockGameData,
        indices: mockIndices,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      const { result, unmount } = renderHook(() => useGameDataOrNull());
      expect(result.current).toBe(mockGameData);
      unmount();
    });

    it("should return null when game data is not loaded", () => {
      const { result, unmount } = renderHook(() => useGameDataOrNull());
      expect(result.current).toBeNull();
      unmount();
    });
  });

  describe("useGameDataLoading", () => {
    it("should return correct initial state", () => {
      const { result, unmount } = renderHook(() => useGameDataLoading());

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      unmount();
    });

    it("should return loading state", () => {
      gameDataStore.setState({
        gameData: null,
        indices: null,
        isLoading: true,
        error: null,
        lastUpdated: null,
      });

      const { result, unmount } = renderHook(() => useGameDataLoading());

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      unmount();
    });

    it("should return error state", () => {
      gameDataStore.setState({
        gameData: null,
        indices: null,
        isLoading: false,
        error: "Something went wrong",
        lastUpdated: null,
      });

      const { result, unmount } = renderHook(() => useGameDataLoading());

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe("Something went wrong");
      unmount();
    });

    it("should return loaded state with data", () => {
      gameDataStore.setState({
        gameData: mockGameData,
        indices: mockIndices,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      const { result, unmount } = renderHook(() => useGameDataLoading());

      expect(result.current.data).toBe(mockGameData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      unmount();
    });

    it("should update when state changes", async () => {
      const { result, unmount } = renderHook(() => useGameDataLoading());

      // Initial state
      expect(result.current.isLoading).toBe(false);

      // Update to loading
      act(() => {
        gameDataStore.setState({ isLoading: true });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Update to loaded
      act(() => {
        gameDataStore.setState({
          gameData: mockGameData,
          indices: mockIndices,
          isLoading: false,
          lastUpdated: new Date(),
        });
      });

      await waitFor(() => {
        expect(result.current.data).toBe(mockGameData);
        expect(result.current.isLoading).toBe(false);
      });

      unmount();
    });
  });

  describe("useGameDataIndices", () => {
    it("should return indices when loaded", () => {
      gameDataStore.setState({
        gameData: mockGameData,
        indices: mockIndices,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      const { result, unmount } = renderHook(() => useGameDataIndices());
      expect(result.current).toBe(mockIndices);
      unmount();
    });

    // Note: Testing that useGameDataIndices throws when not loaded is covered
    // by the store's getIndices tests. Testing hooks that throw during
    // render with renderHook() is not straightforward in React 19.
  });
});
