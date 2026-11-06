# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: Vite + Preact + TypeScript, plain CSS, system fonts only. Installable PWA that works offline. Hosted as a static site on GitHub Pages under the owner's GitHub account (`fitlies`). Chosen for a small bundle, no server, and no third-party runtime.

## Users

The owner, plus friends and family they share the link with. They use it on their phones throughout the day, usually right before or after eating, often one-handed and in short bursts. Each person installs the app from the shared link and keeps their own diary on their own device.

## Product Purpose

Plateful is a personal food diary: log what you eat, drink, and do, and see how it compares with calorie and macro goals and a weight goal. It exists as a clean alternative to ad-funded diet trackers. There are no ads, no trackers, no accounts, and nothing to pay for. Success means logging takes seconds, the numbers can be trusted, and the owner keeps using it daily.

## Positioning

- **Everything stays on the device.** There is no account, server, or analytics. The bundled food database is searched offline.
- The only network call is an optional barcode lookup to Open Food Facts, made only when the user scans.
- Features other trackers charge for are free here: custom per-meal goals, net carbs, entry timestamps, data export, and a fasting timer.

## Operating Context

- **Typical flow:** open the app at a meal, find a food by search, barcode, recent, or quick add, pick a portion, and save. Then glance at the day's remaining budget.
- **Occasional tasks:** log a weigh-in, water, or exercise; review the week; adjust goals.
- **Data safety:** because data lives only in the browser, export and import of a backup file are essential.
- **Local defaults:** the owner is in Singapore. Units default to metric (kg, cm, ml, kcal) and can be switched to imperial (lb, ft/in, fl oz).

## Capabilities and Constraints

- **Food database:** USDA FoodData Central, which is public domain and bundled as `public/foods.json` (13,402 foods, about 0.5 MB gzipped). It covers Foundation Foods, FNDDS everyday dishes, and SR Legacy. Values are per 100 g, with real portion sizes.
- **Barcodes:** looked up through the Open Food Facts API, which requires attribution (ODbL). Scanning uses the camera through the browser.
- **Storage:** IndexedDB only. There is no sync between devices.
- **Third parties:** none at runtime other than Open Food Facts. No web fonts, CDNs, analytics, ads, or cookies. A strict Content Security Policy enforces this.
- **Out of scope for v1:** AI meal scan, voice logging, social features, and accounts. AI features would need a server to keep an API key secret.
- **Gaps:** US-centric food data, so local Singaporean dishes may be missing. Quick add and custom foods fill the gap.

## Brand Commitments

- **Name:** "Plateful".
- **Distinct identity:** it must not resemble MyFitnessPal's name, logo, colors, or layout.

## Evidence on Hand

- `myfitnesspal-how-it-works.md`: the owner's reverse-engineering notes on the incumbent app, used as a feature reference only.
- There are no users, testimonials, or metrics yet. Do not invent any.

## Product Principles

1. **Fast logging is the core.** Every screen is judged by taps-to-logged.
2. **Daily priorities:** fast logging, progress toward a weight goal, nutrition detail, and the logging habit all matter equally. Serve them through layering, not clutter.
3. **Private by construction, not by promise.** If a feature needs to send data off the device, it is optional, explicit, and minimal.
4. **Honest numbers.** Show where nutrition data comes from and never fake precision.
5. **Encouraging, never nagging.** Habit features celebrate consistency without guilt.

## Accessibility & Inclusion

No specific standard was given. Use WCAG 2.2 AA as the baseline: touch targets of at least 44 px, readable contrast in light and dark mode, and support for reduced motion. Eating and weight can be sensitive topics, so avoid moralizing copy about "good" or "bad" foods.
