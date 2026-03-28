#!/bin/bash
set -euo pipefail

# Type check the main source files
npx tsc --noEmit --skipLibCheck 2>&1 | tail -20
echo "Type check passed"
