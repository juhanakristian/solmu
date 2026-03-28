#!/bin/bash
set -euo pipefail

# Quick syntax check
npx tsc --noEmit --skipLibCheck src/routing.ts src/viewport.ts src/types.ts 2>&1 | head -5 || {
  echo "TypeScript compilation failed"
  exit 1
}

# Run benchmark (tsx for direct TS execution)
npx tsx bench/bench.ts
