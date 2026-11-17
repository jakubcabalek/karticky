#!/bin/sh
set -eu
cd "$SRCROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v mint >/dev/null 2>&1; then
  echo "error: Install Mint with brew install mint to run SwiftLint."
  exit 1
fi
mint run swiftlint lint --strict --config .swiftlint.yml
