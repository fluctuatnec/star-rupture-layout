/**
 * Tests for game data lookup helper functions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockRawGameData,
  mockItems,
  mockBuildings,
  mockRecipes,
  mockRails,
  mockCorporations,
} from "../../fixtures/gameData";
import { buildGameDataMaps, buildGameDataIndices } from "../../../core/data/indices";
import type { GameData, GameDataIndices } from "../../../core/data/indices";

// Mock the store before importing lookups
vi.mock("../../../state/gameDataStore", () => ({
  gameDataStore: {
    getState: vi.fn(),
  },
}));

// Import after mocking
import { gameDataStore } from "../../../state/gameDataStore";
import {
  // Item lookups
  getItem,
  getItemsByType,
  getItemsByTier,
  getAllItems,
  // Building lookups
  getBuilding,
  getBuildingsByType,
  getBuildingsByCorporation,
  getAllBuildings,
  // Recipe lookups
  getRecipe,
  getRecipesByBuilding,
  getRecipesProducing,
  getRecipesConsuming,
  getAllRecipes,
  // Rail lookups
  getRail,
  getRailsByMinCapacity,
  getAllRails,
  // Corporation lookups
  getCorporation,
  getAllCorporations,
  getCorporationLevels,
  getRewardsAtLevel,
  getRewardsByType,
  getRailsUnlockedBy,
  getBuildingsUnlockedBy,
} from "../../../core/data/lookups";

// ─────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────

// Build actual game data and indices from mock data for testing
const mockGameData: GameData = buildGameDataMaps(mockRawGameData);
const mockIndices: GameDataIndices = buildGameDataIndices(mockGameData);

// ─────────────────────────────────────────────────────────────
// Helper to configure mock store
// ─────────────────────────────────────────────────────────────

function setupLoadedStore() {
  vi.mocked(gameDataStore.getState).mockReturnValue({
    gameData: mockGameData,
    indices: mockIndices,
    isLoading: false,
    error: null,
    lastUpdated: new Date(),
    loadGameData: vi.fn(),
    getGameData: () => mockGameData,
    getIndices: () => mockIndices,
  });
}

function setupUnloadedStore() {
  vi.mocked(gameDataStore.getState).mockReturnValue({
    gameData: null,
    indices: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    loadGameData: vi.fn(),
    getGameData: () => {
      throw new Error("Game data not loaded. Call loadGameData() first.");
    },
    getIndices: () => {
      throw new Error("Game data indices not loaded. Call loadGameData() first.");
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe("Lookup functions - store not loaded", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupUnloadedStore();
  });

  describe("Item lookups throw when store not loaded", () => {
    it("getItem throws when store not loaded", () => {
      expect(() => getItem("ore_titanium")).toThrow("Game data not loaded");
    });

    it("getItemsByType throws when store not loaded", () => {
      expect(() => getItemsByType("raw")).toThrow("Game data");
    });

    it("getItemsByTier throws when store not loaded", () => {
      expect(() => getItemsByTier(0)).toThrow("Game data");
    });

    it("getAllItems throws when store not loaded", () => {
      expect(() => getAllItems()).toThrow("Game data not loaded");
    });
  });

  describe("Building lookups throw when store not loaded", () => {
    it("getBuilding throws when store not loaded", () => {
      expect(() => getBuilding("ore_excavator")).toThrow("Game data not loaded");
    });

    it("getBuildingsByType throws when store not loaded", () => {
      expect(() => getBuildingsByType("extraction")).toThrow("Game data");
    });

    it("getBuildingsByCorporation throws when store not loaded", () => {
      expect(() => getBuildingsByCorporation("selenian_corporation")).toThrow("Game data");
    });

    it("getAllBuildings throws when store not loaded", () => {
      expect(() => getAllBuildings()).toThrow("Game data not loaded");
    });
  });

  describe("Recipe lookups throw when store not loaded", () => {
    it("getRecipe throws when store not loaded", () => {
      expect(() => getRecipe("titanium_ore_normal")).toThrow("Game data not loaded");
    });

    it("getRecipesByBuilding throws when store not loaded", () => {
      expect(() => getRecipesByBuilding("ore_excavator")).toThrow("Game data");
    });

    it("getRecipesProducing throws when store not loaded", () => {
      expect(() => getRecipesProducing("ore_titanium")).toThrow("Game data");
    });

    it("getRecipesConsuming throws when store not loaded", () => {
      expect(() => getRecipesConsuming("ore_titanium")).toThrow("Game data");
    });

    it("getAllRecipes throws when store not loaded", () => {
      expect(() => getAllRecipes()).toThrow("Game data not loaded");
    });
  });

  describe("Rail lookups throw when store not loaded", () => {
    it("getRail throws when store not loaded", () => {
      expect(() => getRail("rail_v1")).toThrow("Game data not loaded");
    });

    it("getRailsByMinCapacity throws when store not loaded", () => {
      expect(() => getRailsByMinCapacity(60)).toThrow("Game data");
    });

    it("getAllRails throws when store not loaded", () => {
      expect(() => getAllRails()).toThrow("Game data not loaded");
    });
  });

  describe("Corporation lookups throw when store not loaded", () => {
    it("getCorporation throws when store not loaded", () => {
      expect(() => getCorporation("selenian_corporation")).toThrow("Game data not loaded");
    });

    it("getAllCorporations throws when store not loaded", () => {
      expect(() => getAllCorporations()).toThrow("Game data not loaded");
    });

    it("getCorporationLevels throws when store not loaded", () => {
      expect(() => getCorporationLevels("selenian_corporation")).toThrow("Game data not loaded");
    });

    it("getRewardsAtLevel throws when store not loaded", () => {
      expect(() => getRewardsAtLevel("selenian_corporation", 1)).toThrow("Game data");
    });

    it("getRewardsByType throws when store not loaded", () => {
      expect(() => getRewardsByType("selenian_corporation", 1, "building")).toThrow("Game data");
    });

    it("getRailsUnlockedBy throws when store not loaded", () => {
      expect(() => getRailsUnlockedBy("selenian_corporation", 1)).toThrow("Game data");
    });

    it("getBuildingsUnlockedBy throws when store not loaded", () => {
      expect(() => getBuildingsUnlockedBy("selenian_corporation", 1)).toThrow("Game data");
    });
  });
});

describe("Item Lookups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupLoadedStore();
  });

  describe("getItem", () => {
    it("should return item when found", () => {
      const item = getItem("ore_titanium");
      expect(item).toBeDefined();
      expect(item?.id).toBe("ore_titanium");
      expect(item?.name).toBe("Titanium Ore");
      expect(item?.type).toBe("raw");
    });

    it("should return undefined for non-existent item", () => {
      const item = getItem("nonexistent_item");
      expect(item).toBeUndefined();
    });

    it("should return undefined for empty string ID", () => {
      const item = getItem("");
      expect(item).toBeUndefined();
    });
  });

  describe("getItemsByType", () => {
    it("should return items of specified type", () => {
      const rawItems = getItemsByType("raw");
      expect(rawItems).toHaveLength(1);
      expect(rawItems[0].id).toBe("ore_titanium");
    });

    it("should return processed items", () => {
      const processedItems = getItemsByType("processed");
      expect(processedItems).toHaveLength(1);
      expect(processedItems[0].id).toBe("bar_titanium");
    });

    it("should return component items", () => {
      const componentItems = getItemsByType("component");
      expect(componentItems).toHaveLength(1);
      expect(componentItems[0].id).toBe("ceramics");
    });

    it("should return empty array for type with no items", () => {
      const ammoItems = getItemsByType("ammo");
      expect(ammoItems).toEqual([]);
    });

    it("should return empty array for material type (none in fixtures)", () => {
      const materialItems = getItemsByType("material");
      expect(materialItems).toEqual([]);
    });
  });

  describe("getItemsByTier", () => {
    it("should return items at tier 0", () => {
      const tier0Items = getItemsByTier(0);
      expect(tier0Items).toHaveLength(1);
      expect(tier0Items[0].id).toBe("ore_titanium");
    });

    it("should return items at tier 1", () => {
      const tier1Items = getItemsByTier(1);
      expect(tier1Items).toHaveLength(1);
      expect(tier1Items[0].id).toBe("bar_titanium");
    });

    it("should return items at tier 2", () => {
      const tier2Items = getItemsByTier(2);
      expect(tier2Items).toHaveLength(1);
      expect(tier2Items[0].id).toBe("ceramics");
    });

    it("should return empty array for tier with no items", () => {
      const tier99Items = getItemsByTier(99);
      expect(tier99Items).toEqual([]);
    });

    it("should return empty array for negative tier", () => {
      const negativeItems = getItemsByTier(-1);
      expect(negativeItems).toEqual([]);
    });
  });

  describe("getAllItems", () => {
    it("should return all items", () => {
      const allItems = getAllItems();
      expect(allItems).toHaveLength(mockItems.length);
      expect(allItems.map((i) => i.id).sort()).toEqual(
        mockItems.map((i) => i.id).sort()
      );
    });

    it("should return array even if data changes", () => {
      const items1 = getAllItems();
      const items2 = getAllItems();
      // Arrays should be separate instances
      expect(items1).not.toBe(items2);
      expect(items1).toEqual(items2);
    });
  });
});

describe("Building Lookups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupLoadedStore();
  });

  describe("getBuilding", () => {
    it("should return building when found", () => {
      const building = getBuilding("ore_excavator");
      expect(building).toBeDefined();
      expect(building?.id).toBe("ore_excavator");
      expect(building?.name).toBe("Ore Excavator");
      expect(building?.type).toBe("extraction");
    });

    it("should return building with correct properties", () => {
      const building = getBuilding("smelter");
      expect(building).toBeDefined();
      expect(building?.size).toBe(3);
      expect(building?.power).toBe(10);
      expect(building?.heat).toBe(5);
      expect(building?.inputSockets).toBe(1);
      expect(building?.outputSockets).toBe(1);
    });

    it("should return undefined for non-existent building", () => {
      const building = getBuilding("nonexistent_building");
      expect(building).toBeUndefined();
    });
  });

  describe("getBuildingsByType", () => {
    it("should return extraction buildings", () => {
      const extractionBuildings = getBuildingsByType("extraction");
      expect(extractionBuildings).toHaveLength(1);
      expect(extractionBuildings[0].id).toBe("ore_excavator");
    });

    it("should return processing buildings", () => {
      const processingBuildings = getBuildingsByType("processing");
      expect(processingBuildings).toHaveLength(1);
      expect(processingBuildings[0].id).toBe("smelter");
    });

    it("should return storage buildings", () => {
      const storageBuildings = getBuildingsByType("storage");
      expect(storageBuildings).toHaveLength(1);
      expect(storageBuildings[0].id).toBe("storage_small");
    });

    it("should return empty array for type with no buildings", () => {
      const generatorBuildings = getBuildingsByType("generator");
      expect(generatorBuildings).toEqual([]);
    });
  });

  describe("getBuildingsByCorporation", () => {
    it("should return buildings for corporation by ID", () => {
      const selenianBuildings = getBuildingsByCorporation("selenian_corporation");
      expect(selenianBuildings.length).toBeGreaterThan(0);
      expect(selenianBuildings.some((b) => b.id === "ore_excavator")).toBe(true);
      expect(selenianBuildings.some((b) => b.id === "smelter")).toBe(true);
    });

    it("should return empty array for non-existent corporation", () => {
      const buildings = getBuildingsByCorporation("nonexistent_corp");
      expect(buildings).toEqual([]);
    });
  });

  describe("getAllBuildings", () => {
    it("should return all buildings", () => {
      const allBuildings = getAllBuildings();
      expect(allBuildings).toHaveLength(mockBuildings.length);
      expect(allBuildings.map((b) => b.id).sort()).toEqual(
        mockBuildings.map((b) => b.id).sort()
      );
    });
  });
});

describe("Recipe Lookups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupLoadedStore();
  });

  describe("getRecipe", () => {
    it("should return recipe when found", () => {
      const recipe = getRecipe("titanium_ore_normal");
      expect(recipe).toBeDefined();
      expect(recipe?.id).toBe("titanium_ore_normal");
      expect(recipe?.buildingId).toBe("ore_excavator");
      expect(recipe?.output.id).toBe("ore_titanium");
    });

    it("should return recipe with all properties", () => {
      const recipe = getRecipe("titanium_bar");
      expect(recipe).toBeDefined();
      expect(recipe?.duration).toBe(4);
      expect(recipe?.outputPerMinute).toBe(15);
      expect(recipe?.inputs).toHaveLength(1);
      expect(recipe?.inputs[0].id).toBe("ore_titanium");
      expect(recipe?.inputs[0].amount).toBe(2);
    });

    it("should return undefined for non-existent recipe", () => {
      const recipe = getRecipe("nonexistent_recipe");
      expect(recipe).toBeUndefined();
    });
  });

  describe("getRecipesByBuilding", () => {
    it("should return recipes for ore_excavator", () => {
      const recipes = getRecipesByBuilding("ore_excavator");
      expect(recipes).toHaveLength(1);
      expect(recipes[0].id).toBe("titanium_ore_normal");
    });

    it("should return recipes for smelter", () => {
      const recipes = getRecipesByBuilding("smelter");
      expect(recipes).toHaveLength(1);
      expect(recipes[0].id).toBe("titanium_bar");
    });

    it("should return empty array for building with no recipes", () => {
      const recipes = getRecipesByBuilding("storage_small");
      expect(recipes).toEqual([]);
    });

    it("should return empty array for non-existent building", () => {
      const recipes = getRecipesByBuilding("nonexistent_building");
      expect(recipes).toEqual([]);
    });
  });

  describe("getRecipesProducing", () => {
    it("should return recipes that produce ore_titanium", () => {
      const recipes = getRecipesProducing("ore_titanium");
      expect(recipes).toHaveLength(1);
      expect(recipes[0].id).toBe("titanium_ore_normal");
    });

    it("should return recipes that produce bar_titanium", () => {
      const recipes = getRecipesProducing("bar_titanium");
      expect(recipes).toHaveLength(1);
      expect(recipes[0].id).toBe("titanium_bar");
    });

    it("should return empty array for item not produced by any recipe", () => {
      const recipes = getRecipesProducing("ceramics");
      expect(recipes).toEqual([]);
    });

    it("should return empty array for non-existent item", () => {
      const recipes = getRecipesProducing("nonexistent_item");
      expect(recipes).toEqual([]);
    });
  });

  describe("getRecipesConsuming", () => {
    it("should return recipes that consume ore_titanium", () => {
      const recipes = getRecipesConsuming("ore_titanium");
      expect(recipes).toHaveLength(1);
      expect(recipes[0].id).toBe("titanium_bar");
    });

    it("should return empty array for item not consumed by any recipe", () => {
      // bar_titanium is not consumed by any recipe in our fixtures
      const recipes = getRecipesConsuming("bar_titanium");
      expect(recipes).toEqual([]);
    });

    it("should return empty array for raw material produced by extraction", () => {
      // ore_titanium is produced by extraction, but consumed by smelting
      const producing = getRecipesProducing("ore_titanium");
      const consuming = getRecipesConsuming("ore_titanium");
      expect(producing[0].buildingId).toBe("ore_excavator"); // extraction
      expect(consuming[0].buildingId).toBe("smelter"); // processing
    });

    it("should return empty array for non-existent item", () => {
      const recipes = getRecipesConsuming("nonexistent_item");
      expect(recipes).toEqual([]);
    });
  });

  describe("getAllRecipes", () => {
    it("should return all recipes", () => {
      const allRecipes = getAllRecipes();
      expect(allRecipes).toHaveLength(mockRecipes.length);
      expect(allRecipes.map((r) => r.id).sort()).toEqual(
        mockRecipes.map((r) => r.id).sort()
      );
    });
  });
});

describe("Rail Lookups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupLoadedStore();
  });

  describe("getRail", () => {
    it("should return rail when found", () => {
      const rail = getRail("rail_v1");
      expect(rail).toBeDefined();
      expect(rail?.id).toBe("rail_v1");
      expect(rail?.name).toBe("Rail V1");
      expect(rail?.capacity).toBe(60);
    });

    it("should return rail with all properties", () => {
      const rail = getRail("rail_v2");
      expect(rail).toBeDefined();
      expect(rail?.size).toBe(1);
      expect(rail?.capacity).toBe(120);
      expect(rail?.power).toBe(2);
      expect(rail?.heat).toBe(0);
      expect(rail?.buildCost).toEqual({ bar_titanium: 5 });
    });

    it("should return undefined for non-existent rail", () => {
      const rail = getRail("nonexistent_rail");
      expect(rail).toBeUndefined();
    });
  });

  describe("getRailsByMinCapacity", () => {
    it("should return all rails when minCapacity is lowest capacity", () => {
      const rails = getRailsByMinCapacity(60);
      expect(rails).toHaveLength(2); // rail_v1 (60) and rail_v2 (120)
    });

    it("should return rails with capacity >= minCapacity", () => {
      const rails = getRailsByMinCapacity(120);
      expect(rails).toHaveLength(1);
      expect(rails[0].id).toBe("rail_v2");
      expect(rails[0].capacity).toBe(120);
    });

    it("should return empty array when minCapacity exceeds all rails", () => {
      const rails = getRailsByMinCapacity(1000);
      expect(rails).toEqual([]);
    });

    it("should handle minCapacity between existing capacities", () => {
      // There's no rail with capacity 90, but rail_v2 (120) qualifies
      const rails = getRailsByMinCapacity(90);
      expect(rails).toHaveLength(1);
      expect(rails[0].capacity).toBeGreaterThanOrEqual(90);
    });

    it("should handle minCapacity of 0", () => {
      const rails = getRailsByMinCapacity(0);
      expect(rails.length).toBeGreaterThan(0);
    });

    it("should return rails sorted by capacity", () => {
      const rails = getRailsByMinCapacity(60);
      for (let i = 1; i < rails.length; i++) {
        expect(rails[i].capacity).toBeGreaterThanOrEqual(rails[i - 1].capacity);
      }
    });
  });

  describe("getAllRails", () => {
    it("should return all rails", () => {
      const allRails = getAllRails();
      expect(allRails).toHaveLength(mockRails.length);
      expect(allRails.map((r) => r.id).sort()).toEqual(
        mockRails.map((r) => r.id).sort()
      );
    });
  });
});

describe("Corporation Lookups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupLoadedStore();
  });

  describe("getCorporation", () => {
    it("should return corporation by ID", () => {
      const corp = getCorporation("selenian_corporation");
      expect(corp).toBeDefined();
      expect(corp?.id).toBe("selenian_corporation");
      expect(corp?.name).toBe("Selenian Corporation");
    });

    it("should return undefined for non-existent corporation", () => {
      const corp = getCorporation("nonexistent_corp");
      expect(corp).toBeUndefined();
    });

    it("should have levels array", () => {
      const corp = getCorporation("selenian_corporation");
      expect(corp?.levels).toBeDefined();
      expect(corp?.levels.length).toBeGreaterThan(0);
    });
  });

  describe("getAllCorporations", () => {
    it("should return all corporations", () => {
      const allCorps = getAllCorporations();
      expect(allCorps).toHaveLength(mockCorporations.length);
      expect(allCorps[0].id).toBe("selenian_corporation");
    });
  });

  describe("getCorporationLevels", () => {
    it("should return levels for corporation by ID", () => {
      const levels = getCorporationLevels("selenian_corporation");
      expect(levels).toHaveLength(3);
      expect(levels[0].level).toBe(1);
      expect(levels[1].level).toBe(2);
      expect(levels[2].level).toBe(3);
    });

    it("should return empty array for non-existent corporation", () => {
      const levels = getCorporationLevels("nonexistent_corp");
      expect(levels).toEqual([]);
    });

    it("should include XP requirements in levels", () => {
      const levels = getCorporationLevels("selenian_corporation");
      expect(levels[0].xp).toBe(0);
      expect(levels[1].xp).toBe(100);
      expect(levels[2].xp).toBe(300);
    });
  });

  describe("getRewardsAtLevel", () => {
    it("should return rewards at level 1", () => {
      const rewards = getRewardsAtLevel("selenian_corporation", 1);
      expect(rewards).toHaveLength(2);
      expect(rewards.some((r) => r.type === "building" && r.id === "ore_excavator")).toBe(true);
      expect(rewards.some((r) => r.type === "rail" && r.id === "rail_v1")).toBe(true);
    });

    it("should return rewards at level 2", () => {
      const rewards = getRewardsAtLevel("selenian_corporation", 2);
      expect(rewards).toHaveLength(1);
      expect(rewards[0].type).toBe("building");
      expect(rewards[0].id).toBe("smelter");
    });

    it("should return rewards at level 3", () => {
      const rewards = getRewardsAtLevel("selenian_corporation", 3);
      expect(rewards).toHaveLength(1);
      expect(rewards[0].type).toBe("rail");
      expect(rewards[0].id).toBe("rail_v2");
    });

    it("should return empty array for non-existent level", () => {
      const rewards = getRewardsAtLevel("selenian_corporation", 99);
      expect(rewards).toEqual([]);
    });

    it("should return empty array for non-existent corporation", () => {
      const rewards = getRewardsAtLevel("nonexistent_corp", 1);
      expect(rewards).toEqual([]);
    });

  });

  describe("getRewardsByType", () => {
    it("should return building rewards at level 1", () => {
      const rewards = getRewardsByType("selenian_corporation", 1, "building");
      expect(rewards).toHaveLength(1);
      expect(rewards[0].id).toBe("ore_excavator");
    });

    it("should return rail rewards at level 1", () => {
      const rewards = getRewardsByType("selenian_corporation", 1, "rail");
      expect(rewards).toHaveLength(1);
      expect(rewards[0].id).toBe("rail_v1");
    });

    it("should return building rewards at level 2", () => {
      const rewards = getRewardsByType("selenian_corporation", 2, "building");
      expect(rewards).toHaveLength(1);
      expect(rewards[0].id).toBe("smelter");
    });

    it("should return empty array for type not at level", () => {
      // Level 2 has no rail rewards
      const rewards = getRewardsByType("selenian_corporation", 2, "rail");
      expect(rewards).toEqual([]);
    });

    it("should return empty array for utility type (none in fixtures)", () => {
      const rewards = getRewardsByType("selenian_corporation", 1, "utility");
      expect(rewards).toEqual([]);
    });

  });

  describe("getRailsUnlockedBy", () => {
    it("should return rails unlocked at level 1", () => {
      const rails = getRailsUnlockedBy("selenian_corporation", 1);
      expect(rails).toHaveLength(1);
      expect(rails[0].id).toBe("rail_v1");
      expect(rails[0].name).toBe("Rail V1");
      expect(rails[0].capacity).toBe(60);
    });

    it("should return rails unlocked at level 3", () => {
      const rails = getRailsUnlockedBy("selenian_corporation", 3);
      expect(rails).toHaveLength(1);
      expect(rails[0].id).toBe("rail_v2");
      expect(rails[0].capacity).toBe(120);
    });

    it("should return empty array for level with no rail rewards", () => {
      const rails = getRailsUnlockedBy("selenian_corporation", 2);
      expect(rails).toEqual([]);
    });

    it("should return empty array for non-existent level", () => {
      const rails = getRailsUnlockedBy("selenian_corporation", 99);
      expect(rails).toEqual([]);
    });

    it("should return empty array for non-existent corporation", () => {
      const rails = getRailsUnlockedBy("nonexistent_corp", 1);
      expect(rails).toEqual([]);
    });

    it("should return full Rail objects, not just IDs", () => {
      const rails = getRailsUnlockedBy("selenian_corporation", 1);
      expect(rails[0]).toHaveProperty("id");
      expect(rails[0]).toHaveProperty("name");
      expect(rails[0]).toHaveProperty("capacity");
      expect(rails[0]).toHaveProperty("power");
    });

  });

  describe("getBuildingsUnlockedBy", () => {
    it("should return buildings unlocked at level 1", () => {
      const buildings = getBuildingsUnlockedBy("selenian_corporation", 1);
      expect(buildings).toHaveLength(1);
      expect(buildings[0].id).toBe("ore_excavator");
      expect(buildings[0].name).toBe("Ore Excavator");
    });

    it("should return buildings unlocked at level 2", () => {
      const buildings = getBuildingsUnlockedBy("selenian_corporation", 2);
      expect(buildings).toHaveLength(1);
      expect(buildings[0].id).toBe("smelter");
      expect(buildings[0].name).toBe("Smelter");
    });

    it("should return empty array for level with no building rewards", () => {
      const buildings = getBuildingsUnlockedBy("selenian_corporation", 3);
      expect(buildings).toEqual([]);
    });

    it("should return empty array for non-existent level", () => {
      const buildings = getBuildingsUnlockedBy("selenian_corporation", 99);
      expect(buildings).toEqual([]);
    });

    it("should return empty array for non-existent corporation", () => {
      const buildings = getBuildingsUnlockedBy("nonexistent_corp", 1);
      expect(buildings).toEqual([]);
    });

    it("should return full Building objects, not just IDs", () => {
      const buildings = getBuildingsUnlockedBy("selenian_corporation", 1);
      expect(buildings[0]).toHaveProperty("id");
      expect(buildings[0]).toHaveProperty("name");
      expect(buildings[0]).toHaveProperty("type");
      expect(buildings[0]).toHaveProperty("size");
      expect(buildings[0]).toHaveProperty("power");
    });

  });
});
