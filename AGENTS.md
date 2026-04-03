# Solmu Project - Agent Guidelines

## Mission
- create a easy to use headless graph library for react
- ensure support for variety of targets like: flow chars, UML, database design, circuit design

## Task management
- use TASKS.md for task management
- evaluate developer experience on each change

## Build Commands
- `npm run build` - Clean and build both ESM and CJS
- `npm run build:esm` - Build ESM to dist/esm
- `npm run build:cjs` - Build CJS to dist/cjs
- `npm run clean` - Remove dist directory
- Demo: `cd demo && npm run dev` - Start dev server
- Demo: `cd demo && npm run build` - Build demo

## Code Style
- TypeScript with strict mode enabled
- React functional components with hooks
- Named exports preferred over default exports
- Double quotes for strings, semicolons required
- camelCase for variables/functions, PascalCase for types/components
- Interface naming without "I" prefix (e.g., `SolmuNode`, not `ISolmuNode`)
- Function parameter destructuring with type annotations
- Prefer `function` declarations for top-level functions, arrow functions for inline

## Types & Imports
- All types exported from `types.ts`
- React import required for JSX: `import React from "react"`
- Relative imports for local modules
- Type-only imports when possible: `import type { ... }`

## Error Handling
- Use optional chaining and nullish coalescing
- Early returns for validation
- Throw errors with descriptive messages for invalid configurations


