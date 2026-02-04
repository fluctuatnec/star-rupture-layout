/**
 * Core layout types for the Factory Layout Planner
 * Based on specification document Section 4
 */

// ─────────────────────────────────────────────────────────────
// Spatial Primitives
// ─────────────────────────────────────────────────────────────

export interface Position {
  x: number;
  y: number;
  z?: number; // For multi-level factories (future)
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridCell {
  x: number;
  y: number;
  occupied: boolean;
  occupiedBy?: string; // Node ID
}

export type PlacementConstraint = "ore_deposit" | "helium_deposit" | "sulfur_deposit";

export type Direction = "north" | "south" | "east" | "west" | "up" | "down";

// ─────────────────────────────────────────────────────────────
// Ports
// ─────────────────────────────────────────────────────────────

export interface Port {
  id: string;
  nodeId: string; // Parent node
  localPosition: Position; // Relative to node origin
  direction: Direction;
  portType: "input" | "output";

  // Constraints
  itemFilter?: string[]; // Allowed items (null = any)
  maxRate: number; // items/min capacity

  // State
  connectedTo?: string; // Connection ID
  currentFlow: number; // Actual items/min
}

// ─────────────────────────────────────────────────────────────
// Base Node
// ─────────────────────────────────────────────────────────────

export type NodeType = "building" | "rail" | "connector" | "storage";

export interface BaseNode {
  id: string;
  type: NodeType;
  position: Position;
  rotation: 0 | 90 | 180 | 270;
  ports: Port[];

  // Metadata
  label?: string;
  locked?: boolean; // Prevent modification
}

// ─────────────────────────────────────────────────────────────
// Building Node
// ─────────────────────────────────────────────────────────────

export interface BuildingNode extends BaseNode {
  type: "building";

  // Reference to game data
  buildingTypeId: string; // e.g., "smelter", "fabricator"
  recipeId: string; // Active recipe

  // Physical properties (square footprint)
  size: number; // e.g., 3 = 3x3 grid cells
  placementConstraint?: PlacementConstraint; // For extractors only

  // Production
  count: number; // How many of this building (can be fractional for planning)
  actualCount: number; // Rounded up for actual placement

  // Power & Heat
  powerPerUnit: number;
  heatPerUnit: number;
}

// ─────────────────────────────────────────────────────────────
// Rail Node
// ─────────────────────────────────────────────────────────────

export interface ItemFlow {
  itemId: string;
  rate: number; // items/min
}

export interface RailNode extends BaseNode {
  type: "rail";

  // Rail properties
  tierId: string; // e.g., "rail_v1", "multirail_3"
  capacity: number; // items/min (from tier)

  // Physical path
  path: Position[]; // Sequence of grid cells
  length: number; // Path length in cells

  // Flow state
  flows: ItemFlow[];
  totalFlow: number;
  utilization: number; // totalFlow / capacity (0-1)
}

// ─────────────────────────────────────────────────────────────
// Connector Node
// ─────────────────────────────────────────────────────────────

export interface ConnectorNode extends BaseNode {
  type: "connector";

  maxPorts: number; // Usually 4
  mode: "split" | "merge" | "mixed";

  // Distribution rules (for split mode)
  distribution?: "equal" | "priority" | "round-robin";
  priorities?: Map<string, number>; // portId → priority
}

// ─────────────────────────────────────────────────────────────
// Storage Node
// ─────────────────────────────────────────────────────────────

export interface StorageNode extends BaseNode {
  type: "storage";

  // Reference to game data
  buildingTypeId: string; // e.g., "storage_depot_v1"

  // Physical properties
  size: BoundingBox;

  // Storage properties
  itemId: string; // What item is stored
  capacity: number; // Max items

  // Flow constraints
  maxInputRate: number; // items/min
  maxOutputRate: number; // items/min

  // Simulation state (optional)
  currentLevel?: number;
  fillRate?: number; // items/min (positive = filling, negative = draining)
}

// ─────────────────────────────────────────────────────────────
// Union Type for All Nodes
// ─────────────────────────────────────────────────────────────

export type LayoutNode = BuildingNode | RailNode | ConnectorNode | StorageNode;

// ─────────────────────────────────────────────────────────────
// Connections
// ─────────────────────────────────────────────────────────────

export interface Connection {
  id: string;

  // Endpoints
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;

  // Flow information (calculated)
  flows: ItemFlow[];
  totalRate: number;

  // Validation
  isValid: boolean;
  validationErrors: string[];
}

// ─────────────────────────────────────────────────────────────
// Production Targets
// ─────────────────────────────────────────────────────────────

export interface ProductionTarget {
  id: string;
  itemId: string;
  rate: number; // items/min
  priority: number; // Higher = more important

  // Optional: specific output location
  outputNodeId?: string;
  outputPortId?: string;
}

// ─────────────────────────────────────────────────────────────
// Layout Constraints
// ─────────────────────────────────────────────────────────────

export interface LayoutConstraints {
  availableRailTiers: string[];
  availableBuildings: string[];
  maxPower?: number;
  maxHeat?: number;
  reservedAreas?: BoundingBox[]; // Areas where nodes cannot be placed
}

// ─────────────────────────────────────────────────────────────
// Layout Statistics
// ─────────────────────────────────────────────────────────────

export interface Bottleneck {
  nodeId: string;
  nodeType: NodeType;
  issue: "over_capacity" | "near_capacity" | "unconnected" | "blocked";
  severity: "info" | "warning" | "error";
  details: string;
  suggestion?: string;
}

export interface BillOfMaterialsEntry {
  type: "building" | "rail" | "connector" | "storage";
  id: string;
  name: string;
  count: number;
  power: number;
  heat: number;
}

export interface LayoutStats {
  // Counts
  buildingCount: number;
  railCount: number;
  railTotalLength: number;
  connectorCount: number;
  storageCount: number;

  // Resources
  totalPower: number;
  totalHeat: number;

  // Efficiency
  averageRailUtilization: number;
  bottlenecks: Bottleneck[];

  // Bill of materials
  billOfMaterials: BillOfMaterialsEntry[];
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

export interface ValidationIssue {
  code: string;
  message: string;
  nodeId?: string;
  connectionId?: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
}

// ─────────────────────────────────────────────────────────────
// Factory Layout (Main Container)
// ─────────────────────────────────────────────────────────────

export interface FactoryLayout {
  id: string;
  name: string;
  description?: string;

  // Grid configuration
  grid: {
    width: number;
    height: number;
    cellSize: number; // Real-world units per cell
  };

  // Content
  nodes: Map<string, LayoutNode>;
  connections: Connection[];

  // Production configuration
  productionTargets: ProductionTarget[];

  // Constraints
  constraints: LayoutConstraints;

  // Computed data
  stats: LayoutStats;
  validation: ValidationResult;

  // Versioning
  version: number;
  createdAt: Date;
  updatedAt: Date;

  // Migration support
  parentLayoutId?: string; // If derived from another layout
  migrationPath?: string; // Reference to MigrationPlan
}
