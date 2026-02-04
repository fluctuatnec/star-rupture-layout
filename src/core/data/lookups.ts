/**
 * Lookup helper functions for game data
 * These functions access the Zustand store directly (not hooks)
 * so they can be used in non-React code like the production solver.
 */

import { gameDataStore } from "../../state/gameDataStore";
import type {
  Item,
  Building,
  Recipe,
  Rail,
  Corporation,
  CorporationLevel,
  CorporationReward,
  ItemType,
  BuildingType,
  RewardType,
} from "../types/game";

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Gets game data from the store, throwing if not loaded
 * @throws {Error} If game data is not loaded
 */
function getStoreGameData() {
  return gameDataStore.getState().getGameData();
}

/**
 * Gets indices from the store, throwing if not loaded
 * @throws {Error} If indices are not loaded
 */
function getStoreIndices() {
  return gameDataStore.getState().getIndices();
}

// ─────────────────────────────────────────────────────────────
// Item Lookups
// ─────────────────────────────────────────────────────────────

/**
 * Gets an item by its ID
 * @param id - The item ID to look up
 * @returns The item, or undefined if not found
 * @throws {Error} If game data is not loaded
 */
export function getItem(id: string): Item | undefined {
  const gameData = getStoreGameData();
  return gameData.items.get(id);
}

/**
 * Gets all items of a specific type
 * @param type - The item type to filter by
 * @returns Array of items matching the type (empty if none found)
 * @throws {Error} If game data is not loaded
 */
export function getItemsByType(type: ItemType): Item[] {
  const indices = getStoreIndices();
  return indices.itemsByType.get(type) ?? [];
}

/**
 * Gets all items at a specific tier
 * @param tier - The tier number to filter by
 * @returns Array of items at the specified tier (empty if none found)
 * @throws {Error} If game data is not loaded
 */
export function getItemsByTier(tier: number): Item[] {
  const indices = getStoreIndices();
  return indices.itemsByTier.get(tier) ?? [];
}

/**
 * Gets all items in the game
 * @returns Array of all items
 * @throws {Error} If game data is not loaded
 */
export function getAllItems(): Item[] {
  const gameData = getStoreGameData();
  return Array.from(gameData.items.values());
}

// ─────────────────────────────────────────────────────────────
// Building Lookups
// ─────────────────────────────────────────────────────────────

/**
 * Gets a building by its ID
 * @param id - The building ID to look up
 * @returns The building, or undefined if not found
 * @throws {Error} If game data is not loaded
 */
export function getBuilding(id: string): Building | undefined {
  const gameData = getStoreGameData();
  return gameData.buildings.get(id);
}

/**
 * Gets all buildings of a specific type
 * @param type - The building type to filter by
 * @returns Array of buildings matching the type (empty if none found)
 * @throws {Error} If game data is not loaded
 */
export function getBuildingsByType(type: BuildingType): Building[] {
  const indices = getStoreIndices();
  return indices.buildingsByType.get(type) ?? [];
}

/**
 * Gets all buildings unlocked by a specific corporation
 * @param corpId - Corporation ID (e.g., "selenian_corporation")
 * @returns Array of buildings unlocked by the corporation (empty if none found)
 * @throws {Error} If game data is not loaded
 */
export function getBuildingsByCorporation(corpId: string): Building[] {
  const indices = getStoreIndices();
  return indices.buildingsByCorporation.get(corpId) ?? [];
}

/**
 * Gets all buildings in the game
 * @returns Array of all buildings
 * @throws {Error} If game data is not loaded
 */
export function getAllBuildings(): Building[] {
  const gameData = getStoreGameData();
  return Array.from(gameData.buildings.values());
}

// ─────────────────────────────────────────────────────────────
// Recipe Lookups
// ─────────────────────────────────────────────────────────────

/**
 * Gets a recipe by its ID
 * @param id - The recipe ID to look up
 * @returns The recipe, or undefined if not found
 * @throws {Error} If game data is not loaded
 */
export function getRecipe(id: string): Recipe | undefined {
  const gameData = getStoreGameData();
  return gameData.recipes.get(id);
}

/**
 * Gets all recipes that can be performed in a specific building
 * @param buildingId - The building ID to filter by
 * @returns Array of recipes for the building (empty if none found)
 * @throws {Error} If game data is not loaded
 */
export function getRecipesByBuilding(buildingId: string): Recipe[] {
  const indices = getStoreIndices();
  return indices.recipesByBuilding.get(buildingId) ?? [];
}

/**
 * Gets all recipes that produce a specific item
 * @param itemId - The item ID to find producing recipes for
 * @returns Array of recipes that output this item (empty if none found)
 * @throws {Error} If game data is not loaded
 */
export function getRecipesProducing(itemId: string): Recipe[] {
  const indices = getStoreIndices();
  return indices.recipesByOutputItem.get(itemId) ?? [];
}

/**
 * Gets all recipes that consume a specific item as an input
 * @param itemId - The item ID to find consuming recipes for
 * @returns Array of recipes that use this item as input (empty if none found)
 * @throws {Error} If game data is not loaded
 */
export function getRecipesConsuming(itemId: string): Recipe[] {
  const indices = getStoreIndices();
  return indices.recipesByInputItem.get(itemId) ?? [];
}

