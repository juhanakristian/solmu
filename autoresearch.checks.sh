#!/bin/bash
set -euo pipefail

# Type check solmu
npx tsc --noEmit 2>&1 | tail -5

# Type check and build kanren
cd kanren && npx tsc --noEmit 2>&1 | tail -5
echo "All checks passed"
