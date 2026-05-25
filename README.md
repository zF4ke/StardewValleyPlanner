<div align="center">

# 🌻 Stardew Workshop

*Pick a date. Set your gold. Plant the crops Grandpa would be proud of.*

<img src="docs/banner2.png" alt="Stardew Workshop" width="640" />

<br />
<br />

[![Built with Vite](https://img.shields.io/badge/built%20with-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

</div>

---

A tiny, in-browser planner for [Stardew Valley](https://www.stardewvalley.net/) farms.
Tell it what season it is, how much gold you have, and which seeds you can actually buy —
it tells you which crops will leave you the richest before the season ends.

## ✨ What's inside

The **crop planner** ranks crops by profit for the day, gold, and shops you've got — quality odds, fertilizer, Speed-Gro and regrowth all baked in.

The **fertilizer workshop** compares buying vs. crafting and picks the cheaper one.

Click any crop for a Stardew-style 28-day calendar.

## 🚀 Quickstart

```bash
pnpm install
pnpm dev      # opens http://localhost:5173
```

```bash
pnpm test     # vitest
pnpm build    # tsc -b && vite build
```

That is the whole setup. No env vars, no database, no auth.

## 🧠 How it thinks

Crops are ranked on a single metric: **net profit before the season ends**, given:

- The selected season + day (the planting day itself doesn't count as a growth day).
- The seeds you can afford with the gold you have.
- Whether the crop regrows, and how many regrowth cycles fit in the remaining valid days.
- Expected sale value, computed from the canonical Stardew quality formula:

  ```
  q1 = 0.2 * (farmingLevel / 10)
     + 0.2 * fertilizerLevel * ((farmingLevel + 2) / 12)
     + 0.01
  q2 = min(0.75, q1 * 2)
  ```

  Deluxe Fertilizer guarantees no Regular and unlocks Iridium rolls.
  Multi-produce crops (Blueberry, Cranberries…) only roll quality on **one** of the items per harvest — the rest are Regular, as in the game.

If you only have, say, 10 Quality Fertilizer but you're buying 50 Parsnip seeds,
the planner splits them: 10 fertilized seeds + 40 on bare soil, each batch priced at its own expected value.

## 🧪 Fertilizer Workshop

Pick a fertilizer and a quantity. The workshop compares:

- Every vendor that sells it (Pierre, Oasis, Island Trader…) with day/year restrictions.
- The crafted gold-value, using current ingredient prices (which you can override).

It highlights the cheapest path, lists the ingredient totals, and shows leftover overflow when a recipe outputs in batches. Non-gold trades (e.g. Cinder Shards) are listed separately, never compared on price.

## 🗂️ Project layout

```
src/
  data/         crops, fertilizers, patch notes
  domain/       planner math + types
  components/   Controls, CropCard, CropCalendarDrawer,
                FertilizerWorkshop, PatchNotes, Filters
  styles/       parchment + pixel theme
  test/         vitest specs
```

Everything is plain TypeScript + React. No state library, no routing library —
two `useState` calls power the whole page nav.

## 🌱 Data

All crop and fertilizer numbers come from the
[Stardew Valley Wiki](https://stardewvalleywiki.com/). The probability formula
is the one from the game source. If a value here is wrong, it's a one-line fix
in `src/data/crops.ts` or `src/data/fertilizers.ts` — PRs welcome.

## 🛠️ Contributing

1. Fork, branch, hack.
2. `pnpm test` should stay green.
3. Open a PR. Tiny is fine. "Fix Pumpkin sell price" is a perfect PR.

## 📜 Patch notes

In-app, under the **📜 Patch Notes** tab — or see [`src/data/patchNotes.ts`](src/data/patchNotes.ts).

## License

MIT. Plant whatever you want.
