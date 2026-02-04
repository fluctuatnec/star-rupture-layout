/**
 * Game data index builder module
 * Converts raw data arrays to Maps and builds pre-computed indices for O(1) lookups
 */

import type { RawGameData } from "./loader";
import type {
  Item,
  Building,
  Recipe,
  Rail,
  Corporation,
  ItemType,
  BuildingType,
  CorporationReward,
  GameData,
} from "../types/game";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Pre-computed indices for efficient lookups
 * All indices are computed eagerly at load time
 */
export interface GameDataIndices {
  // Recipe indices
  /** Recipes grouped by building ID */
  recipesByBuilding: Map<string, Recipe[]>;
  /** Recipes grouped by output item ID */
  recipesByOutputItem: Map<string, Recipe[]>;
  /** Recipes grouped by input item ID (a recipe can appear under multiple items) */
  recipesByInputItem: Map<string, Recipe[]>;

  // Building indices
  /** Buildings grouped by type */
  buildingsByType: Map<BuildingType, Building[]>;
  /** Buildings grouped by corporation ID (from unlockedBy) */
  buildingsByCorporation: Map<string, Building[]>;

  // Item indices
  /** Items grouped by type */
  itemsByType: Map<ItemType, Item[]>;
  /** Items grouped by tier */
  itemsByTier: Map<number, Item[]>;

  // Rail indices
  /** Rails sorted by capacity (ascending) for efficient min capacity queries */
  railsSortedByCapacity: Rail[];
  /** Rails grouped by capacity threshold (allows O(1) lookup for "capacity >= X" queries) */
  railsByMinCapacity: Map<number, Rail[]>;

  // Corporation indices
  /** Rewards by corporation ID and level: corpId -> level -> rewards[] */
  rewardsByCorpLevel: Map<string, Map<number, CorporationReward[]>>;
}

// ─────────────────────────────────────────────────────────────
// Map Builder
// ─────────────────────────────────────────────────────────────

/**
 * Converts raw data arrays to Maps keyed by ID for O(1) lookups
 * @param raw - Raw game data with arrays
 * @returns GameData with Maps keyed by entity ID
 */
export function buildGameDataMaps(raw: RawGameData): GameData {
  return {
    items: new Map(raw.items.map((item) => [item.id, item])),
    buildings: new Map(raw.buildings.map((building) => [building.id, building])),
    recipes: new Map(raw.recipes.map((recipe) => [recipe.id, recipe])),
    rails: new Map(raw.rails.map((rail) => [rail.id, rail])),
    corporations: new Map(raw.corporations.map((corp) => [corp.id, corp])),
  };
}

// ─────────────────────────────────────────────────────────────
// Index Builder
// ─────────────────────────────────────────────────────────────

/**
 * Builds all derived indices from the GameData Maps
 * @param data - GameData with Maps
 * @returns Pre-computed indices for efficient lookups
 */
export function buildGameDataIndices(data: GameData): GameDataIndices {
  return {
    // Recipe indices
    recipesByBuilding: buildRecipesByBuilding(data.recipes),
    recipesByOutputItem: buildRecipesByOutputItem(data.recipes),
    recipesByInputItem: buildRecipesByInputItem(data.recipes),

    // Building indices
    buildingsByType: buildBuildingsByType(data.buildings),
    buildingsByCorporation: buildBuildingsByCorporation(data.buildings),

    // Item indices
    itemsByType: buildItemsByType(data.items),
    itemsByTier: buildItemsByTier(data.items),

    // Rail indices
    ...buildRailIndices(data.rails),

    // Corporation indices
    rewardsByCorpLevel: buildRewardsByCorpLevel(data.corporations),
  };
}

// ─────────────────────────────────────────────────────────────
// Recipe Index Builders
// ─────────────────────────────────────────────────────────────

/**
 * Groups recipes by building ID
 */
function buildRecipesByBuilding(recipes: Map<string, Recipe>): Map<string, Recipe[]> {
  const index = new Map<string, Recipe[]>();

  for (const recipe of recipes.values()) {
    const existing = index.get(recipe.buildingId) ?? [];
    existing.push(recipe);
    index.set(recipe.buildingId, existing);
  }

  return index;
}

/**
 * Groups recipes by output item ID
 */
function buildRecipesByOutputItem(recipes: Map<string, Recipe>): Map<string, Recipe[]> {
  const index = new Map<string, Recipe[]>();

  for (const recipe of recipes.values()) {
    const outputId = recipe.output.id;
    const existing = index.get(outputId) ?? [];
    existing.push(recipe);
    index.set(outputId, existing);
  }

  return index;
}

