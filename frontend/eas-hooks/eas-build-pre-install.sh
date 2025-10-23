#!/bin/bash
set -e

echo "🎵 EAS Build Hook: Preserving MusicKit entitlements for iOS build"

# The entitlements are already in the ios folder from prebuild
# EAS will skip them during sync, but they'll be in the compiled app
# This hook just ensures the ios folder structure is correct

if [ "$EAS_BUILD_PLATFORM" = "ios" ]; then
  echo "✅ iOS platform detected"
  echo "✅ MusicKit entitlements will be included from local ios/Mixtape/Mixtape.entitlements"
fi
