/**
 * Game data types for Star Rupture
 * These types match the JSON data files in /data
 */

import type { PlacementConstraint } from "./layout";

// ─────────────────────────────────────────────────────────────
// Items
// ─────────────────────────────────────────────────────────────

export type ItemType = "raw" | "processed" | "component" | "advanced";

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  tier: number;
}

// ─────────────────────────────────────────────────────────────
// Buildings
// ─────────────────────────────────────────────────────────────

export type BuildingType = "extraction" | "processing" | "production" | "storage";

export interface UnlockRequirement {
  corporation: string;
  level: number | null;
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
  buildCost: Record<string, number>;
  unlockedBy: UnlockRequirement;
  recipeIds: string[];
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
// Rail Infrastructure
// ─────────────────────────────────────────────────────────────

export type RailInfrastructureType = "rail" | "support" | "connector" | "modulator";

export interface RailTier {
  id: string;
  name: string;
  type: RailInfrastructureType;
  size: number;
  capacity?: number; // items/min (for rail type)
  sockets?: number; // for support structures
  maxPorts?: number; // for connectors
  maxConnections?: number; // for modulators
  power: number;
  heat: number;
  buildCost: Record<string, number>;
  unlockedBy: UnlockRequirement;
}

// ─────────────────────────────────────────────────────────────
// Corporation & Progression
// ─────────────────────────────────────────────────────────────

export interface CorporationLevel {
  level: number;
  unlocks: string[]; // building/item IDs unlocked at this level
}

export interface Corporation {
  id: string;
  name: string;
  levels: CorporationLevel[];
}

// ─────────────────────────────────────────────────────────────
// Game Data Store (all data combined)
// ─────────────────────────────────────────────────────────────

export interface GameData {
  items: Map<string, Item>;
  buildings: Map<string, Building>;
  recipes: Map<string, Recipe>;
  railTiers: Map<string, RailTier>;
  corporations: Map<string, Corporation>;
}

// ─────────────────────────────────────────────────────────────
// Helper type for recipe lookup
// ─────────────────────────────────────────────────────────────

export interface RecipesByItem {
  producedBy: Recipe[]; // recipes that output this item
  consumedBy: Recipe[]; // recipes that use this item as input
}