/**
 * Gets all recipes in the game
 * @returns Array of all recipes
 * @throws {Error} If game data is not loaded
 */
export function getAllRecipes(): Recipe[] {
  const gameData = getStoreGameData();
  return Array.from(gameData.recipes.values());
}

// ─────────────────────────────────────────────────────────────
// Rail Lookups
// ─────────────────────────────────────────────────────────────

/**
 * Gets a rail by its ID
 * @param id - The rail ID to look up
 * @returns The rail, or undefined if not found
 * @throws {Error} If game data is not loaded
 */
export function getRail(id: string): Rail | undefined {
  const gameData = getStoreGameData();
  return gameData.rails.get(id);
}

/**
 * Gets all rails with capacity greater than or equal to the specified minimum
 * @param minCapacity - The minimum capacity threshold (items/min)
 * @returns Array of rails with capacity >= minCapacity, sorted by capacity ascending (empty if none found)
 * @throws {Error} If game data is not loaded
 */
export function getRailsByMinCapacity(minCapacity: number): Rail[] {
  const indices = getStoreIndices();

  // Check if there's a pre-computed result for this exact capacity
  const precomputed = indices.railsByMinCapacity.get(minCapacity);
  if (precomputed !== undefined) {
    return precomputed;
  }

  // Otherwise, filter from the sorted array
  // This handles cases where minCapacity is not an exact match to any rail capacity
  return indices.railsSortedByCapacity.filter((rail) => rail.capacity >= minCapacity);
}

/**
 * Gets all rails in the game
 * @returns Array of all rails
 * @throws {Error} If game data is not loaded
 */
export function getAllRails(): Rail[] {
  const gameData = getStoreGameData();
  return Array.from(gameData.rails.values());
}

// ─────────────────────────────────────────────────────────────
// Corporation Lookups
// ─────────────────────────────────────────────────────────────

/**
 * Gets a corporation by its ID
 * @param id - Corporation ID (e.g., "selenian_corporation")
 * @returns The corporation, or undefined if not found
 * @throws {Error} If game data is not loaded
 */
export function getCorporation(id: string): Corporation | undefined {
  const gameData = getStoreGameData();
  return gameData.corporations.get(id);
}

/**
 * Gets all corporations in the game
 * @returns Array of all corporations
 * @throws {Error} If game data is not loaded
 */
export function getAllCorporations(): Corporation[] {
  const gameData = getStoreGameData();
  return Array.from(gameData.corporations.values());
}

/**
 * Gets all levels for a specific corporation
 * @param corpId - Corporation ID (e.g., "selenian_corporation")
 * @returns Array of corporation levels (empty if corporation not found)
 * @throws {Error} If game data is not loaded
 */
export function getCorporationLevels(corpId: string): CorporationLevel[] {
  const corp = getCorporation(corpId);
  return corp?.levels ?? [];
}

/**
 * Gets all rewards granted at a specific corporation level
 * @param corpId - Corporation ID (e.g., "selenian_corporation")
 * @param level - The level number to get rewards for
 * @returns Array of rewards at the specified level (empty if not found)
 * @throws {Error} If game data is not loaded
 */
export function getRewardsAtLevel(corpId: string, level: number): CorporationReward[] {
  const indices = getStoreIndices();
  const levelMap = indices.rewardsByCorpLevel.get(corpId);
  return levelMap?.get(level) ?? [];
}

/**
 * Gets rewards of a specific type at a corporation level
 * @param corpId - Corporation ID (e.g., "selenian_corporation")
 * @param level - The level number to get rewards for
 * @param type - The reward type to filter by
 * @returns Array of rewards of the specified type (empty if not found)
 * @throws {Error} If game data is not loaded
 */
export function getRewardsByType(
  corpId: string,
  level: number,
  type: RewardType
): CorporationReward[] {
  const rewards = getRewardsAtLevel(corpId, level);
  return rewards.filter((reward) => reward.type === type);
}

/**
 * Gets all rails unlocked at a specific corporation level
 * @param corpId - Corporation ID (e.g., "selenian_corporation")
 * @param level - The level number
 * @returns Array of rails unlocked at this level (empty if none)
 * @throws {Error} If game data is not loaded
 */
export function getRailsUnlockedBy(corpId: string, level: number): Rail[] {
  const rewards = getRewardsByType(corpId, level, "rail");
  const gameData = getStoreGameData();

  const rails: Rail[] = [];
  for (const reward of rewards) {
    if (reward.id) {
      const rail = gameData.rails.get(reward.id);
      if (rail) {
        rails.push(rail);
      }
    }
  }

  return rails;
}

/**
 * Gets all buildings unlocked at a specific corporation level
 * @param corpId - Corporation ID (e.g., "selenian_corporation")
 * @param level - The level number
 * @returns Array of buildings unlocked at this level (empty if none)
 * @throws {Error} If game data is not loaded
 */
export function getBuildingsUnlockedBy(corpId: string, level: number): Building[] {
  const rewards = getRewardsByType(corpId, level, "building");
  const gameData = getStoreGameData();

  const buildings: Building[] = [];
  for (const reward of rewards) {
    if (reward.id) {
      const building = gameData.buildings.get(reward.id);
      if (building) {
        buildings.push(building);
      }
    }
  }

  return buildings;
}
