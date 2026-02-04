# Star Rupture Factory Layout Planner

## Specification Document

**Version:** 1.0
**Date:** February 2026
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Core Concepts](#3-core-concepts)
4. [Data Model](#4-data-model)
5. [Architecture](#5-architecture)
6. [Mathematical Optimization](#6-mathematical-optimization)
7. [Layout Planning Pipeline](#7-layout-planning-pipeline)
8. [Migration Planning](#8-migration-planning)
9. [Constraints & Validation](#9-constraints--validation)
10. [User Interface](#10-user-interface)
11. [Technical Stack](#11-technical-stack)
12. [Implementation Phases](#12-implementation-phases)
13. [Open Questions](#13-open-questions)

---

## 1. Executive Summary

The **Factory Layout Planner** is a web application for Star Rupture players to design, optimize, and evolve factory layouts. Unlike simple production calculators that answer "what buildings do I need?", this tool answers:

- **Where** do I place each building?
- **How** do I connect them with rails?
- **What** rail tiers and connectors do I need?
- **How** do I modify my existing factory for new production goals?

The application models factories as **spatial graphs** where buildings, rails, connectors, and storage are all nodes with physical positions and port-based connections.

---

## 2. Problem Statement

### Current Limitations

Existing Star Rupture planners (including the current starrupture-planner) provide:
- Bill of materials (building counts)
- Production chain visualization (logical flow)

They do **not** provide:
- Physical layout with positions
- Rail routing and tier selection
- Connector placement for splits/merges
- Capacity constraint validation
- Migration paths between layouts

### Target User Scenarios

1. **New Factory Design**
   > "I want to produce 15 Batteries/min. Show me a complete layout I can build."

2. **Constrained Design**
   > "I only have Rail v.1 and v.2 unlocked. Can I build this? What connectors do I need?"

3. **Factory Evolution (Migration)**
   > "My factory produces 1,000 Titanium Sheets/min. Now I also need 500 Tubes/min. What do I add/change?"

4. **Optimization**
   > "My layout works but has bottlenecks. How can I improve it?"

---

## 3. Core Concepts

### 3.1 The Factory as a Spatial Graph

A factory is modeled as a graph where:

- **Nodes** are physical entities (buildings, rails, connectors, storage)
- **Edges** are connections between ports
- **Every node has a position** on a discrete grid
- **Every connection has a physical path** through the grid

```
┌─────────────────────────────────────────────────────────────────┐
│  FACTORY GRID                                                   │
│                                                                 │
│    (0,0)────────────────────────────────────────────────(20,0) │
│      │                                                     │    │
│      │   ┌─────────┐         ┌───┐         ┌─────────┐    │    │
│      │   │Excavator│──[Rail]─┤ C ├─[Rail]──│ Smelter │    │    │
│      │   │  (2,3)  │         └─┬─┘         │  (12,3) │    │    │
│      │   └─────────┘           │           └─────────┘    │    │
│      │                      [Rail]                        │    │
│      │                         │                          │    │
│      │                    ┌─────────┐                     │    │
│      │                    │ Smelter │                     │    │
│      │                    │  (7,7)  │                     │    │
│      │                    └─────────┘                     │    │
│      │                                                     │    │
│    (0,15)──────────────────────────────────────────────(20,15) │
└─────────────────────────────────────────────────────────────────┘

Legend: [Rail] = Rail segment, C = Connector
```

### 3.2 Node Types

| Type | Description | Has Recipes | Has Ports | Has Capacity |
|------|-------------|-------------|-----------|--------------|
| **Building** | Production facility (Smelter, Fabricator, etc.) | Yes | Yes (inputSockets/outputSockets) | Recipe rate |
| **Rail** | Transport segment | No | Yes (in/out) | Tier-based |
| **Connector** | Splitter/Merger (4 ports) | No | Yes (up to 4) | Sum of connected rails |
| **Storage** | Buffer facility | No | Yes (in/out) | Item capacity |

### 3.3 Pull-Based Flow Model

Star Rupture uses a **pull-based** demand model:
- Consumers request items from upstream producers
- Producers only produce when there is demand
- Rails transport items based on downstream requests
- Storage acts as a buffer, decoupling production timing

```
[Consumer] ←─request─ [Rail] ←─request─ [Producer]
[Consumer] ──items──→ [Rail] ──items──→ [Producer]
           (flow follows demand)
```

### 3.4 Rail Tiers and Availability

Rails have tiers with different capacities:

| Tier | Name | Capacity (items/min) | Unlocked By |
|------|------|---------------------|-------------|
| 1 | Rail v.1 | 120 | Training Corporation L2 |
| 2 | Rail v.2 | 240 | Clever Robotics L6 |
| 3 | Rail v.3 | 480 | Clever Robotics L11 |
| 4 | Rail v.4 | 900 | Clever Robotics (TBD) |
| 5 | Rail v.5 | 1500 | Clever Robotics (TBD) |

Rail support structures (Multirail 3/5) allow connecting multiple rails at a single point but do not affect capacity.

**Constraint:** Users can only use rail tiers they have unlocked. If a flow exceeds the maximum available rail capacity, multiple parallel rails with connectors are required.

### 3.5 Rail Connectors

A **Rail Connector** has 4 ports and can:
- **Split**: 1 input → multiple outputs (distribute flow)
- **Merge**: multiple inputs → 1 output (combine flow)
- **Mix**: N inputs → M outputs (N + M ≤ 4)

```
Split (1→3):          Merge (3→1):          Mix (2→2):
    ──→[C]──→             ──→               ──→[C]──→
        │──→          ──→[C]──→             ──→    ──→
        └──→              ──→
```

---

## 4. Data Model

### 4.1 Spatial Primitives

```typescript
interface Position {
    x: number;
    y: number;
    z?: number;                    // For multi-level factories (future)
}

// Buildings use square footprints for simplicity
// size: 1 = 1x1 (rail infrastructure), size: 3 = 3x3 (production buildings)
type BuildingSize = number;

interface GridCell {
    x: number;
    y: number;
    occupied: boolean;
    occupiedBy?: string;           // Node ID
}

// Placement constraints for extractors
type PlacementConstraint = 'ore_deposit' | 'helium_deposit' | 'sulfur_deposit';
```

### 4.2 Ports

```typescript
interface Port {
    id: string;
    nodeId: string;                // Parent node
    localPosition: Position;       // Relative to node origin
    direction: Direction;
    portType: 'input' | 'output';

    // Constraints
    itemFilter?: string[];         // Allowed items (null = any)
    maxRate: number;               // items/min capacity

    // State
    connectedTo?: string;          // Connection ID
    currentFlow: number;           // Actual items/min
}

type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
```

### 4.3 Node Types

```typescript
// Base type for all nodes
interface BaseNode {
    id: string;
    type: NodeType;
    position: Position;
    rotation: 0 | 90 | 180 | 270;
    ports: Port[];

    // Metadata
    label?: string;
    locked?: boolean;              // Prevent modification
}

type NodeType = 'building' | 'rail' | 'connector' | 'storage';

// ─────────────────────────────────────────────────────────────
// Building Node
// ─────────────────────────────────────────────────────────────
interface BuildingNode extends BaseNode {
    type: 'building';

    // Reference to game data
    buildingTypeId: string;        // e.g., "smelter", "fabricator"
    recipeId: string;              // Active recipe

    // Physical properties (square footprint)
    size: number;                  // e.g., 3 = 3x3 grid cells
    placementConstraint?: PlacementConstraint;  // For extractors only

    // Production
    count: number;                 // How many of this building (can be fractional for planning)
    actualCount: number;           // Rounded up for actual placement

    // Power & Heat
    powerPerUnit: number;
    heatPerUnit: number;
}

// ─────────────────────────────────────────────────────────────
// Rail Node
// ─────────────────────────────────────────────────────────────
interface RailNode extends BaseNode {
    type: 'rail';

    // Rail properties
    tierId: string;                // e.g., "rail_v1", "multirail_3"
    capacity: number;              // items/min (from tier)

    // Physical path
    path: Position[];              // Sequence of grid cells
    length: number;                // Path length in cells

    // Flow state
    flows: ItemFlow[];
    totalFlow: number;
    utilization: number;           // totalFlow / capacity (0-1)
}

interface ItemFlow {
    itemId: string;
    rate: number;                  // items/min
}

// ─────────────────────────────────────────────────────────────
// Connector Node
// ─────────────────────────────────────────────────────────────
interface ConnectorNode extends BaseNode {
    type: 'connector';

    maxPorts: number;              // Usually 4
    mode: 'split' | 'merge' | 'mixed';

    // Distribution rules (for split mode)
    distribution?: 'equal' | 'priority' | 'round-robin';
    priorities?: Map<string, number>;  // portId → priority
}

// ─────────────────────────────────────────────────────────────
// Storage Node
// ─────────────────────────────────────────────────────────────
interface StorageNode extends BaseNode {
    type: 'storage';

    // Reference to game data
    buildingTypeId: string;        // e.g., "storage_depot_v1"

    // Physical properties
    size: BoundingBox;

    // Storage properties
    itemId: string;                // What item is stored
    capacity: number;              // Max items

    // Flow constraints
    maxInputRate: number;          // items/min
    maxOutputRate: number;         // items/min

    // Simulation state (optional)
    currentLevel?: number;
    fillRate?: number;             // items/min (positive = filling, negative = draining)
}
```

### 4.4 Connections

```typescript
interface Connection {
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
```

### 4.5 Factory Layout

```typescript
interface FactoryLayout {
    id: string;
    name: string;
    description?: string;

    // Grid configuration
    grid: {
        width: number;
        height: number;
        cellSize: number;          // Real-world units per cell
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
    parentLayoutId?: string;       // If derived from another layout
    migrationPath?: MigrationPlan;
}

type LayoutNode = BuildingNode | RailNode | ConnectorNode | StorageNode;

interface ProductionTarget {
    id: string;
    itemId: string;
    rate: number;                  // items/min
    priority: number;              // Higher = more important

    // Optional: specific output location
    outputNodeId?: string;
    outputPortId?: string;
}

interface LayoutConstraints {
    availableRailTiers: string[];
    availableBuildings: string[];
    maxPower?: number;
    maxHeat?: number;
    reservedAreas?: BoundingBox[]; // Areas where nodes cannot be placed
}

interface LayoutStats {
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

interface BillOfMaterialsEntry {
    type: 'building' | 'rail' | 'connector' | 'storage';
    id: string;
    name: string;
    count: number;
    power: number;
    heat: number;
}

interface Bottleneck {
    nodeId: string;
    nodeType: NodeType;
    issue: 'over_capacity' | 'near_capacity' | 'unconnected' | 'blocked';
    severity: 'info' | 'warning' | 'error';
    details: string;
    suggestion?: string;
}
```

### 4.6 Rail Tier Data

```typescript
interface RailTier {
    id: string;
    name: string;
    capacity: number;              // items/min

    // Unlock information
    unlockedBy: {
        corporation: string;
        level: number;
    };

    // Costs (if applicable)
    powerPerSegment?: number;
    heatPerSegment?: number;
    buildCost?: Record<string, number>;  // itemId → count
}
```

---

## 5. Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Layout     │  │  Production  │  │    Rail      │  │   Migration  │   │
│  │   Canvas     │  │   Targets    │  │   Config     │  │   Wizard     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             STATE MANAGEMENT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Layout     │  │    Game      │  │     UI       │  │   History    │   │
│  │   State      │  │    Data      │  │   State      │  │  (Undo/Redo) │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CORE ENGINES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Production  │  │  Placement   │  │   Routing    │  │  Migration   │   │
│  │   Solver     │  │   Engine     │  │   Engine     │  │   Planner    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │  Validator   │  │  Optimizer   │  │  Simulator   │                     │
│  └──────────────┘  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GAME DATA                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Items      │  │  Buildings   │  │   Recipes    │  │ Rail Tiers   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Core Engines

#### Production Solver
- Input: Production targets
- Output: Required buildings, recipes, material flows
- Algorithm: Multi-pass demand calculation (existing algorithm)

#### Placement Engine
- Input: Required buildings, grid constraints
- Output: Building positions
- Modes: Manual, Semi-automatic, Automatic
- Algorithm: Constraint satisfaction, force-directed layout

#### Routing Engine
- Input: Building positions, material flows, available rail tiers
- Output: Rail paths, connector placements
- Algorithm: A* pathfinding, flow network optimization

#### Migration Planner
- Input: Current layout, new production targets
- Output: Migration plan (changes required)
- Algorithm: Graph diff, incremental planning

#### Validator
- Input: Complete layout
- Output: Validation errors, warnings, suggestions
- Checks: Connectivity, capacity, power/heat limits

#### Optimizer
- Input: Valid layout
- Output: Optimized layout
- Goals: Minimize rails, minimize connectors, balance utilization

#### Simulator (Optional/Future)
- Input: Layout with storage nodes
- Output: Time-series simulation of buffer levels
- Purpose: Verify steady-state behavior, identify starvation/overflow

---

## 6. Mathematical Optimization

The factory planning problem can be decomposed into two distinct optimization problems:
1. **Production Flow Problem** — determining what buildings and flows are needed
2. **Layout Optimization Problem** — determining where to place buildings (Facility Layout Problem)

### 6.1 Production Flow Problem

**Goal:** Given production targets, determine the optimal number of buildings and material flows.

#### Sets & Indices

- `I` = set of items
- `B` = set of building types
- `R` = set of recipes
- `R_b ⊆ R` = recipes available for building type `b`

#### Parameters

- `t_i` = target production rate for item `i` (items/min), 0 if not a target
- `o_r,i` = output rate of item `i` from recipe `r` (items/min per building)
- `n_r,i` = input rate of item `i` required by recipe `r` (items/min per building)
- `p_b` = power consumption of building type `b`
- `h_b` = heat generation of building type `b`
- `P_max` = maximum power budget
- `H_max` = maximum heat budget

#### Decision Variables

- `x_r ≥ 0` = number of buildings running recipe `r` (continuous or integer)
- `f_i ≥ 0` = total flow rate of item `i` produced (items/min)

#### Objective Function

**Minimize total buildings** (or weighted cost):

```
min Σ x_r  (for all r ∈ R)
```

Or **minimize power consumption**:

```
min Σ p_b(r) · x_r  (for all r ∈ R)
```

where `b(r)` is the building type for recipe `r`.

#### Constraints

**1. Meet production targets:**
```
f_i ≥ t_i    ∀ i ∈ I
```

**2. Flow balance (conservation):** For each item, production ≥ consumption + target
```
Σ o_r,i · x_r  ≥  Σ n_r,i · x_r + t_i    ∀ i ∈ I
(r: i ∈ outputs(r))   (r: i ∈ inputs(r))
```

**3. Power budget:**
```
Σ p_b(r) · x_r ≤ P_max
```

**4. Heat budget:**
```
Σ h_b(r) · x_r ≤ H_max
```

**5. Non-negativity:**
```
x_r ≥ 0    ∀ r ∈ R
```

#### Problem Type

- **Linear Program (LP)** if `x_r` continuous (fractional buildings allowed)
- **Integer Linear Program (ILP)** if `x_r` must be integers

---

### 6.2 Layout Optimization Problem (Facility Layout Problem)

**Goal:** Given buildings and material flows, find optimal positions and rail routing.

This is a classic **Facility Layout Problem (FLP)**, extensively studied in operations research. The most common formulation is the **Quadratic Assignment Problem (QAP)**.

#### Classic QAP Formulation

```
min Σ Σ Σ Σ f_ij · d_kl · x_ik · x_jl
    i j k l
```

Where:
- `f_ij` = flow between facility `i` and facility `j` (items/min)
- `d_kl` = distance between location `k` and location `l`
- `x_ik ∈ {0,1}` = 1 if facility `i` is assigned to location `k`

**Constraints:**
```
Σ x_ik = 1    ∀ i    (each facility assigned exactly once)
k

Σ x_ik = 1    ∀ k    (each location used exactly once)
i
```

#### Mapping to Star Rupture

| FLP Concept | Star Rupture Equivalent |
|-------------|------------------------|
| Facilities | Buildings (Smelter, Fabricator, etc.) |
| Locations | Grid positions |
| Flow `f_ij` | Material flow rate between buildings (items/min) |
| Distance `d_kl` | Manhattan distance on grid (or actual rail path length) |
| Cost | Rail length × flow (or weighted by rail tier cost) |

#### Extended Sets & Parameters

- `N` = set of nodes (buildings to place)
- `E` = set of edges (required connections between nodes)
- `G = (C, A)` = grid graph where `C` = cells, `A` = adjacencies
- `T` = set of rail tiers
- `s_n` = size of node `n` (e.g., 3 for 3×3)
- `q_e` = required flow on edge `e` (items/min)
- `c_t` = capacity of rail tier `t` (items/min)
- `w_t` = cost/weight of rail tier `t`
- `W, H` = grid dimensions

#### Decision Variables

**Placement:**
- `pos_n = (x_n, y_n)` = position of node `n` (top-left corner)
- Or binary: `p_n,c ∈ {0,1}` = 1 if node `n` placed at cell `c`

**Routing:**
- `r_e,t,k ∈ {0,1}` = 1 if edge `e` uses tier `t` with `k` parallel rails
- `path_e,a ∈ {0,1}` = 1 if edge `e` routes through grid arc `a`

#### Objective Functions

**Option A: Minimize total rail length**
```
min Σ Σ path_e,a · length(a)
    e∈E a∈A
```

**Option B: Minimize weighted transport cost**
```
min Σ f_ij · d(pos_i, pos_j) · c(tier_ij)
    (i,j)∈E
```

Where:
- `f_ij` = flow rate between buildings `i` and `j`
- `d(pos_i, pos_j)` = distance (Manhattan or actual rail path length)
- `c(tier_ij)` = cost factor for the required rail tier

**Option C: Multi-objective (weighted sum)**
```
min α · (total length) + β · (connector count) + γ · (rail cost)
```

#### Constraints

**1. No overlap:** Each grid cell occupied by at most one building
```
Σ  Σ  𝟙[c' = c] ≤ 1    ∀ c ∈ C
n∈N c'∈cells(n,pos_n)
```

**2. Grid bounds:**
```
0 ≤ x_n ≤ W - s_n    ∀ n ∈ N
0 ≤ y_n ≤ H - s_n    ∀ n ∈ N
```

**3. Capacity satisfaction:** Rail tier must handle the flow
```
Σ k · c_t · r_e,t,k ≥ q_e    ∀ e ∈ E
k
```

**4. Rail tier availability:** Only unlocked tiers can be used
```
r_e,t,k = 0    ∀ t ∉ T_available, ∀ e, k
```

**5. Path connectivity:** Path must connect source to destination (flow conservation on grid)
```
Σ path_e,a = 1                              ∀ e ∈ E  (leave source)
a∈out(source_e)

Σ path_e,a = 1                              ∀ e ∈ E  (enter destination)
a∈in(dest_e)

Σ path_e,a = Σ path_e,a                     ∀ e ∈ E, ∀ c ∈ C \ {source_e, dest_e}
a∈in(c)       a∈out(c)                      (flow conservation at intermediate nodes)
```

**6. No path through buildings:**
```
path_e,a = 0    ∀ a passing through occupied cells
```

#### Problem Type

- **Mixed Integer Program (MIP)** — binary placement + routing decisions
- **NP-hard** in general (combines bin packing + vehicle routing aspects)
- Often solved with **heuristics** for practical instances

---

### 6.3 FLP Solution Algorithms

#### Exact Methods (small instances)
- **Branch and Bound** — for QAP
- **Mixed Integer Programming** — linearized QAP

#### Heuristics (practical for larger instances)

| Algorithm | Type | Description | Use Case |
|-----------|------|-------------|----------|
| **CORELAP** | Construction | Places buildings by relationship score (flow affinity) | Initial layout |
| **CRAFT** | Improvement | Iteratively swaps pairs of buildings | Refinement |
| **ALDEP** | Construction | Automated Layout Design Program | Initial layout |
| **Simulated Annealing** | Metaheuristic | Probabilistic search, escapes local optima | Large instances |
| **Genetic Algorithms** | Metaheuristic | Evolutionary approach | Complex constraints |

#### Recommended Approach

**Phase 1: Construction (CORELAP-style)**
```
1. Compute Total Closeness Rating (TCR) for each building:
   TCR(i) = Σ flow(i,j) for all j

2. Place building with highest TCR at center

3. Repeat until all buildings placed:
   a. Select unplaced building with highest flow to placed buildings
   b. Find best position adjacent to its highest-flow neighbor
   c. Place respecting size constraints, no overlap
```

**Phase 2: Refinement (CRAFT-style)**
```
1. Repeat until no improvement:
   a. For each pair of buildings (i, j):
      - Compute cost delta if swapped
      - If delta < 0, perform swap

   b. For each building i:
      - Try moving to adjacent empty positions
      - Keep move if reduces total cost

2. Compute final cost
```

**Phase 3: Routing**
```
1. For each connection (i, j):
   a. Run A* pathfinding from i to j
   b. Select rail tier based on flow requirements
   c. If flow > max tier capacity, add parallel rails + connectors
```

---

### 6.4 Summary

| Aspect | Production Flow | Layout Optimization |
|--------|-----------------|---------------------|
| **Problem Type** | LP / ILP | MIP (NP-hard) |
| **Objective** | Min buildings, power, or cost | Min rail length, connectors, cost |
| **Key Constraints** | Flow balance, budgets | No overlap, capacity, connectivity |
| **Typical Size** | Small (~100 recipes) | Large (grid cells × nodes × edges) |
| **Solution Method** | Exact (simplex, branch-and-bound) | Heuristics (CORELAP, CRAFT, A*) |

### 6.5 References

Key literature on Facility Layout Problems:

1. **Koopmans & Beckmann (1957)** — Original QAP formulation
2. **Armour & Buffa (1963)** — CRAFT algorithm
3. **Tompkins et al. (2010)** — "Facilities Planning" textbook
4. **Drira et al. (2007)** — "Facility layout problems: A survey"
5. **Singh & Sharma (2006)** — FLP with unequal areas

---

## 7. Layout Planning Pipeline

### 6.1 Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYOUT PLANNING PIPELINE                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   INPUT     │
                              │  - Targets  │
                              │  - Rails    │
                              │  - Grid     │
                              └──────┬──────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ PHASE 1         │        │ PHASE 2         │        │ PHASE 3         │
│ Production      │───────▶│ Placement       │───────▶│ Routing         │
│ Calculation     │        │                 │        │                 │
├─────────────────┤        ├─────────────────┤        ├─────────────────┤
│ • Demand calc   │        │ • Position      │        │ • Path finding  │
│ • Building req  │        │   buildings     │        │ • Rail tier     │
│ • Flow rates    │        │ • Check fit     │        │   selection     │
│                 │        │ • No overlap    │        │ • Connectors    │
└─────────────────┘        └─────────────────┘        └─────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ PHASE 4         │        │ PHASE 5         │        │ PHASE 6         │
│ Validation      │───────▶│ Optimization    │───────▶│ Output          │
│                 │        │ (optional)      │        │                 │
├─────────────────┤        ├─────────────────┤        ├─────────────────┤
│ • Connectivity  │        │ • Reduce rails  │        │ • Layout obj    │
│ • Capacity      │        │ • Balance load  │        │ • Statistics    │
│ • Constraints   │        │ • Suggestions   │        │ • BOM           │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

### 6.2 Phase 1: Production Calculation

**Input:**
- Production targets: `[{itemId: "battery", rate: 15}, ...]`
- Game data: items, buildings, recipes

**Algorithm:**
```
1. For each target item:
   a. Find recipe that produces it
   b. Calculate buildings needed: count = targetRate / recipeOutputRate
   c. For each recipe input:
      - Calculate required input rate
      - Recursively process input item
   d. Aggregate demands for shared items

2. Output:
   - List of BuildingRequirement: {buildingType, recipeId, count, inputs[], outputs[]}
   - Material flows: {fromBuilding, toBuilding, itemId, rate}
```

**Handles:**
- Multiple consumers of same item (shared production)
- Complex dependency chains
- Raw material sources (Ore Excavators, etc.)

### 6.3 Phase 2: Placement

**Input:**
- Building requirements from Phase 1
- Grid configuration
- Placement constraints (reserved areas, existing buildings)

**Modes:**

**A) Manual Placement**
- User drags buildings onto grid
- System validates (no overlap, within bounds)
- System shows suggested positions

**B) Semi-Automatic Placement**
- System suggests positions
- User can adjust
- Re-routes on adjustment

**C) Automatic Placement**
- Algorithm places all buildings
- Goals: minimize total connection length, group related buildings

**Algorithm (Automatic):**
```
1. Build adjacency graph from material flows
2. Use force-directed layout:
   - Attraction between connected buildings (proportional to flow)
   - Repulsion between all buildings (prevent overlap)
3. Snap to grid
4. Resolve overlaps with local search
5. Respect constraints (reserved areas, boundaries)
```

### 6.4 Phase 3: Routing

**Input:**
- Placed buildings with port positions
- Material flows
- Available rail tiers

**Algorithm:**
```
For each material flow (source → destination):
    1. Identify source port (building output)
    2. Identify destination port (building input)
    3. Calculate required throughput

    4. Select rail configuration:
       a. Find smallest available tier with capacity >= throughput
       b. If no single tier fits:
          - Calculate parallel rails needed
          - Insert connector at source (split)
          - Insert connector at destination (merge)

    5. Find path through grid (A* pathfinding):
       - Avoid occupied cells
       - Prefer straight lines
       - Minimize turns

    6. Create RailNode(s) along path

    7. Create Connections (port → rail, rail → port)
```

**Handling parallel rails:**
```
Required: 400 items/min
Available: Rail v.1 (120), Rail v.2 (300)

Option A: 2x Rail v.2 (600 capacity) - simpler
Option B: 1x Rail v.2 + 1x Rail v.1 (420 capacity) - cheaper?

Selection criteria: minimize cost, minimize connectors, user preference
```

### 6.5 Phase 4: Validation

**Checks:**

| Check | Severity | Description |
|-------|----------|-------------|
| Unconnected port | Error | Input port has no connection |
| Over capacity | Error | Flow exceeds rail capacity |
| Near capacity | Warning | Rail > 80% utilized |
| Disconnected building | Error | Building not in any flow path |
| Power exceeded | Warning | Total power > constraint |
| Heat exceeded | Warning | Total heat > constraint |
| Unreachable area | Info | Part of grid not accessible |

**Output:**
```typescript
interface ValidationResult {
    isValid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    info: ValidationIssue[];
}

interface ValidationIssue {
    code: string;
    message: string;
    nodeId?: string;
    connectionId?: string;
    suggestion?: string;
}
```

### 6.6 Phase 5: Optimization (Optional)

**Goals:**
- Minimize total rail length
- Minimize connector count
- Balance rail utilization
- Reduce bottlenecks

**Techniques:**
- Local search: try moving buildings, check if layout improves
- Rail consolidation: merge parallel rails if capacity allows
- Tier upgrade suggestions: "upgrade this Rail v.1 to v.2 to eliminate connector"

### 6.7 Phase 6: Output

**Produces:**
- Complete `FactoryLayout` object
- `LayoutStats` with aggregated metrics
- `BillOfMaterials` for player to build

---

## 8. Migration Planning

### 7.1 Overview

Migration planning answers: *"I have layout A producing X. Now I need to also produce Y. What changes do I make?"*

This is a **diff-based planning** problem:
1. Analyze current layout (what we have)
2. Calculate requirements for new targets (what we need)
3. Compute delta (what to add/change/remove)
4. Generate migration plan (ordered steps)

### 7.2 Migration Data Model

```typescript
interface MigrationPlan {
    id: string;

    // Source and target
    sourceLayoutId: string;
    sourceTargets: ProductionTarget[];
    targetTargets: ProductionTarget[];      // New desired targets

    // Changes
    changes: MigrationChange[];

    // Summary
    summary: MigrationSummary;

    // Resulting layout (preview)
    resultingLayout: FactoryLayout;
}

type MigrationChange =
    | AddNodeChange
    | RemoveNodeChange
    | ModifyNodeChange
    | AddConnectionChange
    | RemoveConnectionChange
    | ModifyConnectionChange
    | UpgradeRailChange;

interface AddNodeChange {
    type: 'add_node';
    node: LayoutNode;
    reason: string;                         // "Required for Tube production"
    dependsOn: string[];                    // IDs of changes this depends on
}

interface RemoveNodeChange {
    type: 'remove_node';
    nodeId: string;
    reason: string;                         // "No longer needed"
    blockedBy: string[];                    // Must remove these connections first
}

interface ModifyNodeChange {
    type: 'modify_node';
    nodeId: string;
    changes: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];
    reason: string;
}

interface UpgradeRailChange {
    type: 'upgrade_rail';
    nodeId: string;
    oldTier: string;
    newTier: string;
    reason: string;                         // "Capacity insufficient for new flow"
}

interface MigrationSummary {
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
    powerDelta: number;                     // New total - old total
    heatDelta: number;

    // Complexity
    estimatedDifficulty: 'trivial' | 'easy' | 'moderate' | 'complex' | 'major';

    // Cost (items required)
    materialCost: Record<string, number>;
}
```

### 7.3 Migration Algorithm

```
MIGRATION PLANNING ALGORITHM

Input:
  - currentLayout: FactoryLayout
  - newTargets: ProductionTarget[]

Output:
  - migrationPlan: MigrationPlan

Algorithm:

1. ANALYZE CURRENT STATE
   - Extract current production targets
   - Build flow graph from current layout
   - Identify current building utilization

2. COMPUTE NEW REQUIREMENTS
   - Run production solver for newTargets
   - Get required buildings, flows, rates

3. IDENTIFY SHARED INFRASTRUCTURE
   For each required building:
     - Check if compatible building exists in current layout
     - Check if it has spare capacity
     - Mark as: REUSE, EXPAND, or NEW

4. COMPUTE BUILDING DELTA
   additions = required - existing (with spare capacity)
   removals = existing not needed by newTargets (if target removed)
   modifications = existing that need recipe/rate changes

5. COMPUTE FLOW DELTA
   For each flow in new requirements:
     - If path exists with sufficient capacity: REUSE
     - If path exists but insufficient capacity: UPGRADE
     - If no path exists: ADD

6. HANDLE REMOVED TARGETS
   For each target in current but not in newTargets:
     - Option A: Keep infrastructure (user might want later)
     - Option B: Remove unused nodes (minimize waste)
     - Ask user or use configuration

7. GENERATE MIGRATION STEPS
   Order changes by dependencies:
     1. Remove obsolete connections
     2. Remove obsolete nodes
     3. Add new nodes
     4. Modify existing nodes
     5. Upgrade rails
     6. Add new connections
     7. Validate final state

8. COMPUTE RESULTING LAYOUT
   Apply all changes to currentLayout (copy)
   Validate resulting layout
   If invalid, report issues

9. RETURN MIGRATION PLAN
```

### 7.4 Migration Scenarios

#### Scenario 1: Add New Production (Simple)

**Current:** Producing 1,000 Titanium Sheets/min
**New:** Also produce 500 Tubes/min

```
Analysis:
- Tubes require: Titanium Sheets, Calcium Powder
- Titanium Sheets already produced → can tap into existing flow
- Need: Furnace for Tubes, source for Calcium Powder

Migration Plan:
1. ADD: Ore Excavator for Calcium Ore
2. ADD: Smelter for Calcium Block
3. ADD: Fabricator for Calcium Powder
4. ADD: Furnace for Tubes
5. ADD: Rails connecting new buildings
6. MODIFY: Split existing Titanium Sheet rail to also feed Furnace
7. ADD: Connector at split point
```

#### Scenario 2: Scale Up Production

**Current:** Producing 60 Batteries/min
**New:** Produce 120 Batteries/min

```
Analysis:
- Need to double all production
- Some rails may exceed capacity
- May need rail tier upgrades

Migration Plan:
1. MODIFY: Double building counts throughout
2. UPGRADE: Rail v.1 → Rail v.2 where flow doubles
3. ADD: Additional buildings where fractional becomes >1
4. ADD: Connectors where parallel rails now needed
```

#### Scenario 3: Change Production Target

**Current:** Producing 1,000 Titanium Sheets/min
**New:** Produce 1,000 Titanium Bars/min instead (no sheets)

```
Analysis:
- Titanium Bars are intermediate for Sheets
- Can remove Sheet production, keep Bar production
- Significant simplification

Migration Plan:
1. REMOVE: Fabricator (Sheet production)
2. REMOVE: Rails from Smelter to Fabricator
3. MODIFY: Reduce Excavator/Smelter count (bars need less ore than sheets)
4. ADD: Output rail for Bars
```

### 7.5 Migration UI Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MIGRATION WIZARD                                    │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: Select Source Layout
┌─────────────────────────────────────────────────────────────────────────────┐
│  Your Layouts:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [●] Titanium Factory        1,000 Ti Sheets/min    Created 2/1/26   │   │
│  │ [ ] Battery Production      60 Batteries/min       Created 1/28/26  │   │
│  │ [ ] Starter Base            Mixed                  Created 1/20/26  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                        [Next →]             │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 2: Define New Targets
┌─────────────────────────────────────────────────────────────────────────────┐
│  Current Targets:                    New Targets:                           │
│  ┌────────────────────────┐         ┌────────────────────────────────────┐ │
│  │ • Ti Sheets: 1,000/min │         │ • Ti Sheets: 1,000/min  [Keep]     │ │
│  │                        │         │ • Tubes: 500/min        [+ Add]    │ │
│  └────────────────────────┘         │                         [+ Add]    │ │
│                                     └────────────────────────────────────┘ │
│                                                        [← Back] [Next →]   │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 3: Review Migration Plan
┌─────────────────────────────────────────────────────────────────────────────┐
│  Migration Summary:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  +4 Buildings    +12 Rails    +2 Connectors    +180 Power           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Changes:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. [ADD] Ore Excavator (Calcium)        "Required for Calcium"      │   │
│  │ 2. [ADD] Smelter (Calcium Block)        "Required for Calcium"      │   │
│  │ 3. [ADD] Fabricator (Calcium Powder)    "Required for Tubes"        │   │
│  │ 4. [ADD] Furnace (Tubes)                "Produces Tubes"            │   │
│  │ 5. [ADD] Connector                      "Split Ti Sheet flow"       │   │
│  │ 6. [ADD] Rails (x12)                    "Connect new buildings"     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Preview Layout]                          [← Back] [Apply Migration]      │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 4: Preview & Confirm
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   [Layout Canvas showing current + changes highlighted]             │   │
│  │                                                                     │   │
│  │   Current buildings: solid                                          │   │
│  │   New buildings: dashed green outline                               │   │
│  │   New rails: green                                                  │   │
│  │   Modified connections: yellow                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Export Plan]  [Start Fresh Instead]       [← Back] [Confirm & Apply]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Constraints & Validation

### 8.1 Hard Constraints (Must Satisfy)

| Constraint | Description |
|------------|-------------|
| **No Overlap** | Buildings cannot occupy same grid cells |
| **Grid Bounds** | All nodes must be within grid boundaries |
| **Port Compatibility** | Connected ports must have compatible items |
| **Flow Direction** | Output ports connect to input ports only |
| **Rail Capacity** | Total flow ≤ rail capacity |
| **Connector Ports** | Connector connections ≤ max ports (4) |
| **Rail Availability** | Only unlocked rail tiers can be used |

### 8.2 Soft Constraints (Should Satisfy)

| Constraint | Description |
|------------|-------------|
| **Power Budget** | Total power ≤ user-defined limit |
| **Heat Budget** | Total heat ≤ user-defined limit |
| **Rail Utilization** | Prefer < 80% utilization |
| **Path Efficiency** | Prefer shorter rail paths |
| **Grouping** | Prefer related buildings near each other |

### 8.3 Validation Engine

```typescript
interface ValidationEngine {
    validate(layout: FactoryLayout): ValidationResult;
    validateNode(node: LayoutNode, layout: FactoryLayout): ValidationIssue[];
    validateConnection(conn: Connection, layout: FactoryLayout): ValidationIssue[];
    validatePlacement(node: LayoutNode, position: Position, layout: FactoryLayout): boolean;
}

// Validation is run:
// - On every node add/move
// - On every connection add/modify
// - Before saving layout
// - Before migration apply
```

---

## 10. User Interface

### 9.1 Main Views

#### Layout Canvas
- Grid-based 2D view
- Pan and zoom
- Building placement (drag & drop)
- Rail visualization with flow direction
- Selection and multi-select
- Context menus for nodes

#### Production Panel
- List of production targets
- Add/remove targets
- Priority ordering
- Rate adjustment

#### Rail Configuration Panel
- Available rail tiers (checkboxes)
- Corporation level selector (auto-fills available rails)
- Default tier selection

#### Statistics Panel
- Building counts
- Power/heat totals
- Rail utilization chart
- Bottleneck warnings

#### Migration Wizard
- Source layout selection
- New target definition
- Change preview
- Step-by-step plan

### 9.2 Interactions

| Action | Interaction |
|--------|-------------|
| Add building | Drag from palette to grid |
| Move building | Drag existing building |
| Rotate building | R key or context menu |
| Delete building | Delete key or context menu |
| Connect ports | Drag from output to input port |
| Select rail tier | Click rail, choose from dropdown |
| Auto-route | Select two buildings, click "Auto-connect" |
| Full auto-layout | Click "Generate Layout" with targets set |

### 9.3 Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] Factory Layout Planner              [Save] [Load] [Export] [Help]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌─────────────────────────────────────────┐ ┌────────────┐│
│ │  BUILDINGS   │ │                                         │ │ PRODUCTION ││
│ │              │ │                                         │ │            ││
│ │ [Excavator]  │ │                                         │ │ + Battery  ││
│ │ [Smelter]    │ │           LAYOUT CANVAS                 │ │   15/min   ││
│ │ [Furnace]    │ │                                         │ │            ││
│ │ [Fabricator] │ │                                         │ │ [+ Add]    ││
│ │ [Compounder] │ │                                         │ │            ││
│ │              │ │                                         │ ├────────────┤│
│ ├──────────────┤ │                                         │ │ RAILS      ││
│ │  TRANSPORT   │ │                                         │ │            ││
│ │              │ │                                         │ │ [✓] v.1    ││
│ │ [Connector]  │ │                                         │ │ [✓] v.2    ││
│ │ [Storage]    │ │                                         │ │ [ ] v.3    ││
│ │              │ │                                         │ │            ││
│ └──────────────┘ │                                         │ ├────────────┤│
│                  │                                         │ │ STATS      ││
│                  │                                         │ │            ││
│                  │                                         │ │ Bldgs: 24  ││
│                  │                                         │ │ Power: 450 ││
│                  │                                         │ │ Heat: 380  ││
│                  │                                         │ │            ││
│                  │                                         │ │ ⚠ 2 issues ││
│                  └─────────────────────────────────────────┘ └────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ [Generate Layout]  [Validate]  [Optimize]  │  [Migrate from existing...]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Technical Stack

### 10.1 Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | React 19 | Modern, good ecosystem |
| **Language** | TypeScript | Type safety essential for complex model |
| **Build** | Vite | Fast, modern |
| **State** | Zustand or Jotai | Simpler than Redux, good for complex state |
| **Canvas** | React Flow or Pixi.js | React Flow for graph-like, Pixi for game-like |
| **Layout Algorithm** | Dagre or custom | Dagre for auto-layout, custom for grid-based |
| **Pathfinding** | pathfinding.js | A* implementation |
| **Styling** | Tailwind CSS | Utility-first, good for custom UI |
| **Testing** | Vitest | Fast, Vite-native |
| **Persistence** | localStorage + IndexedDB | Client-side, no backend needed |
| **Export** | JSON, PNG, SVG | For sharing layouts |

### 10.2 Project Structure

```
src/
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers.tsx
│
├── core/                           # Core engines (no React)
│   ├── types/
│   │   ├── layout.ts               # FactoryLayout, LayoutNode, etc.
│   │   ├── game.ts                 # Item, Building, Recipe, RailTier
│   │   └── migration.ts            # MigrationPlan, MigrationChange
│   │
│   ├── production/
│   │   ├── solver.ts               # Production calculation
│   │   └── demandGraph.ts          # Demand propagation
│   │
│   ├── placement/
│   │   ├── engine.ts               # Placement algorithms
│   │   ├── grid.ts                 # Grid utilities
│   │   └── collision.ts            # Overlap detection
│   │
│   ├── routing/
│   │   ├── engine.ts               # Rail routing
│   │   ├── pathfinding.ts          # A* implementation
│   │   └── railAssignment.ts       # Tier selection
│   │
│   ├── migration/
│   │   ├── planner.ts              # Migration planning
│   │   ├── diff.ts                 # Layout diffing
│   │   └── steps.ts                # Step generation
│   │
│   ├── validation/
│   │   ├── engine.ts               # Validation runner
│   │   └── rules.ts                # Individual validation rules
│   │
│   └── optimization/
│       ├── engine.ts               # Optimization runner
│       └── strategies.ts           # Optimization strategies
│
├── state/
│   ├── layoutStore.ts              # Layout state (Zustand)
│   ├── gameDataStore.ts            # Game data state
│   ├── uiStore.ts                  # UI state
│   └── historyStore.ts             # Undo/redo
│
├── components/
│   ├── canvas/
│   │   ├── LayoutCanvas.tsx        # Main canvas component
│   │   ├── nodes/
│   │   │   ├── BuildingNode.tsx
│   │   │   ├── RailNode.tsx
│   │   │   ├── ConnectorNode.tsx
│   │   │   └── StorageNode.tsx
│   │   ├── Grid.tsx
│   │   └── Minimap.tsx
│   │
│   ├── panels/
│   │   ├── BuildingPalette.tsx
│   │   ├── ProductionTargets.tsx
│   │   ├── RailConfig.tsx
│   │   ├── StatsPanel.tsx
│   │   └── ValidationPanel.tsx
│   │
│   ├── migration/
│   │   ├── MigrationWizard.tsx
│   │   ├── SourceSelector.tsx
│   │   ├── TargetEditor.tsx
│   │   ├── ChangesPreview.tsx
│   │   └── MigrationPreview.tsx
│   │
│   └── shared/
│       ├── ItemIcon.tsx
│       ├── BuildingCard.tsx
│       └── FlowIndicator.tsx
│
├── data/
│   ├── items_catalog.json       # Item definitions with tiers
│   ├── buildings.json           # Building definitions (references recipe IDs)
│   ├── recipes.json             # Standalone recipes with input/output amounts
│   ├── rail_tiers.json          # Rail capacities and transport infrastructure
│   └── corporations_components.json  # Corporation progression
│
├── hooks/
│   ├── useLayout.ts
│   ├── useValidation.ts
│   ├── useMigration.ts
│   └── useAutoLayout.ts
│
├── utils/
│   ├── geometry.ts
│   ├── graph.ts
│   └── export.ts
│
└── tests/
    ├── core/
    │   ├── production.test.ts
    │   ├── routing.test.ts
    │   └── migration.test.ts
    └── integration/
        └── fullPipeline.test.ts
```

---

## 12. Implementation Phases

### Phase 1: Foundation (2-3 weeks)
**Goal:** Basic layout canvas with manual building placement

- [ ] Set up project structure
- [ ] Implement core types (LayoutNode, Connection, etc.)
- [ ] Create grid-based canvas component
- [ ] Implement building placement (drag & drop)
- [ ] Basic validation (no overlap, within bounds)
- [ ] Load game data (items, buildings, recipes)
- [ ] Save/load layouts to localStorage

**Deliverable:** Can manually place buildings on grid and save layout

### Phase 2: Production Solver (1-2 weeks)
**Goal:** Calculate building requirements from production targets

- [ ] Port/adapt production calculation from existing planner
- [ ] Support multiple production targets
- [ ] Handle shared resources (multiple consumers)
- [ ] Display required buildings list
- [ ] Auto-place buildings (simple algorithm)

**Deliverable:** Can set targets and see required buildings

### Phase 3: Rail Routing (2-3 weeks)
**Goal:** Connect buildings with rails

- [ ] Implement port system on buildings
- [ ] Create RailNode and ConnectorNode types
- [ ] Implement pathfinding (A*)
- [ ] Rail tier selection with availability constraint
- [ ] Parallel rail handling with connectors
- [ ] Visualize rails with flow direction
- [ ] Rail utilization display

**Deliverable:** Can connect buildings with appropriate rails

### Phase 4: Validation & Stats (1 week)
**Goal:** Complete validation and statistics

- [ ] Full validation engine
- [ ] Capacity constraint checking
- [ ] Power/heat calculation
- [ ] Bottleneck detection
- [ ] Statistics panel
- [ ] Bill of materials generation

**Deliverable:** Full validation with actionable feedback

### Phase 5: Migration Planning (2-3 weeks)
**Goal:** Plan migrations between layouts

- [ ] Layout diffing algorithm
- [ ] Migration change detection
- [ ] Step generation with dependencies
- [ ] Migration wizard UI
- [ ] Preview with highlighted changes
- [ ] Apply migration

**Deliverable:** Can migrate existing layout to new targets

### Phase 6: Optimization & Polish (2 weeks)
**Goal:** Improve layouts and user experience

- [ ] Layout optimization suggestions
- [ ] Rail consolidation
- [ ] Undo/redo
- [ ] Export (JSON, image)
- [ ] Keyboard shortcuts
- [ ] Touch support
- [ ] Performance optimization

**Deliverable:** Production-ready application

### Phase 7: Advanced Features (Future)
**Goal:** Nice-to-have features

- [ ] Storage buffer simulation
- [ ] 3D/isometric view
- [ ] Multiplayer layout sharing
- [ ] Import from game (if possible)
- [ ] Blueprint strings (like Factorio)

---

## 13. Open Questions

### Game Data (Resolved)
1. ~~**What are the exact rail tier capacities?**~~ **RESOLVED:** Rail v.1=120, v.2=240, v.3=480, v.4=900, v.5=1500 items/min
2. ~~**What are building sizes?**~~ **RESOLVED:** Buildings use square footprints. Production buildings are 3x3, rail infrastructure is 1x1. Some buildings may have variable sizes (player choice).
3. **Where are ports located on buildings?** (Fixed positions or flexible?) - Still unknown
4. **Are there any rail routing constraints?** (Orthogonal only? Max length?) - Still unknown
5. ~~**Do rails have power/heat cost per segment?**~~ **RESOLVED:** Rails have 0 power and 0 heat cost.
6. ~~**How to interpret socket data?**~~ **RESOLVED:** Buildings have separate `inputSockets` and `outputSockets` counts. For example: Smelter has 1 input, 1 output; Furnace has 3 inputs, 1 output; Mega Press has 4 inputs, 1 output.

### Game Data (New)
1. **Extractor placement:** Extractors require deposits (ore, helium, sulfur). Deposit locations are map constraints.
2. **Variable building sizes:** Some buildings (e.g., Orbitals) can be 2x2 or 3x3. Need to verify which production buildings support this.

### Design Decisions
1. **Should storage simulation be in MVP?** (Adds significant complexity)
2. **Auto-layout vs. manual-first?** (User preference)
3. **How to handle fractional buildings?** (Round up? Show fractional?)
4. **Migration: keep or remove unused infrastructure?** (User choice?)

### Technical
1. **Canvas library choice:** React Flow (graph-like) vs. Pixi.js (game-like)?
2. **State management:** Zustand vs. Jotai vs. custom?
3. **Should core engines be extracted to separate package?** (For reuse)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Layout** | Complete factory configuration with positions |
| **Node** | Any placeable entity (building, rail, connector, storage) |
| **Port** | Connection point on a node |
| **Connection** | Link between two ports |
| **Rail Tier** | Rail type with specific capacity |
| **Connector** | Splitter/merger with up to 4 ports |
| **Migration** | Process of evolving one layout into another |
| **Bottleneck** | Node or connection at/near capacity |
| **BOM** | Bill of Materials - list of items needed to build |

---

## Appendix B: References

- Star Rupture game (Early Access)
- Existing starrupture-planner codebase
- Factorio blueprint system (inspiration)
- Satisfactory planner tools (inspiration)
- [starrupture.tools](https://starrupture.tools/) - Community database for items, buildings, recipes

---

*Document maintained by: [Your Name]*
*Last updated: February 2026*
