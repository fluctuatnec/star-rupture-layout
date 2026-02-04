# Star Rupture Factory Layout Planner

## Project Overview

A web application for Star Rupture players to design, optimize, and evolve factory layouts. Unlike simple production calculators, this tool answers:
- **Where** to place each building
- **How** to connect them with rails
- **What** rail tiers and connectors are needed
- **How** to modify existing factories for new production goals

## Tech Stack

- **Framework:** React 19
- **Language:** TypeScript 5.9
- **Build:** Vite 7
- **State Management:** Zustand
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build (type-check + bundle)
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run lint         # Run ESLint
```

## Project Structure

```
src/
├── app/                    # App-level components and routing
├── core/                   # Core engines (framework-agnostic)
│   ├── types/              # TypeScript type definitions
│   │   ├── layout.ts       # FactoryLayout, nodes, ports, connections
│   │   ├── game.ts         # Items, buildings, recipes, rail tiers
│   │   └── migration.ts    # Migration planning types
│   ├── production/         # Production solver engine
│   ├── placement/          # Building placement algorithms
│   ├── routing/            # Rail pathfinding and routing
│   ├── migration/          # Layout migration planner
│   ├── validation/         # Constraint validation
│   └── optimization/       # Layout optimization
├── state/                  # Zustand stores
├── components/             # React components
│   ├── canvas/             # Layout canvas and node renderers
│   ├── panels/             # Side panels (palette, stats, etc.)
│   ├── migration/          # Migration wizard components
│   └── shared/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── utils/                  # Utility functions
└── tests/                  # Test files

data/                       # Game data JSON files
├── items_catalog.json      # Item definitions
├── buildings.json          # Building definitions
├── recipes.json            # Recipe definitions
├── rail_tiers.json         # Rail and connector definitions
└── corporations_components.json  # Corporation progression
```
