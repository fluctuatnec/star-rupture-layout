import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadRawGameData, GameDataLoadError } from "../../../core/data/loader";
import {
  mockItems,
  mockBuildings,
  mockRecipes,
  mockRails,
  mockCorporations,
  invalidJsonString,
} from "../../fixtures/gameData";

describe("loadRawGameData", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /**
   * Creates a mock fetch that returns different data based on URL
   */
  function mockFetch(
    overrides: Partial<Record<string, unknown>> = {},
    options: { failUrl?: string; invalidJsonUrl?: string; networkError?: boolean } = {}
  ) {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      // Simulate network error
      if (options.networkError) {
        throw new Error("Network error");
      }

      // Simulate 404 for specific URL
      if (options.failUrl && url.includes(options.failUrl)) {
        return {
          ok: false,
          status: 404,
          json: async () => {
            throw new Error("Not found");
          },
        };
      }

      // Simulate invalid JSON for specific URL
      if (options.invalidJsonUrl && url.includes(options.invalidJsonUrl)) {
        return {
          ok: true,
          json: async () => {
            throw new SyntaxError(`Unexpected token 'i', "${invalidJsonString}" is not valid JSON`);
          },
        };
      }

      // Return mock data based on URL
      let data: unknown;
      if (url.includes("items_catalog.json")) {
        data = overrides.items ?? mockItems;
      } else if (url.includes("buildings.json")) {
        data = overrides.buildings ?? mockBuildings;
      } else if (url.includes("recipes.json")) {
        data = overrides.recipes ?? mockRecipes;
      } else if (url.includes("rails.json")) {
        data = overrides.rails ?? mockRails;
      } else if (url.includes("corporations_components.json")) {
        data = overrides.corporations ?? mockCorporations;
      } else {
        return { ok: false, status: 404 };
      }

      return {
        ok: true,
        json: async () => data,
      };
    });
  }

  describe("successful loading", () => {
    it("should load all 5 JSON files and return RawGameData", async () => {
      mockFetch();

      const result = await loadRawGameData();

      expect(result.items).toEqual(mockItems);
      expect(result.buildings).toEqual(mockBuildings);
      expect(result.recipes).toEqual(mockRecipes);
      expect(result.rails).toEqual(mockRails);
      expect(result.corporations).toEqual(mockCorporations);
    });

    it("should call fetch for all 5 data files", async () => {
      mockFetch();

      await loadRawGameData();

      expect(globalThis.fetch).toHaveBeenCalledTimes(5);
      expect(globalThis.fetch).toHaveBeenCalledWith("/data/items_catalog.json");
      expect(globalThis.fetch).toHaveBeenCalledWith("/data/buildings.json");
      expect(globalThis.fetch).toHaveBeenCalledWith("/data/recipes.json");
      expect(globalThis.fetch).toHaveBeenCalledWith("/data/rails.json");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/data/corporations_components.json"
      );
    });

    it("should handle empty arrays in data files", async () => {
      mockFetch({
        items: [],
        buildings: [],
        recipes: [],
        rails: [],
        corporations: [],
      });

      const result = await loadRawGameData();

      expect(result.items).toEqual([]);
      expect(result.buildings).toEqual([]);
      expect(result.recipes).toEqual([]);
      expect(result.rails).toEqual([]);
      expect(result.corporations).toEqual([]);
    });
  });

  describe("error handling - missing files (404)", () => {
    it("should throw GameDataLoadError when items file is missing", async () => {
      mockFetch({}, { failUrl: "items_catalog.json" });

      await expect(loadRawGameData()).rejects.toThrow(GameDataLoadError);
      await expect(loadRawGameData()).rejects.toThrow(
        /Game data file not found: items_catalog\.json/
      );
    });

    it("should throw GameDataLoadError when buildings file is missing", async () => {
      mockFetch({}, { failUrl: "buildings.json" });

      await expect(loadRawGameData()).rejects.toThrow(GameDataLoadError);
      await expect(loadRawGameData()).rejects.toThrow(
        /Game data file not found: buildings\.json/
      );
    });

    it("should throw GameDataLoadError when recipes file is missing", async () => {
      mockFetch({}, { failUrl: "recipes.json" });

      await expect(loadRawGameData()).rejects.toThrow(GameDataLoadError);
      await expect(loadRawGameData()).rejects.toThrow(
        /Game data file not found: recipes\.json/
      );
    });

    it("should throw GameDataLoadError when rails file is missing", async () => {
      mockFetch({}, { failUrl: "rails.json" });

      await expect(loadRawGameData()).rejects.toThrow(GameDataLoadError);
      await expect(loadRawGameData()).rejects.toThrow(
        /Game data file not found: rails\.json/
      );
    });

    it("should throw GameDataLoadError when corporations file is missing", async () => {
      mockFetch({}, { failUrl: "corporations_components.json" });

      await expect(loadRawGameData()).rejects.toThrow(GameDataLoadError);
      await expect(loadRawGameData()).rejects.toThrow(
        /Game data file not found: corporations_components\.json/
      );
    });

    it("should include HTTP status in error message", async () => {
      mockFetch({}, { failUrl: "items_catalog.json" });

      await expect(loadRawGameData()).rejects.toThrow(/HTTP 404/);
    });
  });

  describe("error handling - invalid JSON", () => {
    it("should throw GameDataLoadError when items file has invalid JSON", async () => {
      mockFetch({}, { invalidJsonUrl: "items_catalog.json" });

      await expect(loadRawGameData()).rejects.toThrow(GameDataLoadError);
      await expect(loadRawGameData()).rejects.toThrow(
        /Invalid JSON in game data file: items_catalog\.json/
      );
    });

    it("should throw GameDataLoadError when buildings file has invalid JSON", async () => {
      mockFetch({}, { invalidJsonUrl: "buildings.json" });

      await expect(loadRawGameData()).rejects.toThrow(GameDataLoadError);
      await expect(loadRawGameData()).rejects.toThrow(
        /Invalid JSON in game data file: buildings\.json/
      );
    });

    it("should throw GameDataLoadError when recipes file has invalid JSON", async () => {
      mockFetch({}, { invalidJsonUrl: "recipes.json" });

      await expect(loadRawGameData()).rejects.toThrow(GameDataLoadError);
      await expect(loadRawGameData()).rejects.toThrow(
        /Invalid JSON in game data file: recipes\.json/
      );
    });
  });

  describe("error handling - network errors", () => {
    it("should throw GameDataLoadError on network failure", async () => {
      mockFetch({}, { networkError: true });

      await expect(loadRawGameData()).rejects.toThrow(GameDataLoadError);
      await expect(loadRawGameData()).rejects.toThrow(
        /Failed to fetch game data file/
      );
    });
  });

  describe("GameDataLoadError", () => {
    it("should have correct name property", () => {
      const error = new GameDataLoadError("test message");
      expect(error.name).toBe("GameDataLoadError");
    });

    it("should store filename", () => {
      const error = new GameDataLoadError("test message", "test.json");
      expect(error.filename).toBe("test.json");
    });

    it("should store cause error", () => {
      const cause = new Error("original error");
      const error = new GameDataLoadError("test message", "test.json", cause);
      expect(error.cause).toBe(cause);
    });
  });
});
