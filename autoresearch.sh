#!/bin/bash
set -euo pipefail

# Quick syntax check using project tsconfig
npx tsc --noEmit 2>&1 | head -5 || {
  echo "TypeScript compilation failed"
  exit 1
}

# Run benchmark (tsx for direct TS execution)
npx tsx bench/bench.ts