/**
 * Groups recipes by input item ID
 * A recipe with multiple inputs will appear under each input item
 */
function buildRecipesByInputItem(recipes: Map<string, Recipe>): Map<string, Recipe[]> {
  const index = new Map<string, Recipe[]>();

  for (const recipe of recipes.values()) {
    for (const input of recipe.inputs) {
      const existing = index.get(input.id) ?? [];
      existing.push(recipe);
      index.set(input.id, existing);
    }
  }

  return index;
}

// ─────────────────────────────────────────────────────────────
// Building Index Builders
// ─────────────────────────────────────────────────────────────

/**
 * Groups buildings by type
 */
function buildBuildingsByType(buildings: Map<string, Building>): Map<BuildingType, Building[]> {
  const index = new Map<BuildingType, Building[]>();

  for (const building of buildings.values()) {
    const existing = index.get(building.type) ?? [];
    existing.push(building);
    index.set(building.type, existing);
  }

  return index;
}

/**
 * Groups buildings by corporation ID (from unlockedBy)
 * Buildings without unlockedBy are not indexed here
 */
function buildBuildingsByCorporation(buildings: Map<string, Building>): Map<string, Building[]> {
  const index = new Map<string, Building[]>();

  for (const building of buildings.values()) {
    if (building.unlockedBy) {
      const corpId = building.unlockedBy.corporation;
      const existing = index.get(corpId) ?? [];
      existing.push(building);
      index.set(corpId, existing);
    }
  }

  return index;
}

// ─────────────────────────────────────────────────────────────
// Item Index Builders
// ─────────────────────────────────────────────────────────────

/**
 * Groups items by type
 */
function buildItemsByType(items: Map<string, Item>): Map<ItemType, Item[]> {
  const index = new Map<ItemType, Item[]>();

  for (const item of items.values()) {
    const existing = index.get(item.type) ?? [];
    existing.push(item);
    index.set(item.type, existing);
  }

  return index;
}

/**
 * Groups items by tier
 */
function buildItemsByTier(items: Map<string, Item>): Map<number, Item[]> {
  const index = new Map<number, Item[]>();

  for (const item of items.values()) {
    const existing = index.get(item.tier) ?? [];
    existing.push(item);
    index.set(item.tier, existing);
  }

  return index;
}

// ─────────────────────────────────────────────────────────────
// Rail Index Builders
// ─────────────────────────────────────────────────────────────

/**
 * Builds rail indices for capacity-based queries
 * Returns both a sorted array and a map for min capacity lookups
 */
function buildRailIndices(
  rails: Map<string, Rail>
): Pick<GameDataIndices, "railsSortedByCapacity" | "railsByMinCapacity"> {
  // Sort rails by capacity (ascending)
  const sortedRails = Array.from(rails.values()).sort((a, b) => a.capacity - b.capacity);

  // Build min capacity index
  // For each unique capacity threshold, store all rails with capacity >= threshold
  const railsByMinCapacity = new Map<number, Rail[]>();

  // Get unique capacity values
  const uniqueCapacities = [...new Set(sortedRails.map((r) => r.capacity))].sort((a, b) => a - b);

  for (const minCapacity of uniqueCapacities) {
    // All rails with capacity >= minCapacity
    const railsAtOrAbove = sortedRails.filter((r) => r.capacity >= minCapacity);
    railsByMinCapacity.set(minCapacity, railsAtOrAbove);
  }

  return {
    railsSortedByCapacity: sortedRails,
    railsByMinCapacity,
  };
}

// ─────────────────────────────────────────────────────────────
// Corporation Index Builders
// ─────────────────────────────────────────────────────────────

/**
 * Builds rewards index by corporation ID and level
 * Returns Map<corpId, Map<level, CorporationReward[]>>
 */
function buildRewardsByCorpLevel(
  corporations: Map<string, Corporation>
): Map<string, Map<number, CorporationReward[]>> {
  const index = new Map<string, Map<number, CorporationReward[]>>();

  for (const corp of corporations.values()) {
    const levelMap = new Map<number, CorporationReward[]>();

    for (const level of corp.levels) {
      levelMap.set(level.level, level.rewards);
    }

    index.set(corp.id, levelMap);
  }

  return index;
}

// Re-export GameData from types for convenience
export type { GameData };
