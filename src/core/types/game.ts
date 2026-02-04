/**
 * Game data types for Star Rupture
 * These types match the JSON data files in /data
 */

import type { PlacementConstraint } from "./layout";

// ─────────────────────────────────────────────────────────────
// Items
// ─────────────────────────────────────────────────────────────

export type ItemType = "raw" | "processed" | "component" | "material" | "ammo";

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  tier: number;
}

// ─────────────────────────────────────────────────────────────
// Buildings
// ─────────────────────────────────────────────────────────────

export type BuildingType =
  | "extraction"
  | "processing"
  | "crafting"
  | "generator"
  | "transport"
  | "storage"
  | "temperature"
  | "habitat"
  | "defense"
  | "rail_support"
  | "rail_junction";

export interface UnlockRequirement {
  corporation: string;
  level: number | null; // null for unreleased content
}

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  size: number; // e.g., 3 = 3x3 grid cells
  placementConstraint?: PlacementConstraint;
  power: number;
  heat: number;
  inputSockets: number;
  outputSockets: number;
  buildCost?: Record<string, number>; // Optional - some buildings have no build cost
  unlockedBy?: UnlockRequirement; // Optional - some buildings have no unlock requirement
  recipeIds?: string[]; // Optional - generators, storage, etc. have no recipes
  capacity?: number; // Optional - for storage buildings
  coolingCapacity?: number; // Optional - for base core
  railConnections?: number; // Optional - for rail_support and rail_junction types
}

// ─────────────────────────────────────────────────────────────
// Recipes
// ─────────────────────────────────────────────────────────────

export type Purity = "impure" | "normal" | "pure";

export interface RecipeItem {
  id: string;
  amount: number;
}

export interface Recipe {
  id: string;
  buildingId: string;
  output: RecipeItem;
  inputs: RecipeItem[];
  duration: number; // seconds
  outputPerMinute: number;
  purity?: Purity; // for extraction recipes
}

// ─────────────────────────────────────────────────────────────
// Rails (transport edges)
// ─────────────────────────────────────────────────────────────

/**
 * Rail - the transport line between buildings/infrastructure
 * Rails are edges in the factory graph with throughput capacity
 */
export interface Rail {
  id: string;
  name: string;
  size: number;
  capacity: number; // items/min throughput
  power: number;
  heat: number;
  buildCost?: Record<string, number>;
  unlockedBy?: UnlockRequirement;
}

// ─────────────────────────────────────────────────────────────
// Corporation & Progression
// ─────────────────────────────────────────────────────────────

/**
 * A component that can be contributed to corporation progression
 */
export interface CorporationComponent {
  id: string;
  points: number;
}

/**
 * Type of reward granted at corporation levels.
 * - "building" and "rail" have `id` that references data files
 * - Other types use `name` field (not relevant for factory layout planning)
 */
export type RewardType =
  | "building"
  | "rail"
  | "utility"
  | "lem"
  | "item"
  | "weapon"
  | "module_pack"
  | "currency"
  | "meta";

/**
 * A reward granted at a corporation level
 */
export interface CorporationReward {
  type: RewardType;
  id?: string; // For "building" and "rail" types - references data files
  name?: string; // For other types - display name only
  amount?: number; // Optional quantity (e.g., currency amounts)
}

/**
 * A single level in corporation progression
 */
export interface CorporationLevel {
  level: number;
  xp: number;
  components: CorporationComponent[];
  rewards: CorporationReward[];
}

/**
 * Corporation data
 */
export interface Corporation {
  id: string;
  name: string;
  description: string;
  levels: CorporationLevel[];
}

// ─────────────────────────────────────────────────────────────
// Game Data Store (all data combined)
// ─────────────────────────────────────────────────────────────

export interface GameData {
  items: Map<string, Item>;
  buildings: Map<string, Building>;
  recipes: Map<string, Recipe>;
  rails: Map<string, Rail>;
  corporations: Map<string, Corporation>;
}

// ─────────────────────────────────────────────────────────────
// Helper type for recipe lookup
// ─────────────────────────────────────────────────────────────

export interface RecipesByItem {
  producedBy: Recipe[]; // recipes that output this item
  consumedBy: Recipe[]; // recipes that use this item as input
}
