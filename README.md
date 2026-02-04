# Star Rupture Factory Layout Planner

A web application for Star Rupture players to design, optimize, and evolve factory layouts.

Unlike simple production calculators, this tool answers:
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

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Production build
npm run build
```

## Project Structure

```
src/
├── core/                   # Core engines (framework-agnostic)
│   ├── types/              # TypeScript type definitions
│   ├── production/         # Production solver engine
│   ├── placement/          # Building placement algorithms
│   ├── routing/            # Rail pathfinding and routing
│   ├── migration/          # Layout migration planner
│   ├── validation/         # Constraint validation
│   └── optimization/       # Layout optimization
├── state/                  # Zustand stores
├── components/             # React components
├── hooks/                  # Custom React hooks
└── utils/                  # Utility functions

data/                       # Game data JSON files
├── items_catalog.json      # Item definitions
├── buildings.json          # Building definitions
├── recipes.json            # Recipe definitions
├── rail_tiers.json         # Rail and connector definitions
└── corporations_components.json
```

## License

MIT
