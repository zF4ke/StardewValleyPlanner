import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATE,
  RECIPES,
  SprinklerState,
  buyGap,
  krobusGap,
  migrateState,
  parseImport,
  summarize,
} from '../data/sprinklerState';

function state(over: Partial<SprinklerState> = {}): SprinklerState {
  const base = structuredClone(DEFAULT_STATE);
  return {
    ...base,
    ...over,
    built: { ...base.built, ...(over.built ?? {}) },
    mats: { ...base.mats, ...(over.mats ?? {}) },
  };
}

describe('tile counts', () => {
  it('matches the wiki coverage per type', () => {
    expect(RECIPES.basic.tiles).toBe(4);
    expect(RECIPES.quality.tiles).toBe(8);
    expect(RECIPES.iridium.tiles).toBe(24);
  });
});

describe('basic Sprinkler', () => {
  it('needs 1 copper bar + 1 iron bar each, 5 ore + 1 coal per bar', () => {
    const s = summarize(state({ type: 'basic', goal: 10, built: { basic: 0, quality: 0, iridium: 0 } }));
    expect(s.remaining).toBe(10);
    expect(s.need.copperOre).toBe(50);
    expect(s.need.ironOre).toBe(50);
    expect(s.need.coal).toBe(20); // 10 copper bars + 10 iron bars
    expect(s.need.goldOre).toBe(0);
  });

  it('existing bars reduce ore + coal requirements', () => {
    const s = summarize(state({ type: 'basic', goal: 10, mats: { copperBars: 10 } as never }));
    expect(s.need.copperOre).toBe(0);
    expect(s.need.ironOre).toBe(50);
    expect(s.need.coal).toBe(10); // only iron bars still need coal
  });
});

describe('Quality Sprinkler', () => {
  it('needs iron bar + gold bar + refined quartz each', () => {
    const s = summarize(state({ type: 'quality', goal: 10 }));
    expect(s.need.ironOre).toBe(50);
    expect(s.need.goldOre).toBe(50);
    expect(s.need.quartz).toBe(10);
    expect(s.need.coal).toBe(30); // 20 for bars + 10 for refining quartz
  });

  it('subtracts built sprinklers from the goal', () => {
    const s = summarize(state({ type: 'quality', goal: 10, built: { basic: 0, quality: 4, iridium: 0 } }));
    expect(s.remaining).toBe(6);
    expect(s.need.ironOre).toBe(30);
  });

  it('fire quartz makes 3 refined quartz each and burns 1 coal per batch', () => {
    const s = summarize(state({ type: 'quality', goal: 10, mats: { fireQuartz: 4 } as never }));
    // 4 fire quartz -> up to 12 refined; covers all 10 needed, no plain quartz
    expect(s.need.quartz).toBe(0);
    // 20 coal for bars + ceil(10/3)=4 coal for fire-quartz batches = 24
    expect(s.need.coal).toBe(24);
  });
});

describe('Iridium Sprinkler', () => {
  it('needs gold bar + iridium bar + battery pack each', () => {
    const s = summarize(state({ type: 'iridium', goal: 10 }));
    expect(s.need.goldOre).toBe(50);
    expect(s.need.iridiumOre).toBe(50);
    expect(s.need.batteryPacks).toBe(10);
    expect(s.need.coal).toBe(20);
  });

  it('owned battery packs reduce the requirement', () => {
    const s = summarize(state({ type: 'iridium', goal: 10, mats: { batteryPacks: 4 } as never }));
    expect(s.need.batteryPacks).toBe(6);
  });
});

describe('Clint buy cost', () => {
  it('uses Year 1 prices', () => {
    const s = summarize(state({ type: 'quality', goal: 10 }));
    expect(buyGap(s.need, 'y1')).toBe(50 * 150 + 50 * 400 + 30 * 150);
  });

  it('uses Year 2+ prices', () => {
    const s = summarize(state({ type: 'quality', goal: 10 }));
    expect(buyGap(s.need, 'y2')).toBe(50 * 250 + 50 * 750 + 30 * 250);
  });

  it('includes copper ore for basic sprinklers', () => {
    const s = summarize(state({ type: 'basic', goal: 10 }));
    expect(buyGap(s.need, 'y1')).toBe(50 * 75 + 50 * 150 + 20 * 150);
  });

  it('excludes iridium ore and battery packs from Clint totals', () => {
    const s = summarize(state({ type: 'iridium', goal: 10 }));
    // only gold ore (50*400) + coal (20*150)
    expect(buyGap(s.need, 'y1')).toBe(50 * 400 + 20 * 150);
  });

  it('reduces the Clint cost with owned ore and coal even when bars are missing', () => {
    const s = summarize(state({
      type: 'quality',
      goal: 51,
      mats: {
        ironBars: 14,
        ironOre: 999,
        goldOre: 999,
        coal: 999,
        refinedQuartz: 8,
      } as never,
    }));
    expect(s.need.ironOre).toBe(0);
    expect(s.need.goldOre).toBe(0);
    expect(s.need.coal).toBe(0);
    expect(s.clintNeed.ironOre).toBe(0);
    expect(s.clintNeed.goldOre).toBe(0);
    expect(s.clintNeed.coal).toBe(0);
    expect(buyGap(s.clintNeed, 'y1')).toBe(0);
  });

  it('prices only the ore and coal shortfall for missing bars', () => {
    const s = summarize(state({
      type: 'quality',
      goal: 10,
      mats: {
        ironBars: 8,
        ironOre: 4,
        goldBars: 6,
        goldOre: 7,
        coal: 1,
      } as never,
    }));
    // 2 iron bars need 10 ore, have 4, so buy 6. 4 gold bars need 20 ore, have 7, so buy 13.
    // 6 total bars still need smelting coal, plus 10 refined quartz coal, have 1, so buy 15 coal.
    expect(s.clintNeed.ironOre).toBe(6);
    expect(s.clintNeed.goldOre).toBe(13);
    expect(s.clintNeed.coal).toBe(15);
    expect(buyGap(s.clintNeed, 'y1')).toBe((6 * 150) + (13 * 400) + (15 * 150));
  });
});

