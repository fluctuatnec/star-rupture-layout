/**
 * Game data module - barrel exports
 * Provides a clean public API for game data loading, validation, and lookups
 */

// ─────────────────────────────────────────────────────────────
// Loader exports
// ─────────────────────────────────────────────────────────────

export { loadRawGameData, GameDataLoadError } from "./loader";
export type { RawGameData } from "./loader";

// ─────────────────────────────────────────────────────────────
// Validator exports
// ─────────────────────────────────────────────────────────────

export { validateGameData, ValidationErrorCodes } from "./validator";
export type { ValidationError, ValidationResult } from "./validator";

// ─────────────────────────────────────────────────────────────
// Index/Map builder exports
// ─────────────────────────────────────────────────────────────

export { buildGameDataMaps, buildGameDataIndices } from "./indices";
export type { GameDataIndices } from "./indices";

// ─────────────────────────────────────────────────────────────
// Lookup helper exports
// ─────────────────────────────────────────────────────────────

// Item lookups
export {
  getItem,
  getItemsByType,
  getItemsByTier,
  getAllItems,
} from "./lookups";

// Building lookups
export {
  getBuilding,
  getBuildingsByType,
  getBuildingsByCorporation,
  getAllBuildings,
} from "./lookups";

// Recipe lookups
export {
  getRecipe,
  getRecipesByBuilding,
  getRecipesProducing,
  getRecipesConsuming,
  getAllRecipes,
} from "./lookups";

// Rail lookups
export { getRail, getRailsByMinCapacity, getAllRails } from "./lookups";

// Corporation lookups
export {
  getCorporation,
  getAllCorporations,
  getCorporationLevels,
  getRewardsAtLevel,
  getRewardsByType,
  getRailsUnlockedBy,
  getBuildingsUnlockedBy,
} from "./lookups";

// ─────────────────────────────────────────────────────────────
// Type re-exports from game.ts
// ─────────────────────────────────────────────────────────────

export type {
  GameData,
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
} from "../types/game";
