/**
 * Test fixtures for game data
 * Provides minimal valid data structures for unit testing
 */

import type {
  Item,
  Building,
  Recipe,
  Rail,
  Corporation,
} from "../../core/types/game";
import type { RawGameData } from "../../core/data/loader";

// ─────────────────────────────────────────────────────────────
// Individual Entity Fixtures
// ─────────────────────────────────────────────────────────────

export const mockItems: Item[] = [
  {
    id: "ore_titanium",
    name: "Titanium Ore",
    type: "raw",
    tier: 0,
  },
  {
    id: "bar_titanium",
    name: "Titanium Bar",
    type: "processed",
    tier: 1,
  },
  {
    id: "ceramics",
    name: "Ceramics",
    type: "component",
    tier: 2,
  },
];

export const mockBuildings: Building[] = [
  {
    id: "ore_excavator",
    name: "Ore Excavator",
    type: "extraction",
    size: 3,
    power: 5,
    heat: 2,
    inputSockets: 0,
    outputSockets: 1,
    recipeIds: ["titanium_ore_normal"],
    unlockedBy: { corporation: "selenian_corporation", level: 1 },
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
    buildCost: { bar_titanium: 10 },
    recipeIds: ["titanium_bar"],
    unlockedBy: { corporation: "selenian_corporation", level: 2 },
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
    capacity: 100,
  },
];

export const mockRecipes: Recipe[] = [
  {
    id: "titanium_ore_normal",
    buildingId: "ore_excavator",
    output: { id: "ore_titanium", amount: 1 },
    inputs: [],
    duration: 2,
    outputPerMinute: 30,
    purity: "normal",
  },
  {
    id: "titanium_bar",
    buildingId: "smelter",
    output: { id: "bar_titanium", amount: 1 },
    inputs: [{ id: "ore_titanium", amount: 2 }],
    duration: 4,
    outputPerMinute: 15,
  },
];

export const mockRails: Rail[] = [
  {
    id: "rail_v1",
    name: "Rail V1",
    size: 1,
    capacity: 60,
    power: 1,
    heat: 0,
    unlockedBy: { corporation: "selenian_corporation", level: 1 },
  },
  {
    id: "rail_v2",
    name: "Rail V2",
    size: 1,
    capacity: 120,
    power: 2,
    heat: 0,
    buildCost: { bar_titanium: 5 },
    unlockedBy: { corporation: "selenian_corporation", level: 3 },
  },
];

export const mockCorporations: Corporation[] = [
  {
    id: "selenian_corporation",
    name: "Selenian Corporation",
    description: "Factories and production facilities",
    levels: [
      {
        level: 1,
        xp: 0,
        components: [],
        rewards: [
          { type: "building", id: "ore_excavator" },
          { type: "rail", id: "rail_v1" },
        ],
      },
      {
        level: 2,
        xp: 100,
        components: [{ id: "bar_titanium", points: 10 }],
        rewards: [{ type: "building", id: "smelter" }],
      },
      {
        level: 3,
        xp: 300,
        components: [{ id: "bar_titanium", points: 10 }],
        rewards: [{ type: "rail", id: "rail_v2" }],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Complete RawGameData Fixture
// ─────────────────────────────────────────────────────────────

export const mockRawGameData: RawGameData = {
  items: mockItems,
  buildings: mockBuildings,
  recipes: mockRecipes,
  rails: mockRails,
  corporations: mockCorporations,
};

// ─────────────────────────────────────────────────────────────
// Invalid Data Fixtures (for error testing)
// ─────────────────────────────────────────────────────────────

export const invalidJsonString = "{ invalid json }";

export const emptyRawGameData: RawGameData = {
  items: [],
  buildings: [],
  recipes: [],
  rails: [],
  corporations: [],
};
