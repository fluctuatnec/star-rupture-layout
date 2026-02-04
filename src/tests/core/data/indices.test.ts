/**
 * Tests for game data index builder
 */

import { describe, it, expect } from "vitest";
import {
  buildGameDataMaps,
  buildGameDataIndices,
  type GameDataIndices,
} from "../../../core/data/indices";
import type { RawGameData } from "../../../core/data/loader";
import type { GameData, ItemType } from "../../../core/types/game";
import {
  mockRawGameData,
  mockItems,
  mockBuildings,
  mockRecipes,
  mockRails,
  mockCorporations,
  emptyRawGameData,
} from "../../fixtures/gameData";

// ─────────────────────────────────────────────────────────────
// buildGameDataMaps Tests
// ─────────────────────────────────────────────────────────────

describe("buildGameDataMaps", () => {
  it("should convert items array to Map keyed by ID", () => {
    const gameData = buildGameDataMaps(mockRawGameData);

    expect(gameData.items.size).toBe(mockItems.length);
    for (const item of mockItems) {
      expect(gameData.items.get(item.id)).toEqual(item);
    }
  });

  it("should convert buildings array to Map keyed by ID", () => {
    const gameData = buildGameDataMaps(mockRawGameData);

    expect(gameData.buildings.size).toBe(mockBuildings.length);
    for (const building of mockBuildings) {
      expect(gameData.buildings.get(building.id)).toEqual(building);
    }
  });

  it("should convert recipes array to Map keyed by ID", () => {
    const gameData = buildGameDataMaps(mockRawGameData);

    expect(gameData.recipes.size).toBe(mockRecipes.length);
    for (const recipe of mockRecipes) {
      expect(gameData.recipes.get(recipe.id)).toEqual(recipe);
    }
  });

  it("should convert rails array to Map keyed by ID", () => {
    const gameData = buildGameDataMaps(mockRawGameData);

    expect(gameData.rails.size).toBe(mockRails.length);
    for (const rail of mockRails) {
      expect(gameData.rails.get(rail.id)).toEqual(rail);
    }
  });

  it("should convert corporations array to Map keyed by ID", () => {
    const gameData = buildGameDataMaps(mockRawGameData);

    expect(gameData.corporations.size).toBe(mockCorporations.length);
    for (const corp of mockCorporations) {
      expect(gameData.corporations.get(corp.id)).toEqual(corp);
    }
  });

  it("should handle empty arrays", () => {
    const gameData = buildGameDataMaps(emptyRawGameData);

    expect(gameData.items.size).toBe(0);
    expect(gameData.buildings.size).toBe(0);
    expect(gameData.recipes.size).toBe(0);
    expect(gameData.rails.size).toBe(0);
    expect(gameData.corporations.size).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Recipe Index Tests
// ─────────────────────────────────────────────────────────────

describe("buildGameDataIndices - recipe indices", () => {
  let gameData: GameData;
  let indices: GameDataIndices;

  // Extended fixtures for recipe testing
  const recipeTestData: RawGameData = {
    items: [
      { id: "ore_titanium", name: "Titanium Ore", type: "raw", tier: 0 },
      { id: "bar_titanium", name: "Titanium Bar", type: "processed", tier: 1 },
      { id: "ore_iron", name: "Iron Ore", type: "raw", tier: 0 },
      { id: "bar_iron", name: "Iron Bar", type: "processed", tier: 1 },
      { id: "alloy", name: "Alloy", type: "component", tier: 2 },
    ],
    buildings: [
      {
        id: "ore_excavator",
        name: "Ore Excavator",
        type: "extraction",
        size: 3,
        power: 5,
        heat: 2,
        inputSockets: 0,
        outputSockets: 1,
      },
      {
        id: "smelter",
        name: "Smelter",
        type: "processing",
        size: 3,
        power: 10,
        heat: 5,
        inputSockets: 1,
        outputSockets: 1,
      },
      {
        id: "assembler",
        name: "Assembler",
        type: "crafting",
        size: 4,
        power: 15,
        heat: 3,
        inputSockets: 2,
        outputSockets: 1,
      },
    ],
    recipes: [
      {
        id: "titanium_ore_extract",
        buildingId: "ore_excavator",
        output: { id: "ore_titanium", amount: 1 },
        inputs: [],
        duration: 2,
        outputPerMinute: 30,
      },
      {
        id: "iron_ore_extract",
        buildingId: "ore_excavator",
        output: { id: "ore_iron", amount: 1 },
        inputs: [],
        duration: 2,
        outputPerMinute: 30,
      },
      {
        id: "titanium_bar_smelt",
        buildingId: "smelter",
        output: { id: "bar_titanium", amount: 1 },
        inputs: [{ id: "ore_titanium", amount: 2 }],
        duration: 4,
        outputPerMinute: 15,
      },
      {
        id: "iron_bar_smelt",
        buildingId: "smelter",
        output: { id: "bar_iron", amount: 1 },
        inputs: [{ id: "ore_iron", amount: 2 }],
        duration: 4,
        outputPerMinute: 15,
      },
      {
        id: "alloy_craft",
        buildingId: "assembler",
        output: { id: "alloy", amount: 1 },
        inputs: [
          { id: "bar_titanium", amount: 1 },
          { id: "bar_iron", amount: 1 },
        ],
        duration: 6,
        outputPerMinute: 10,
      },
    ],
    rails: [],
    corporations: [],
  };

  beforeEach(() => {
    gameData = buildGameDataMaps(recipeTestData);
    indices = buildGameDataIndices(gameData);
  });

  describe("recipesByBuilding", () => {
    it("should group recipes by building ID", () => {
      // ore_excavator has 2 recipes
      const excavatorRecipes = indices.recipesByBuilding.get("ore_excavator");
      expect(excavatorRecipes).toBeDefined();
      expect(excavatorRecipes).toHaveLength(2);
      expect(excavatorRecipes?.map((r) => r.id).sort()).toEqual([
        "iron_ore_extract",
        "titanium_ore_extract",
      ]);

      // smelter has 2 recipes
      const smelterRecipes = indices.recipesByBuilding.get("smelter");
      expect(smelterRecipes).toBeDefined();
      expect(smelterRecipes).toHaveLength(2);

      // assembler has 1 recipe
      const assemblerRecipes = indices.recipesByBuilding.get("assembler");
      expect(assemblerRecipes).toBeDefined();
      expect(assemblerRecipes).toHaveLength(1);
      expect(assemblerRecipes?.[0].id).toBe("alloy_craft");
    });

    it("should return undefined for building with no recipes", () => {
      expect(indices.recipesByBuilding.get("nonexistent")).toBeUndefined();
    });
  });

  describe("recipesByOutputItem", () => {
    it("should group recipes by output item ID", () => {
      // ore_titanium is produced by 1 recipe
      const titaniumOreRecipes = indices.recipesByOutputItem.get("ore_titanium");
      expect(titaniumOreRecipes).toBeDefined();
      expect(titaniumOreRecipes).toHaveLength(1);
      expect(titaniumOreRecipes?.[0].id).toBe("titanium_ore_extract");

      // bar_titanium is produced by 1 recipe
      const titaniumBarRecipes = indices.recipesByOutputItem.get("bar_titanium");
      expect(titaniumBarRecipes).toBeDefined();
      expect(titaniumBarRecipes).toHaveLength(1);
      expect(titaniumBarRecipes?.[0].id).toBe("titanium_bar_smelt");

      // alloy is produced by 1 recipe
      const alloyRecipes = indices.recipesByOutputItem.get("alloy");
      expect(alloyRecipes).toBeDefined();
      expect(alloyRecipes).toHaveLength(1);
    });

    it("should return undefined for item with no producing recipes", () => {
      expect(indices.recipesByOutputItem.get("nonexistent")).toBeUndefined();
    });
  });

  describe("recipesByInputItem", () => {
    it("should group recipes by input item ID", () => {
      // ore_titanium is consumed by titanium_bar_smelt
      const titaniumOreConsumers = indices.recipesByInputItem.get("ore_titanium");
      expect(titaniumOreConsumers).toBeDefined();
      expect(titaniumOreConsumers).toHaveLength(1);
      expect(titaniumOreConsumers?.[0].id).toBe("titanium_bar_smelt");

      // bar_titanium is consumed by alloy_craft
      const titaniumBarConsumers = indices.recipesByInputItem.get("bar_titanium");
      expect(titaniumBarConsumers).toBeDefined();
      expect(titaniumBarConsumers).toHaveLength(1);
      expect(titaniumBarConsumers?.[0].id).toBe("alloy_craft");

      // bar_iron is also consumed by alloy_craft
      const ironBarConsumers = indices.recipesByInputItem.get("bar_iron");
      expect(ironBarConsumers).toBeDefined();
      expect(ironBarConsumers).toHaveLength(1);
      expect(ironBarConsumers?.[0].id).toBe("alloy_craft");
    });

    it("should include recipe under each input when recipe has multiple inputs", () => {
      // alloy_craft uses both bar_titanium and bar_iron
      const titaniumBarConsumers = indices.recipesByInputItem.get("bar_titanium");
      const ironBarConsumers = indices.recipesByInputItem.get("bar_iron");

      expect(titaniumBarConsumers?.some((r) => r.id === "alloy_craft")).toBe(true);
      expect(ironBarConsumers?.some((r) => r.id === "alloy_craft")).toBe(true);
    });

    it("should not include extraction recipes (no inputs)", () => {
      // titanium_ore_extract has no inputs, so it shouldn't appear in recipesByInputItem
      const allInputItems = Array.from(indices.recipesByInputItem.keys());
      for (const inputItemId of allInputItems) {
        const recipes = indices.recipesByInputItem.get(inputItemId)!;
        expect(recipes.every((r) => r.inputs.length > 0)).toBe(true);
      }
    });

    it("should return undefined for item never used as input", () => {
      // alloy is only an output, never an input
      expect(indices.recipesByInputItem.get("alloy")).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Building Index Tests
// ─────────────────────────────────────────────────────────────

describe("buildGameDataIndices - building indices", () => {
  const buildingTestData: RawGameData = {
    items: [],
    buildings: [
      {
        id: "ore_excavator",
        name: "Ore Excavator",
        type: "extraction",
        size: 3,
        power: 5,
        heat: 2,
        inputSockets: 0,
        outputSockets: 1,
        unlockedBy: { corporation: "selenian", level: 1 },
      },
      {
        id: "deep_drill",
        name: "Deep Drill",
        type: "extraction",
        size: 4,
        power: 10,
        heat: 5,
        inputSockets: 0,
        outputSockets: 2,
        unlockedBy: { corporation: "selenian", level: 3 },
      },
      {
        id: "smelter",
        name: "Smelter",
        type: "processing",
        size: 3,
        power: 10,
        heat: 5,
        inputSockets: 1,
        outputSockets: 1,
        unlockedBy: { corporation: "selenian", level: 2 },
      },
      {
        id: "storage_small",
        name: "Small Storage",
        type: "storage",
        size: 2,
        power: 1,
        heat: 0,
        inputSockets: 1,
        outputSockets: 1,
        // No unlockedBy - available from start
      },
      {
        id: "cryo_assembler",
        name: "Cryo Assembler",
        type: "crafting",
        size: 4,
        power: 20,
        heat: -5,
        inputSockets: 2,
        outputSockets: 1,
        unlockedBy: { corporation: "cryo_corp", level: 2 },
      },
    ],
    recipes: [],
    rails: [],
    corporations: [],
  };

  let indices: GameDataIndices;

  beforeEach(() => {
    const gameData = buildGameDataMaps(buildingTestData);
    indices = buildGameDataIndices(gameData);
  });

  describe("buildingsByType", () => {
    it("should group buildings by type", () => {
      const extractionBuildings = indices.buildingsByType.get("extraction");
      expect(extractionBuildings).toBeDefined();
      expect(extractionBuildings).toHaveLength(2);
      expect(extractionBuildings?.map((b) => b.id).sort()).toEqual([
        "deep_drill",
        "ore_excavator",
      ]);

      const processingBuildings = indices.buildingsByType.get("processing");
      expect(processingBuildings).toBeDefined();
      expect(processingBuildings).toHaveLength(1);
      expect(processingBuildings?.[0].id).toBe("smelter");

      const storageBuildings = indices.buildingsByType.get("storage");
      expect(storageBuildings).toBeDefined();
      expect(storageBuildings).toHaveLength(1);

      const craftingBuildings = indices.buildingsByType.get("crafting");
      expect(craftingBuildings).toBeDefined();
      expect(craftingBuildings).toHaveLength(1);
    });

    it("should return undefined for type with no buildings", () => {
      expect(indices.buildingsByType.get("generator")).toBeUndefined();
      expect(indices.buildingsByType.get("habitat")).toBeUndefined();
    });
  });

  describe("buildingsByCorporation", () => {
    it("should group buildings by corporation ID", () => {
      const selenianBuildings = indices.buildingsByCorporation.get("selenian");
      expect(selenianBuildings).toBeDefined();
      expect(selenianBuildings).toHaveLength(3);
      expect(selenianBuildings?.map((b) => b.id).sort()).toEqual([
        "deep_drill",
        "ore_excavator",
        "smelter",
      ]);

      const cryoBuildings = indices.buildingsByCorporation.get("cryo_corp");
      expect(cryoBuildings).toBeDefined();
      expect(cryoBuildings).toHaveLength(1);
      expect(cryoBuildings?.[0].id).toBe("cryo_assembler");
    });

    it("should not include buildings without unlockedBy", () => {
      // storage_small has no unlockedBy
      const allCorpBuildings = Array.from(indices.buildingsByCorporation.values()).flat();
      expect(allCorpBuildings.every((b) => b.unlockedBy !== undefined)).toBe(true);
      expect(allCorpBuildings.find((b) => b.id === "storage_small")).toBeUndefined();
    });

    it("should return undefined for corporation with no buildings", () => {
      expect(indices.buildingsByCorporation.get("nonexistent")).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Item Index Tests
// ─────────────────────────────────────────────────────────────

describe("buildGameDataIndices - item indices", () => {
  const itemTestData: RawGameData = {
    items: [
      { id: "ore_titanium", name: "Titanium Ore", type: "raw", tier: 0 },
      { id: "ore_iron", name: "Iron Ore", type: "raw", tier: 0 },
      { id: "bar_titanium", name: "Titanium Bar", type: "processed", tier: 1 },
      { id: "bar_iron", name: "Iron Bar", type: "processed", tier: 1 },
      { id: "ceramics", name: "Ceramics", type: "component", tier: 2 },
      { id: "alloy", name: "Alloy", type: "component", tier: 2 },
      { id: "advanced_alloy", name: "Advanced Alloy", type: "material", tier: 3 },
      { id: "ammo_basic", name: "Basic Ammo", type: "ammo", tier: 1 },
    ],
    buildings: [],
    recipes: [],
    rails: [],
    corporations: [],
  };

  let indices: GameDataIndices;

  beforeEach(() => {
    const gameData = buildGameDataMaps(itemTestData);
    indices = buildGameDataIndices(gameData);
  });

  describe("itemsByType", () => {
    it("should group items by type", () => {
      const rawItems = indices.itemsByType.get("raw");
      expect(rawItems).toBeDefined();
      expect(rawItems).toHaveLength(2);
      expect(rawItems?.map((i) => i.id).sort()).toEqual(["ore_iron", "ore_titanium"]);

      const processedItems = indices.itemsByType.get("processed");
      expect(processedItems).toBeDefined();
      expect(processedItems).toHaveLength(2);

      const componentItems = indices.itemsByType.get("component");
      expect(componentItems).toBeDefined();
      expect(componentItems).toHaveLength(2);

      const materialItems = indices.itemsByType.get("material");
      expect(materialItems).toBeDefined();
      expect(materialItems).toHaveLength(1);

      const ammoItems = indices.itemsByType.get("ammo");
      expect(ammoItems).toBeDefined();
      expect(ammoItems).toHaveLength(1);
    });

    it("should return undefined for type with no items", () => {
      // Use a cast to test with an invalid type
      expect(indices.itemsByType.get("nonexistent" as unknown as ItemType)).toBeUndefined();
    });
  });

  describe("itemsByTier", () => {
    it("should group items by tier", () => {
      const tier0Items = indices.itemsByTier.get(0);
      expect(tier0Items).toBeDefined();
      expect(tier0Items).toHaveLength(2);
      expect(tier0Items?.every((i) => i.tier === 0)).toBe(true);

      const tier1Items = indices.itemsByTier.get(1);
      expect(tier1Items).toBeDefined();
      expect(tier1Items).toHaveLength(3); // 2 bars + 1 ammo
      expect(tier1Items?.every((i) => i.tier === 1)).toBe(true);

      const tier2Items = indices.itemsByTier.get(2);
      expect(tier2Items).toBeDefined();
      expect(tier2Items).toHaveLength(2);

      const tier3Items = indices.itemsByTier.get(3);
      expect(tier3Items).toBeDefined();
      expect(tier3Items).toHaveLength(1);
    });

    it("should return undefined for tier with no items", () => {
      expect(indices.itemsByTier.get(99)).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Rail Index Tests
// ─────────────────────────────────────────────────────────────

describe("buildGameDataIndices - rail indices", () => {
  const railTestData: RawGameData = {
    items: [],
    buildings: [],
    recipes: [],
    rails: [
      { id: "rail_v1", name: "Rail V1", size: 1, capacity: 60, power: 1, heat: 0 },
      { id: "rail_v2", name: "Rail V2", size: 1, capacity: 120, power: 2, heat: 0 },
      { id: "rail_v3", name: "Rail V3", size: 1, capacity: 240, power: 3, heat: 0 },
      { id: "rail_v4", name: "Rail V4", size: 1, capacity: 480, power: 4, heat: 0 },
      { id: "rail_v5", name: "Rail V5", size: 1, capacity: 720, power: 5, heat: 0 },
    ],
    corporations: [],
  };

  let indices: GameDataIndices;

  beforeEach(() => {
    const gameData = buildGameDataMaps(railTestData);
    indices = buildGameDataIndices(gameData);
  });

  describe("railsSortedByCapacity", () => {
    it("should contain all rails sorted by capacity ascending", () => {
      expect(indices.railsSortedByCapacity).toHaveLength(5);
      expect(indices.railsSortedByCapacity.map((r) => r.capacity)).toEqual([
        60, 120, 240, 480, 720,
      ]);
    });
  });

  describe("railsByMinCapacity", () => {
    it("should return rails with capacity >= threshold", () => {
      // At capacity 60, all rails qualify
      const rails60 = indices.railsByMinCapacity.get(60);
      expect(rails60).toBeDefined();
      expect(rails60).toHaveLength(5);

      // At capacity 120, 4 rails qualify
      const rails120 = indices.railsByMinCapacity.get(120);
      expect(rails120).toBeDefined();
      expect(rails120).toHaveLength(4);
      expect(rails120?.every((r) => r.capacity >= 120)).toBe(true);

      // At capacity 240, 3 rails qualify
      const rails240 = indices.railsByMinCapacity.get(240);
      expect(rails240).toBeDefined();
      expect(rails240).toHaveLength(3);

      // At capacity 480, 2 rails qualify
      const rails480 = indices.railsByMinCapacity.get(480);
      expect(rails480).toBeDefined();
      expect(rails480).toHaveLength(2);

      // At capacity 720, only 1 rail qualifies
      const rails720 = indices.railsByMinCapacity.get(720);
      expect(rails720).toBeDefined();
      expect(rails720).toHaveLength(1);
      expect(rails720?.[0].id).toBe("rail_v5");
    });

    it("should return undefined for non-indexed capacity threshold", () => {
      // Only actual capacity values are indexed
      expect(indices.railsByMinCapacity.get(100)).toBeUndefined();
      expect(indices.railsByMinCapacity.get(300)).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Corporation Index Tests
// ─────────────────────────────────────────────────────────────

describe("buildGameDataIndices - corporation indices", () => {
  const corpTestData: RawGameData = {
    items: [],
    buildings: [],
    recipes: [],
    rails: [],
    corporations: [
      {
        id: "selenian_corporation",
        name: "Selenian Corporation",
        description: "Factories and production",
        levels: [
          {
            level: 1,
            xp: 0,
            components: [],
            rewards: [
              { type: "building", id: "base_core" },
              { type: "building", id: "ore_excavator" },
              { type: "rail", id: "rail_v1" },
            ],
          },
          {
            level: 2,
            xp: 100,
            components: [{ id: "bar_titanium", points: 10 }],
            rewards: [
              { type: "building", id: "smelter" },
              { type: "utility", name: "Basic Printer" },
            ],
          },
          {
            level: 3,
            xp: 300,
            components: [{ id: "bar_titanium", points: 10 }],
            rewards: [
              { type: "rail", id: "rail_v2" },
              { type: "currency", name: "Credits", amount: 1000 },
            ],
          },
        ],
      },
      {
        id: "cryo_corp",
        name: "Cryo Corporation",
        description: "Temperature control",
        levels: [
          {
            level: 1,
            xp: 0,
            components: [],
            rewards: [{ type: "building", id: "cooler" }],
          },
        ],
      },
    ],
  };

  let indices: GameDataIndices;

  beforeEach(() => {
    const gameData = buildGameDataMaps(corpTestData);
    indices = buildGameDataIndices(gameData);
  });

  describe("rewardsByCorpLevel", () => {
    it("should index rewards by corporation ID", () => {
      expect(indices.rewardsByCorpLevel.has("selenian_corporation")).toBe(true);
      expect(indices.rewardsByCorpLevel.has("cryo_corp")).toBe(true);
    });

    it("should index rewards by level within corporation", () => {
      const selenianLevels = indices.rewardsByCorpLevel.get("selenian_corporation");
      expect(selenianLevels).toBeDefined();
      expect(selenianLevels?.has(1)).toBe(true);
      expect(selenianLevels?.has(2)).toBe(true);
      expect(selenianLevels?.has(3)).toBe(true);

      const cryoLevels = indices.rewardsByCorpLevel.get("cryo_corp");
      expect(cryoLevels).toBeDefined();
      expect(cryoLevels?.has(1)).toBe(true);
      expect(cryoLevels?.has(2)).toBe(false);
    });

    it("should return correct rewards for each level", () => {
      const selenianLevels = indices.rewardsByCorpLevel.get("selenian_corporation")!;

      // Level 1: 3 rewards
      const level1Rewards = selenianLevels.get(1);
      expect(level1Rewards).toBeDefined();
      expect(level1Rewards).toHaveLength(3);
      expect(level1Rewards?.filter((r) => r.type === "building")).toHaveLength(2);
      expect(level1Rewards?.filter((r) => r.type === "rail")).toHaveLength(1);

      // Level 2: 2 rewards
      const level2Rewards = selenianLevels.get(2);
      expect(level2Rewards).toBeDefined();
      expect(level2Rewards).toHaveLength(2);
      expect(level2Rewards?.find((r) => r.type === "building")?.id).toBe("smelter");
      expect(level2Rewards?.find((r) => r.type === "utility")?.name).toBe("Basic Printer");

      // Level 3: 2 rewards
      const level3Rewards = selenianLevels.get(3);
      expect(level3Rewards).toBeDefined();
      expect(level3Rewards).toHaveLength(2);
      expect(level3Rewards?.find((r) => r.type === "rail")?.id).toBe("rail_v2");
      expect(level3Rewards?.find((r) => r.type === "currency")?.amount).toBe(1000);
    });

    it("should return undefined for non-existent corporation", () => {
      expect(indices.rewardsByCorpLevel.get("nonexistent")).toBeUndefined();
    });

    it("should return undefined for non-existent level", () => {
      const selenianLevels = indices.rewardsByCorpLevel.get("selenian_corporation")!;
      expect(selenianLevels.get(99)).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Empty Data Tests
// ─────────────────────────────────────────────────────────────

describe("buildGameDataIndices - empty data handling", () => {
  it("should produce empty indices without errors", () => {
    const gameData = buildGameDataMaps(emptyRawGameData);
    const indices = buildGameDataIndices(gameData);

    // Recipe indices
    expect(indices.recipesByBuilding.size).toBe(0);
    expect(indices.recipesByOutputItem.size).toBe(0);
    expect(indices.recipesByInputItem.size).toBe(0);

    // Building indices
    expect(indices.buildingsByType.size).toBe(0);
    expect(indices.buildingsByCorporation.size).toBe(0);

    // Item indices
    expect(indices.itemsByType.size).toBe(0);
    expect(indices.itemsByTier.size).toBe(0);

    // Rail indices
    expect(indices.railsSortedByCapacity).toHaveLength(0);
    expect(indices.railsByMinCapacity.size).toBe(0);

    // Corporation indices
    expect(indices.rewardsByCorpLevel.size).toBe(0);
  });

  it("should handle partial empty data", () => {
    const partialData: RawGameData = {
      items: [{ id: "ore", name: "Ore", type: "raw", tier: 0 }],
      buildings: [],
      recipes: [],
      rails: [],
      corporations: [],
    };

    const gameData = buildGameDataMaps(partialData);
    const indices = buildGameDataIndices(gameData);

    // Only item indices should have data
    expect(indices.itemsByType.size).toBe(1);
    expect(indices.itemsByTier.size).toBe(1);

    // All other indices should be empty
    expect(indices.recipesByBuilding.size).toBe(0);
    expect(indices.buildingsByType.size).toBe(0);
    expect(indices.railsSortedByCapacity).toHaveLength(0);
    expect(indices.rewardsByCorpLevel.size).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Integration Test with Mock Fixtures
// ─────────────────────────────────────────────────────────────

describe("buildGameDataIndices - integration with mock fixtures", () => {
  it("should correctly build all indices from mock data", () => {
    const gameData = buildGameDataMaps(mockRawGameData);
    const indices = buildGameDataIndices(gameData);

    // Verify all maps were built
    expect(gameData.items.size).toBe(mockItems.length);
    expect(gameData.buildings.size).toBe(mockBuildings.length);
    expect(gameData.recipes.size).toBe(mockRecipes.length);
    expect(gameData.rails.size).toBe(mockRails.length);
    expect(gameData.corporations.size).toBe(mockCorporations.length);

    // Verify recipe indices
    expect(indices.recipesByBuilding.get("ore_excavator")).toHaveLength(1);
    expect(indices.recipesByBuilding.get("smelter")).toHaveLength(1);
    expect(indices.recipesByOutputItem.get("ore_titanium")).toHaveLength(1);
    expect(indices.recipesByOutputItem.get("bar_titanium")).toHaveLength(1);
    expect(indices.recipesByInputItem.get("ore_titanium")).toHaveLength(1);

    // Verify building indices
    expect(indices.buildingsByType.get("extraction")).toHaveLength(1);
    expect(indices.buildingsByType.get("processing")).toHaveLength(1);
    expect(indices.buildingsByType.get("storage")).toHaveLength(1);
    expect(indices.buildingsByCorporation.get("selenian_corporation")).toHaveLength(2);

    // Verify item indices
    expect(indices.itemsByType.get("raw")).toHaveLength(1);
    expect(indices.itemsByType.get("processed")).toHaveLength(1);
    expect(indices.itemsByType.get("component")).toHaveLength(1);
    expect(indices.itemsByTier.get(0)).toHaveLength(1);
    expect(indices.itemsByTier.get(1)).toHaveLength(1);
    expect(indices.itemsByTier.get(2)).toHaveLength(1);

    // Verify rail indices
    expect(indices.railsSortedByCapacity).toHaveLength(2);
    expect(indices.railsSortedByCapacity[0].capacity).toBeLessThan(
      indices.railsSortedByCapacity[1].capacity
    );

    // Verify corporation indices
    const selenianLevels = indices.rewardsByCorpLevel.get("selenian_corporation");
    expect(selenianLevels).toBeDefined();
    expect(selenianLevels?.get(1)).toHaveLength(2);
    expect(selenianLevels?.get(2)).toHaveLength(1);
    expect(selenianLevels?.get(3)).toHaveLength(1);
  });
});
