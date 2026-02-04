/**
 * Game data validation module
 * Validates cross-references and data consistency after loading
 */

import type { RawGameData } from "./loader";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * A single validation error with context
 */
export interface ValidationError {
  /** Error code for programmatic handling (e.g., "MISSING_BUILDING_REF") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Source file where the error was found */
  file: string;
  /** ID of the entity that has the error (if applicable) */
  entityId?: string;
}

/**
 * Result of validating game data
 */
export interface ValidationResult {
  /** Whether all validations passed */
  isValid: boolean;
  /** List of all validation errors found */
  errors: ValidationError[];
}

// ─────────────────────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────────────────────

export const ValidationErrorCodes = {
  DUPLICATE_ID: "DUPLICATE_ID",
  MISSING_BUILDING_REF: "MISSING_BUILDING_REF",
  MISSING_ITEM_REF: "MISSING_ITEM_REF",
  MISSING_RECIPE_REF: "MISSING_RECIPE_REF",
  MISSING_CORPORATION_REF: "MISSING_CORPORATION_REF",
  MISSING_RAIL_REF: "MISSING_RAIL_REF",
} as const;

// ─────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────

/**
 * Validates that all game data cross-references are consistent.
 * Collects ALL errors before returning (not fail-fast).
 *
 * @param data - Raw game data to validate
 * @returns Validation result with isValid flag and array of errors
 */
export function validateGameData(data: RawGameData): ValidationResult {
  const errors: ValidationError[] = [];

  // Build ID sets for quick lookup
  const itemIds = new Set(data.items.map((i) => i.id));
  const buildingIds = new Set(data.buildings.map((b) => b.id));
  const recipeIds = new Set(data.recipes.map((r) => r.id));
  const railIds = new Set(data.rails.map((r) => r.id));
  const corporationIds = new Set(data.corporations.map((c) => c.id));

  // Check for duplicate IDs
  errors.push(...checkDuplicateIds(data.items, "items_catalog.json", "item"));
  errors.push(...checkDuplicateIds(data.buildings, "buildings.json", "building"));
  errors.push(...checkDuplicateIds(data.recipes, "recipes.json", "recipe"));
  errors.push(...checkDuplicateIds(data.rails, "rails.json", "rail"));
  errors.push(
    ...checkDuplicateIds(
      data.corporations,
      "corporations_components.json",
      "corporation"
    )
  );

  // Validate recipe references
  for (const recipe of data.recipes) {
    // Check buildingId exists
    if (!buildingIds.has(recipe.buildingId)) {
      errors.push({
        code: ValidationErrorCodes.MISSING_BUILDING_REF,
        message: `Recipe "${recipe.id}" references non-existent building "${recipe.buildingId}"`,
        file: "recipes.json",
        entityId: recipe.id,
      });
    }

    // Check output item exists
    if (!itemIds.has(recipe.output.id)) {
      errors.push({
        code: ValidationErrorCodes.MISSING_ITEM_REF,
        message: `Recipe "${recipe.id}" output references non-existent item "${recipe.output.id}"`,
        file: "recipes.json",
        entityId: recipe.id,
      });
    }

    // Check input items exist
    for (const input of recipe.inputs) {
      if (!itemIds.has(input.id)) {
        errors.push({
          code: ValidationErrorCodes.MISSING_ITEM_REF,
          message: `Recipe "${recipe.id}" input references non-existent item "${input.id}"`,
          file: "recipes.json",
          entityId: recipe.id,
        });
      }
    }
  }

  // Validate building references
  for (const building of data.buildings) {
    // Check recipeIds exist (if present)
    if (building.recipeIds) {
      for (const recipeId of building.recipeIds) {
        if (!recipeIds.has(recipeId)) {
          errors.push({
            code: ValidationErrorCodes.MISSING_RECIPE_REF,
            message: `Building "${building.id}" references non-existent recipe "${recipeId}"`,
            file: "buildings.json",
            entityId: building.id,
          });
        }
      }
    }

    // Check unlockedBy corporation exists (if present)
    if (building.unlockedBy && !corporationIds.has(building.unlockedBy.corporation)) {
      errors.push({
        code: ValidationErrorCodes.MISSING_CORPORATION_REF,
        message: `Building "${building.id}" references non-existent corporation "${building.unlockedBy.corporation}"`,
        file: "buildings.json",
        entityId: building.id,
      });
    }
  }

  // Validate rail references
  for (const rail of data.rails) {
    // Check unlockedBy corporation exists (if present)
    if (rail.unlockedBy && !corporationIds.has(rail.unlockedBy.corporation)) {
      errors.push({
        code: ValidationErrorCodes.MISSING_CORPORATION_REF,
        message: `Rail "${rail.id}" references non-existent corporation "${rail.unlockedBy.corporation}"`,
        file: "rails.json",
        entityId: rail.id,
      });
    }
  }

  // Validate corporation reward references
  for (const corporation of data.corporations) {
    for (const level of corporation.levels) {
      for (const reward of level.rewards) {
        // Only validate rewards with id references
        if (reward.type === "building" && reward.id) {
          if (!buildingIds.has(reward.id)) {
            errors.push({
              code: ValidationErrorCodes.MISSING_BUILDING_REF,
              message: `Corporation "${corporation.id}" level ${level.level} reward references non-existent building "${reward.id}"`,
              file: "corporations_components.json",
              entityId: corporation.id,
            });
          }
        }

        if (reward.type === "rail" && reward.id) {
          if (!railIds.has(reward.id)) {
            errors.push({
              code: ValidationErrorCodes.MISSING_RAIL_REF,
              message: `Corporation "${corporation.id}" level ${level.level} reward references non-existent rail "${reward.id}"`,
              file: "corporations_components.json",
              entityId: corporation.id,
            });
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Checks for duplicate IDs in an array of entities
 */
function checkDuplicateIds(
  entities: { id: string }[],
  file: string,
  entityType: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();

  for (const entity of entities) {
    if (seen.has(entity.id)) {
      errors.push({
        code: ValidationErrorCodes.DUPLICATE_ID,
        message: `Duplicate ${entityType} ID: "${entity.id}"`,
        file,
        entityId: entity.id,
      });
    }
    seen.add(entity.id);
  }

  return errors;
}
