/**
 * Migration planning types
 * Based on specification document Section 8
 */

import type { FactoryLayout, LayoutNode, ProductionTarget } from "./layout";

// ─────────────────────────────────────────────────────────────
// Migration Changes
// ─────────────────────────────────────────────────────────────

export interface AddNodeChange {
  type: "add_node";
  node: LayoutNode;
  reason: string; // "Required for Tube production"
  dependsOn: string[]; // IDs of changes this depends on
}

export interface RemoveNodeChange {
  type: "remove_node";
  nodeId: string;
  reason: string; // "No longer needed"
  blockedBy: string[]; // Must remove these connections first
}

export interface ModifyNodeChange {
  type: "modify_node";
  nodeId: string;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  reason: string;
}

export interface AddConnectionChange {
  type: "add_connection";
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  reason: string;
  dependsOn: string[];
}

export interface RemoveConnectionChange {
  type: "remove_connection";
  connectionId: string;
  reason: string;
}

export interface ModifyConnectionChange {
  type: "modify_connection";
  connectionId: string;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  reason: string;
}

export interface UpgradeRailChange {
  type: "upgrade_rail";
  nodeId: string;
  oldTier: string;
  newTier: string;
  reason: string; // "Capacity insufficient for new flow"
}

export type MigrationChange =
  | AddNodeChange
  | RemoveNodeChange
  | ModifyNodeChange
  | AddConnectionChange
  | RemoveConnectionChange
  | ModifyConnectionChange
  | UpgradeRailChange;

// ─────────────────────────────────────────────────────────────
// Migration Summary
// ─────────────────────────────────────────────────────────────

export type MigrationDifficulty = "trivial" | "easy" | "moderate" | "complex" | "major";

export interface MigrationSummary {
  // Node changes
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;

  // Rail changes
  railsAdded: number;
  railsRemoved: number;
  railsUpgraded: number;

  // Connectors
  connectorsAdded: number;
  connectorsRemoved: number;

  // Resource delta
  powerDelta: number; // New total - old total
  heatDelta: number;

  // Complexity
  estimatedDifficulty: MigrationDifficulty;

  // Cost (items required)
  materialCost: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────
// Migration Plan
// ─────────────────────────────────────────────────────────────

export interface MigrationPlan {
  id: string;

  // Source and target
  sourceLayoutId: string;
  sourceTargets: ProductionTarget[];
  targetTargets: ProductionTarget[]; // New desired targets

  // Changes
  changes: MigrationChange[];

  // Summary
  summary: MigrationSummary;

  // Resulting layout (preview)
  resultingLayout: FactoryLayout;

  // Metadata
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Migration Analysis
// ─────────────────────────────────────────────────────────────

export type BuildingAnalysis = "reuse" | "expand" | "new";

export interface BuildingRequirementAnalysis {
  buildingTypeId: string;
  recipeId: string;
  requiredCount: number;
  existingCount: number;
  spareCapacity: number;
  analysis: BuildingAnalysis;
}

export interface FlowAnalysis {
  fromBuildingId: string;
  toBuildingId: string;
  itemId: string;
  requiredRate: number;
  existingRate: number;
  analysis: "reuse" | "upgrade" | "add";
}
