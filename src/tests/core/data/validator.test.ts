/**
 * Tests for game data validator
 */

import { describe, it, expect } from "vitest";
import { validateGameData, ValidationErrorCodes } from "../../../core/data/validator";
import type { RawGameData } from "../../../core/data/loader";
import { mockRawGameData, emptyRawGameData } from "../../fixtures/gameData";

// ─────────────────────────────────────────────────────────────
// Helper to create modified test data
// ─────────────────────────────────────────────────────────────

function createTestData(overrides: Partial<RawGameData>): RawGameData {
  return {
    ...mockRawGameData,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// Valid Data Tests
// ─────────────────────────────────────────────────────────────

describe("validateGameData - valid data", () => {
  it("should pass validation for valid mock data", () => {
    const result = validateGameData(mockRawGameData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should pass validation for empty data", () => {
    const result = validateGameData(emptyRawGameData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should pass validation when building has no recipeIds", () => {
    // Isolated data set with no cross-references
    const data: RawGameData = {
      items: [],
      buildings: [
        {
          id: "generator",
          name: "Generator",
          type: "generator",
          size: 2,
          power: -20, // produces power
          heat: 5,
          inputSockets: 0,
          outputSockets: 0,
          // no recipeIds - this is valid
        },
      ],
      recipes: [],
      rails: [],
      corporations: [],
    };

    const result = validateGameData(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should pass validation when building has no unlockedBy", () => {
    // Isolated data set with no cross-references
    const data: RawGameData = {
      items: [],
      buildings: [
        {
          id: "base_core",
          name: "Base Core",
          type: "habitat",
          size: 5,
          power: 0,
          heat: 0,
          inputSockets: 0,
          outputSockets: 0,
          // no unlockedBy - this is valid (starter building)
        },
      ],
      recipes: [],
      rails: [],
      corporations: [],
    };

    const result = validateGameData(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should pass validation when rail has no unlockedBy", () => {
    // Isolated data set with no cross-references
    const data: RawGameData = {
      items: [],
      buildings: [],
      recipes: [],
      rails: [
        {
          id: "rail_basic",
          name: "Basic Rail",
          size: 1,
          capacity: 30,
          power: 0,
          heat: 0,
          // no unlockedBy - this is valid
        },
      ],
      corporations: [],
    };

    const result = validateGameData(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Duplicate ID Tests
// ─────────────────────────────────────────────────────────────

describe("validateGameData - duplicate IDs", () => {
  it("should detect duplicate item IDs", () => {
    // Isolated data set to test only duplicate detection
    const data: RawGameData = {
      items: [
        { id: "duplicate_item", name: "Item 1", type: "raw", tier: 0 },
        { id: "duplicate_item", name: "Item 2", type: "raw", tier: 0 },
      ],
      buildings: [],
      recipes: [],
      rails: [],
      corporations: [],
    };

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(ValidationErrorCodes.DUPLICATE_ID);
    expect(result.errors[0].file).toBe("items_catalog.json");
    expect(result.errors[0].entityId).toBe("duplicate_item");
  });

  it("should detect duplicate building IDs", () => {
    const data = createTestData({
      buildings: [
        {
          id: "dup_building",
          name: "Building 1",
          type: "processing",
          size: 2,
          power: 5,
          heat: 2,
          inputSockets: 1,
          outputSockets: 1,
        },
        {
          id: "dup_building",
          name: "Building 2",
          type: "storage",
          size: 3,
          power: 1,
          heat: 0,
          inputSockets: 1,
          outputSockets: 1,
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === ValidationErrorCodes.DUPLICATE_ID)).toBe(
      true
    );
    expect(result.errors.some((e) => e.file === "buildings.json")).toBe(true);
  });

  it("should detect duplicate recipe IDs", () => {
    const data = createTestData({
      recipes: [
        {
          id: "dup_recipe",
          buildingId: "smelter",
          output: { id: "bar_titanium", amount: 1 },
          inputs: [],
          duration: 2,
          outputPerMinute: 30,
        },
        {
          id: "dup_recipe",
          buildingId: "smelter",
          output: { id: "bar_titanium", amount: 2 },
          inputs: [],
          duration: 4,
          outputPerMinute: 30,
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === ValidationErrorCodes.DUPLICATE_ID)).toBe(
      true
    );
    expect(result.errors.some((e) => e.file === "recipes.json")).toBe(true);
  });

  it("should detect duplicate rail IDs", () => {
    const data = createTestData({
      rails: [
        { id: "dup_rail", name: "Rail 1", size: 1, capacity: 60, power: 1, heat: 0 },
        { id: "dup_rail", name: "Rail 2", size: 1, capacity: 120, power: 2, heat: 0 },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === ValidationErrorCodes.DUPLICATE_ID)).toBe(
      true
    );
    expect(result.errors.some((e) => e.file === "rails.json")).toBe(true);
  });

  it("should detect duplicate corporation IDs", () => {
    const data = createTestData({
      corporations: [
        { id: "dup_corp", name: "Corp 1", description: "First", levels: [] },
        { id: "dup_corp", name: "Corp 2", description: "Second", levels: [] },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === ValidationErrorCodes.DUPLICATE_ID)).toBe(
      true
    );
    expect(result.errors.some((e) => e.file === "corporations_components.json")).toBe(
      true
    );
  });
});

// ─────────────────────────────────────────────────────────────
// Recipe Reference Tests
// ─────────────────────────────────────────────────────────────

describe("validateGameData - recipe references", () => {
  it("should detect missing building reference in recipe", () => {
    const data = createTestData({
      recipes: [
        {
          id: "bad_recipe",
          buildingId: "nonexistent_building",
          output: { id: "bar_titanium", amount: 1 },
          inputs: [{ id: "ore_titanium", amount: 2 }],
          duration: 4,
          outputPerMinute: 15,
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === ValidationErrorCodes.MISSING_BUILDING_REF
    );
    expect(error).toBeDefined();
    expect(error?.message).toContain("nonexistent_building");
    expect(error?.entityId).toBe("bad_recipe");
    expect(error?.file).toBe("recipes.json");
  });

  it("should detect missing item reference in recipe output", () => {
    const data = createTestData({
      recipes: [
        {
          id: "bad_output_recipe",
          buildingId: "smelter",
          output: { id: "nonexistent_item", amount: 1 },
          inputs: [{ id: "ore_titanium", amount: 2 }],
          duration: 4,
          outputPerMinute: 15,
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    const error = result.errors.find(
      (e) =>
        e.code === ValidationErrorCodes.MISSING_ITEM_REF &&
        e.message.includes("output")
    );
    expect(error).toBeDefined();
    expect(error?.message).toContain("nonexistent_item");
    expect(error?.entityId).toBe("bad_output_recipe");
  });

  it("should detect missing item reference in recipe input", () => {
    const data = createTestData({
      recipes: [
        {
          id: "bad_input_recipe",
          buildingId: "smelter",
          output: { id: "bar_titanium", amount: 1 },
          inputs: [{ id: "nonexistent_input", amount: 2 }],
          duration: 4,
          outputPerMinute: 15,
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    const error = result.errors.find(
      (e) =>
        e.code === ValidationErrorCodes.MISSING_ITEM_REF &&
        e.message.includes("input")
    );
    expect(error).toBeDefined();
    expect(error?.message).toContain("nonexistent_input");
    expect(error?.entityId).toBe("bad_input_recipe");
  });

  it("should detect multiple missing inputs in one recipe", () => {
    const data = createTestData({
      recipes: [
        {
          id: "multi_bad_inputs",
          buildingId: "smelter",
          output: { id: "bar_titanium", amount: 1 },
          inputs: [
            { id: "missing_input_1", amount: 1 },
            { id: "missing_input_2", amount: 1 },
          ],
          duration: 4,
          outputPerMinute: 15,
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    const inputErrors = result.errors.filter(
      (e) =>
        e.code === ValidationErrorCodes.MISSING_ITEM_REF &&
        e.message.includes("input")
    );
    expect(inputErrors).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────
// Building Reference Tests
// ─────────────────────────────────────────────────────────────

describe("validateGameData - building references", () => {
  it("should detect missing recipe reference in building", () => {
    const data = createTestData({
      buildings: [
        {
          id: "bad_building",
          name: "Bad Building",
          type: "processing",
          size: 3,
          power: 10,
          heat: 5,
          inputSockets: 1,
          outputSockets: 1,
          recipeIds: ["nonexistent_recipe"],
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === ValidationErrorCodes.MISSING_RECIPE_REF
    );
    expect(error).toBeDefined();
    expect(error?.message).toContain("nonexistent_recipe");
    expect(error?.entityId).toBe("bad_building");
    expect(error?.file).toBe("buildings.json");
  });

  it("should detect missing corporation reference in building unlockedBy", () => {
    const data = createTestData({
      buildings: [
        {
          id: "locked_building",
          name: "Locked Building",
          type: "processing",
          size: 3,
          power: 10,
          heat: 5,
          inputSockets: 1,
          outputSockets: 1,
          unlockedBy: { corporation: "nonexistent_corp", level: 5 },
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === ValidationErrorCodes.MISSING_CORPORATION_REF
    );
    expect(error).toBeDefined();
    expect(error?.message).toContain("nonexistent_corp");
    expect(error?.entityId).toBe("locked_building");
    expect(error?.file).toBe("buildings.json");
  });
});

// ─────────────────────────────────────────────────────────────
// Rail Reference Tests
// ─────────────────────────────────────────────────────────────

describe("validateGameData - rail references", () => {
  it("should detect missing corporation reference in rail unlockedBy", () => {
    const data = createTestData({
      rails: [
        {
          id: "locked_rail",
          name: "Locked Rail",
          size: 1,
          capacity: 60,
          power: 1,
          heat: 0,
          unlockedBy: { corporation: "nonexistent_corp", level: 3 },
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === ValidationErrorCodes.MISSING_CORPORATION_REF
    );
    expect(error).toBeDefined();
    expect(error?.message).toContain("nonexistent_corp");
    expect(error?.entityId).toBe("locked_rail");
    expect(error?.file).toBe("rails.json");
  });
});

// ─────────────────────────────────────────────────────────────
// Corporation Reward Reference Tests
// ─────────────────────────────────────────────────────────────

describe("validateGameData - corporation reward references", () => {
  it("should detect missing building reference in corporation reward", () => {
    const data = createTestData({
      corporations: [
        {
          id: "test_corp",
          name: "Test Corp",
          description: "Test",
          levels: [
            {
              level: 1,
              xp: 0,
              components: [],
              rewards: [{ type: "building", id: "nonexistent_building" }],
            },
          ],
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    const error = result.errors.find(
      (e) =>
        e.code === ValidationErrorCodes.MISSING_BUILDING_REF &&
        e.file === "corporations_components.json"
    );
    expect(error).toBeDefined();
    expect(error?.message).toContain("nonexistent_building");
    expect(error?.message).toContain("level 1");
    expect(error?.entityId).toBe("test_corp");
  });

  it("should detect missing rail reference in corporation reward", () => {
    const data = createTestData({
      corporations: [
        {
          id: "test_corp",
          name: "Test Corp",
          description: "Test",
          levels: [
            {
              level: 2,
              xp: 100,
              components: [],
              rewards: [{ type: "rail", id: "nonexistent_rail" }],
            },
          ],
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    const error = result.errors.find(
      (e) => e.code === ValidationErrorCodes.MISSING_RAIL_REF
    );
    expect(error).toBeDefined();
    expect(error?.message).toContain("nonexistent_rail");
    expect(error?.message).toContain("level 2");
    expect(error?.entityId).toBe("test_corp");
  });

  it("should not validate non-id reward types (utility, currency, etc.)", () => {
    // Isolated data set - corporations with only non-id reward types
    const data: RawGameData = {
      items: [],
      buildings: [],
      recipes: [],
      rails: [],
      corporations: [
        {
          id: "test_corp",
          name: "Test Corp",
          description: "Test",
          levels: [
            {
              level: 1,
              xp: 0,
              components: [],
              rewards: [
                { type: "utility", name: "Some Utility" },
                { type: "currency", name: "Credits", amount: 100 },
                { type: "lem", name: "Lem Module" },
                { type: "weapon", name: "Laser Gun" },
                { type: "item", name: "Mystery Item" },
                { type: "module_pack", name: "Module Pack" },
                { type: "meta", name: "Achievement" },
              ],
            },
          ],
        },
      ],
    };

    const result = validateGameData(data);

    // These should not trigger any validation errors because they don't have id references
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate building reward with id but not without", () => {
    // Self-consistent data: building exists and is referenced
    const data: RawGameData = {
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
        },
      ],
      recipes: [],
      rails: [],
      corporations: [
        {
          id: "test_corp",
          name: "Test Corp",
          description: "Test",
          levels: [
            {
              level: 1,
              xp: 0,
              components: [],
              rewards: [
                { type: "building", id: "ore_excavator" }, // valid - exists
                { type: "building", name: "Some Building" }, // valid - no id to check
              ],
            },
          ],
        },
      ],
    };

    const result = validateGameData(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Error Accumulation Tests
// ─────────────────────────────────────────────────────────────

describe("validateGameData - error accumulation", () => {
  it("should accumulate multiple errors (not fail-fast)", () => {
    const data = createTestData({
      items: [
        { id: "dup_item", name: "Item 1", type: "raw", tier: 0 },
        { id: "dup_item", name: "Item 2", type: "raw", tier: 0 },
      ],
      recipes: [
        {
          id: "bad_recipe",
          buildingId: "nonexistent_building",
          output: { id: "nonexistent_output", amount: 1 },
          inputs: [{ id: "nonexistent_input", amount: 1 }],
          duration: 2,
          outputPerMinute: 30,
        },
      ],
      buildings: [
        {
          id: "bad_building",
          name: "Bad Building",
          type: "processing",
          size: 2,
          power: 5,
          heat: 2,
          inputSockets: 1,
          outputSockets: 1,
          unlockedBy: { corporation: "fake_corp", level: 1 },
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);
    // Should have at least: 1 duplicate, 1 missing building, 1 missing output item,
    // 1 missing input item, 1 missing corporation
    expect(result.errors.length).toBeGreaterThanOrEqual(5);

    // Verify different error codes are present
    const errorCodes = new Set(result.errors.map((e) => e.code));
    expect(errorCodes.has(ValidationErrorCodes.DUPLICATE_ID)).toBe(true);
    expect(errorCodes.has(ValidationErrorCodes.MISSING_BUILDING_REF)).toBe(true);
    expect(errorCodes.has(ValidationErrorCodes.MISSING_ITEM_REF)).toBe(true);
    expect(errorCodes.has(ValidationErrorCodes.MISSING_CORPORATION_REF)).toBe(true);
  });

  it("should report errors from multiple files", () => {
    const data = createTestData({
      items: [
        { id: "dup", name: "Item", type: "raw", tier: 0 },
        { id: "dup", name: "Item", type: "raw", tier: 0 },
      ],
      buildings: [
        {
          id: "dup",
          name: "Building",
          type: "storage",
          size: 2,
          power: 1,
          heat: 0,
          inputSockets: 1,
          outputSockets: 1,
        },
        {
          id: "dup",
          name: "Building",
          type: "storage",
          size: 2,
          power: 1,
          heat: 0,
          inputSockets: 1,
          outputSockets: 1,
        },
      ],
    });

    const result = validateGameData(data);

    expect(result.isValid).toBe(false);

    const files = new Set(result.errors.map((e) => e.file));
    expect(files.has("items_catalog.json")).toBe(true);
    expect(files.has("buildings.json")).toBe(true);
  });
});
