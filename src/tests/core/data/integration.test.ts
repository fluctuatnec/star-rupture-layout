/**
 * Integration tests for game data loading with real data files
 * Tests the full pipeline: load -> validate -> build indices -> lookups
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import type { RawGameData } from "../../../core/data/loader";
import { validateGameData } from "../../../core/data/validator";
import { buildGameDataMaps, buildGameDataIndices } from "../../../core/data/indices";
import type { GameData } from "../../../core/types/game";
import type { GameDataIndices } from "../../../core/data/indices";

// ─────────────────────────────────────────────────────────────
// Test Data Loading
// ─────────────────────────────────────────────────────────────

/**
 * Loads actual JSON files from the /data directory
 * Uses fs.readFileSync for Node.js environment
 */
function loadRealDataFiles(): RawGameData {
  const dataDir = join(process.cwd(), "data");

  return {
    items: JSON.parse(readFileSync(join(dataDir, "items_catalog.json"), "utf-8")),
    buildings: JSON.parse(readFileSync(join(dataDir, "buildings.json"), "utf-8")),
    recipes: JSON.parse(readFileSync(join(dataDir, "recipes.json"), "utf-8")),
    rails: JSON.parse(readFileSync(join(dataDir, "rails.json"), "utf-8")),
    corporations: JSON.parse(
      readFileSync(join(dataDir, "corporations_components.json"), "utf-8")
    ),
  };
}

// ─────────────────────────────────────────────────────────────
// Integration Tests
// ─────────────────────────────────────────────────────────────

