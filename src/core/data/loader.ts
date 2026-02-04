/**
 * Game data loader module
 * Loads all game data JSON files in parallel and returns typed data structures
 */

import type { Item, Building, Recipe, Rail, Corporation } from "../types/game";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Raw game data as loaded from JSON files (arrays, not Maps)
 */
export interface RawGameData {
  items: Item[];
  buildings: Building[];
  recipes: Recipe[];
  rails: Rail[];
  corporations: Corporation[];
}

/**
 * Error thrown when game data loading fails
 */
export class GameDataLoadError extends Error {
  readonly filename?: string;
  override readonly cause?: Error;

  constructor(message: string, filename?: string, cause?: Error) {
    super(message);
    this.name = "GameDataLoadError";
    this.filename = filename;
    this.cause = cause;
  }
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DATA_FILES = {
  items: "/data/items_catalog.json",
  buildings: "/data/buildings.json",
  recipes: "/data/recipes.json",
  rails: "/data/rails.json",
  corporations: "/data/corporations_components.json",
} as const;

// ─────────────────────────────────────────────────────────────
// Loader Functions
// ─────────────────────────────────────────────────────────────

/**
 * Fetches a single JSON file and parses it
 * @throws GameDataLoadError if fetch fails or JSON is invalid
 */
async function loadJsonFile<T>(path: string, filename: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path);
  } catch (error) {
    throw new GameDataLoadError(
      `Failed to fetch game data file: ${filename}`,
      filename,
      error instanceof Error ? error : undefined
    );
  }

  if (!response.ok) {
    throw new GameDataLoadError(
      `Game data file not found: ${filename} (HTTP ${response.status})`,
      filename
    );
  }

  let data: T;
  try {
    data = await response.json();
  } catch (error) {
    throw new GameDataLoadError(
      `Invalid JSON in game data file: ${filename}`,
      filename,
      error instanceof Error ? error : undefined
    );
  }

  return data;
}

/**
 * Loads all game data JSON files in parallel
 * @returns RawGameData with all entity arrays
 * @throws GameDataLoadError if any file fails to load or parse
 */
export async function loadRawGameData(): Promise<RawGameData> {
  const [items, buildings, recipes, rails, corporations] = await Promise.all([
    loadJsonFile<Item[]>(DATA_FILES.items, "items_catalog.json"),
    loadJsonFile<Building[]>(DATA_FILES.buildings, "buildings.json"),
    loadJsonFile<Recipe[]>(DATA_FILES.recipes, "recipes.json"),
    loadJsonFile<Rail[]>(DATA_FILES.rails, "rails.json"),
    loadJsonFile<Corporation[]>(
      DATA_FILES.corporations,
      "corporations_components.json"
    ),
  ]);

  return {
    items,
    buildings,
    recipes,
    rails,
    corporations,
  };
}