describe('Krobus comparison', () => {
  it('charges 10,000g per remaining iridium sprinkler', () => {
    const s = summarize(state({ type: 'iridium', goal: 7, built: { basic: 0, quality: 0, iridium: 2 } }));
    expect(s.remaining).toBe(5);
    expect(krobusGap(s.remaining)).toBe(50000);
  });
});

describe('migration + persistence', () => {
  it('migrates legacy Quality-only state without losing counts', () => {
    const migrated = migrateState({
      goal: 5,
      mats: { built: 3, ironBars: 2, goldBars: 1, refinedQuartz: 4, ironOre: 7 },
    });
    expect(migrated.type).toBe('quality');
    expect(migrated.goal).toBe(5);
    expect(migrated.built.quality).toBe(3);
    expect(migrated.mats.ironBars).toBe(2);
    expect(migrated.mats.goldBars).toBe(1);
    expect(migrated.mats.refinedQuartz).toBe(4);
    expect(migrated.mats.ironOre).toBe(7);
    // new fields default to zero
    expect(migrated.mats.copperBars).toBe(0);
    expect(migrated.mats.batteryPacks).toBe(0);
    expect(migrated.built.iridium).toBe(0);
  });

  it('persists the selected sprinkler type', () => {
    const migrated = migrateState({
      type: 'iridium',
      goal: 3,
      built: { basic: 0, quality: 0, iridium: 1 },
      mats: { iridiumBars: 1 },
    });
    expect(migrated.type).toBe('iridium');
    expect(migrated.built.iridium).toBe(1);
    expect(migrated.mats.iridiumBars).toBe(1);
  });

  it('falls back gracefully on garbage', () => {
    const migrated = migrateState(null);
    expect(migrated.type).toBe('quality');
    expect(migrated.mats.ironOre).toBe(0);
  });
});

describe('parseImport', () => {
  const SAMPLE = {
    inventory: {
      goal: 100, quartz: 60, fireQuartz: 18, ironOre: 248, goldOre: 645,
      coal: 114, refinedQuartz: 8, ironBars: 14, goldBars: 0, sprinklersBuilt: 0,
    },
    logs: [
      { label: 'Fall 1 - day 1', quartz: 5, ironOre: 21, coal: 4, sprinklersBuilt: 0 },
      { label: 'Fall 6', quartz: 5, fireQuartz: 3, ironOre: 5, goldOre: 135, coal: 0 },
    ],
  };

  it('maps the exported inventory into quality state', () => {
    const st = parseImport(SAMPLE);
    expect(st.type).toBe('quality');
    expect(st.goal).toBe(100);
    expect(st.mats.quartz).toBe(60);
    expect(st.mats.ironOre).toBe(248);
    expect(st.mats.goldOre).toBe(645);
    expect(st.mats.ironBars).toBe(14);
    expect(st.built.quality).toBe(0);
  });

  it('accepts a JSON string too', () => {
    const st = parseImport(JSON.stringify(SAMPLE));
    expect(st.mats.coal).toBe(114);
  });

  it('imports flat log rows, keeping labels and nonzero gains', () => {
    const st = parseImport(SAMPLE);
    expect(st.logs).toHaveLength(2);
    expect(st.logs[0].label).toBe('Fall 1 - day 1');
    expect(st.logs[0].gains.ironOre).toBe(21);
    expect(st.logs[0].gains.coal).toBe(4);
    // zero gains are dropped
    expect(st.logs[0].gains.goldOre).toBeUndefined();
    expect(st.logs[1].gains.goldOre).toBe(135);
    expect(st.logs[1].gains.fireQuartz).toBe(3);
  });

  it('round-trips our own log shape through migrateState', () => {
    const saved = migrateState({
      type: 'quality',
      goal: 50,
      built: { basic: 0, quality: 1, iridium: 0 },
      mats: {},
      logs: [{ id: 'x1', label: 'Day 1', gains: { ironOre: 10, built: 1 } }],
    });
    expect(saved.logs).toHaveLength(1);
    expect(saved.logs[0].id).toBe('x1');
    expect(saved.logs[0].gains.ironOre).toBe(10);
    expect(saved.logs[0].gains.built).toBe(1);
    expect(saved.logs[0].builtType).toBe('quality');
  });

  it('preserves the sprinkler type for built log rows', () => {
    const saved = migrateState({
      type: 'quality',
      goal: 50,
      built: { basic: 0, quality: 0, iridium: 2 },
      mats: {},
      logs: [{ id: 'x1', label: 'Friday', gains: { built: 2 }, builtType: 'iridium' }],
    });
    expect(saved.logs[0].builtType).toBe('iridium');
  });
});