describe("Game Data Integration Tests", () => {
  let rawData: RawGameData;
  let gameData: GameData;
  let indices: GameDataIndices;
  let loadTimeMs: number;

  beforeAll(() => {
    // Measure load time
    const startTime = performance.now();

    // Load all data files
    rawData = loadRealDataFiles();

    // Validate data
    const validationResult = validateGameData(rawData);
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      throw new Error(
        `Data validation failed with ${validationResult.errors.length} errors`
      );
    }

    // Build Maps and indices
    gameData = buildGameDataMaps(rawData);
    indices = buildGameDataIndices(gameData);

    loadTimeMs = performance.now() - startTime;

    // Log performance
    console.log(`\n📊 Load time: ${loadTimeMs.toFixed(2)}ms`);
    console.log(`   Items: ${rawData.items.length}`);
    console.log(`   Buildings: ${rawData.buildings.length}`);
    console.log(`   Recipes: ${rawData.recipes.length}`);
    console.log(`   Rails: ${rawData.rails.length}`);
    console.log(`   Corporations: ${rawData.corporations.length}\n`);
  });

  describe("Data Loading", () => {
    it("should load all 5 JSON files successfully", () => {
      expect(rawData.items.length).toBeGreaterThan(0);
      expect(rawData.buildings.length).toBeGreaterThan(0);
      expect(rawData.recipes.length).toBeGreaterThan(0);
      expect(rawData.rails.length).toBeGreaterThan(0);
      expect(rawData.corporations.length).toBeGreaterThan(0);
    });

    it("should complete within 500ms performance requirement", () => {
      expect(loadTimeMs).toBeLessThan(500);
    });

    it("should ideally complete within 100ms (target)", () => {
      // This is a soft goal, not a hard requirement
      if (loadTimeMs > 100) {
        console.warn(`⚠️ Load time ${loadTimeMs.toFixed(2)}ms exceeds 100ms target`);
      }
      // Don't fail the test, just warn
      expect(loadTimeMs).toBeLessThan(500);
    });
  });

  describe("Data Validation", () => {
    it("should pass all validation rules with real data", () => {
      const result = validateGameData(rawData);
      if (!result.isValid) {
        console.error("Validation errors:", JSON.stringify(result.errors, null, 2));
      }
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should have no duplicate item IDs", () => {
      const ids = rawData.items.map((i) => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have no duplicate building IDs", () => {
      const ids = rawData.buildings.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have no duplicate recipe IDs", () => {
      const ids = rawData.recipes.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have no duplicate rail IDs", () => {
      const ids = rawData.rails.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have no duplicate corporation IDs", () => {
      const ids = rawData.corporations.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Map Building", () => {
    it("should create Maps with correct sizes", () => {
      expect(gameData.items.size).toBe(rawData.items.length);
      expect(gameData.buildings.size).toBe(rawData.buildings.length);
      expect(gameData.recipes.size).toBe(rawData.recipes.length);
      expect(gameData.rails.size).toBe(rawData.rails.length);
      expect(gameData.corporations.size).toBe(rawData.corporations.length);
    });

    it("should allow O(1) lookups by ID", () => {
      // Test item lookup
      const titaniumOre = gameData.items.get("ore_titanium");
      expect(titaniumOre).toBeDefined();
      expect(titaniumOre?.name).toBe("Titanium Ore");

      // Test building lookup
      const smelter = gameData.buildings.get("smelter");
      expect(smelter).toBeDefined();
      expect(smelter?.name).toBe("Smelter");

      // Test recipe lookup
      const titaniumBar = gameData.recipes.get("titanium_bar");
      expect(titaniumBar).toBeDefined();
      expect(titaniumBar?.buildingId).toBe("smelter");

      // Test rail lookup
      const railV1 = gameData.rails.get("rail_v1");
      expect(railV1).toBeDefined();
      expect(railV1?.capacity).toBe(120);
    });
  });

  describe("Index Building", () => {
    it("should build recipe indices correctly", () => {
      // Recipes by building
      const smelterRecipes = indices.recipesByBuilding.get("smelter");
      expect(smelterRecipes).toBeDefined();
      expect(smelterRecipes!.length).toBeGreaterThan(0);
      expect(smelterRecipes!.some((r) => r.id === "titanium_bar")).toBe(true);

      // Recipes by output item
      const titaniumBarRecipes = indices.recipesByOutputItem.get("bar_titanium");
      expect(titaniumBarRecipes).toBeDefined();
      expect(titaniumBarRecipes!.length).toBeGreaterThan(0);

      // Recipes by input item
      const titaniumOreRecipes = indices.recipesByInputItem.get("ore_titanium");
      expect(titaniumOreRecipes).toBeDefined();
      expect(titaniumOreRecipes!.length).toBeGreaterThan(0);
    });

    it("should build building indices correctly", () => {
      // Buildings by type
      const processingBuildings = indices.buildingsByType.get("processing");
      expect(processingBuildings).toBeDefined();
      expect(processingBuildings!.length).toBeGreaterThan(0);
      expect(processingBuildings!.some((b) => b.id === "smelter")).toBe(true);

      // Buildings by corporation
      const selenianBuildings = indices.buildingsByCorporation.get("selenian_corporation");
      expect(selenianBuildings).toBeDefined();
      expect(selenianBuildings!.length).toBeGreaterThan(0);
    });

    it("should build item indices correctly", () => {
      // Items by type
      const rawItems = indices.itemsByType.get("raw");
      expect(rawItems).toBeDefined();
      expect(rawItems!.length).toBeGreaterThan(0);
      expect(rawItems!.some((i) => i.id === "ore_titanium")).toBe(true);

      // Items by tier
      const tier0Items = indices.itemsByTier.get(0);
      expect(tier0Items).toBeDefined();
      expect(tier0Items!.length).toBeGreaterThan(0);
    });

    it("should build rail indices correctly", () => {
      // Rails sorted by capacity
      expect(indices.railsSortedByCapacity.length).toBe(rawData.rails.length);
      expect(indices.railsSortedByCapacity[0].capacity).toBeLessThanOrEqual(
        indices.railsSortedByCapacity[indices.railsSortedByCapacity.length - 1].capacity
      );

      // Rails by min capacity
      const rails120 = indices.railsByMinCapacity.get(120);
      expect(rails120).toBeDefined();
      expect(rails120!.length).toBe(5); // All 5 rails have capacity >= 120

      const rails240 = indices.railsByMinCapacity.get(240);
      expect(rails240).toBeDefined();
      expect(rails240!.length).toBe(4); // 4 rails have capacity >= 240
    });

    it("should build corporation reward indices correctly", () => {
      // Check Selenian Corporation level 1 rewards (use ID, not display name)
      const selenianRewards = indices.rewardsByCorpLevel.get("selenian_corporation");
      expect(selenianRewards).toBeDefined();

      const level1Rewards = selenianRewards!.get(1);
      expect(level1Rewards).toBeDefined();
      expect(level1Rewards!.length).toBeGreaterThan(0);
    });
  });

  describe("Sample Lookups", () => {
    it("should find the smelter building", () => {
      const smelter = gameData.buildings.get("smelter");
      expect(smelter).toBeDefined();
      expect(smelter!.name).toBe("Smelter");
      expect(smelter!.type).toBe("processing");
      expect(smelter!.recipeIds).toContain("titanium_bar");
    });

    it("should find the ore_excavator building", () => {
      const excavator = gameData.buildings.get("ore_excavator");
      expect(excavator).toBeDefined();
      expect(excavator!.name).toBe("Ore Excavator");
      expect(excavator!.type).toBe("extraction");
      expect(excavator!.placementConstraint).toBe("ore_deposit");
    });

    it("should find all 5 rail tiers", () => {
      expect(gameData.rails.get("rail_v1")).toBeDefined();
      expect(gameData.rails.get("rail_v2")).toBeDefined();
      expect(gameData.rails.get("rail_v3")).toBeDefined();
      expect(gameData.rails.get("rail_v4")).toBeDefined();
      expect(gameData.rails.get("rail_v5")).toBeDefined();

      // Check capacities are ascending
      expect(gameData.rails.get("rail_v1")!.capacity).toBe(120);
      expect(gameData.rails.get("rail_v2")!.capacity).toBe(240);
      expect(gameData.rails.get("rail_v3")!.capacity).toBe(480);
      expect(gameData.rails.get("rail_v4")!.capacity).toBe(900);
      expect(gameData.rails.get("rail_v5")!.capacity).toBe(1500);
    });

    it("should find titanium ore and its processing chain", () => {
      // Find the raw item
      const ore = gameData.items.get("ore_titanium");
      expect(ore).toBeDefined();
      expect(ore!.type).toBe("raw");
      expect(ore!.tier).toBe(0);

      // Find the processed item
      const bar = gameData.items.get("bar_titanium");
      expect(bar).toBeDefined();
      expect(bar!.type).toBe("processed");
      expect(bar!.tier).toBe(1);

      // Find recipes that produce titanium bar
      const barRecipes = indices.recipesByOutputItem.get("bar_titanium");
      expect(barRecipes).toBeDefined();
      expect(barRecipes!.length).toBeGreaterThan(0);

      // The titanium_bar recipe should consume titanium ore
      const titaniumBarRecipe = gameData.recipes.get("titanium_bar");
      expect(titaniumBarRecipe).toBeDefined();
      expect(titaniumBarRecipe!.inputs.some((i) => i.id === "ore_titanium")).toBe(true);
    });

    it("should find corporations with progression data", () => {
      // Use corporation ID, not display name
      const selenian = gameData.corporations.get("selenian_corporation");
      expect(selenian).toBeDefined();
      expect(selenian!.name).toBe("Selenian Corporation");
      expect(selenian!.levels.length).toBeGreaterThan(0);

      // Check first level has rewards
      const level1 = selenian!.levels.find((l) => l.level === 1);
      expect(level1).toBeDefined();
      expect(level1!.rewards.length).toBeGreaterThan(0);
    });
  });

  describe("Lookup Performance", () => {
    it("should perform 1000 Map lookups in under 10ms", () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        gameData.items.get("ore_titanium");
        gameData.buildings.get("smelter");
        gameData.recipes.get("titanium_bar");
        gameData.rails.get("rail_v1");
      }

      const elapsed = performance.now() - start;
      console.log(`   4000 Map lookups: ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(10);
    });

    it("should perform 1000 index lookups in under 10ms", () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        indices.recipesByBuilding.get("smelter");
        indices.recipesByOutputItem.get("bar_titanium");
        indices.buildingsByType.get("processing");
        indices.itemsByTier.get(0);
      }

      const elapsed = performance.now() - start;
      console.log(`   4000 index lookups: ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(10);
    });
  });
});
