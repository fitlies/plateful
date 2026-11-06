#!/bin/sh
# Downloads the USDA FoodData Central files that scripts/build-foods.mjs reads (public domain data).
set -e
cd "$(dirname "$0")/.."
mkdir -p .data-raw && cd .data-raw
for f in FoodData_Central_foundation_food_json_2026-10-29.zip FoodData_Central_sr_legacy_food_json_2018-04.zip FoodData_Central_survey_food_json_2024-10-31.zip; do
  curl -fsSL --proto '=https' -o "$f" "https://fdc.nal.usda.gov/fdc-datasets/$f"
  unzip -o -q "$f"
done
echo "Now run: npm run foods"
