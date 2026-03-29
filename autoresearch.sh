#!/bin/bash
set -euo pipefail

# Quick syntax check
npx tsc --noEmit 2>&1 | head -5 || {
  echo "TypeScript compilation failed"
  exit 1
}

# Run 200-table node-rendering benchmark
npx tsx bench/bench-200tables.ts
