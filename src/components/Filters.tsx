import { SeedSource } from '../domain/types';

interface SourceDef {
  id: SeedSource;
  label: string;
  tip: string;
  defaultOn: boolean;
  group: 'Normal shops' | 'Festival' | 'Desert' | 'Island' | 'Random / Special';
}

export const ALL_SOURCES: SourceDef[] = [
  { id: 'Pierre',         label: "Pierre's",        tip: 'General Store',           defaultOn: true,  group: 'Normal shops' },
  { id: 'JojaMart',       label: 'JojaMart',        tip: 'Same seeds as Pierre',    defaultOn: true,  group: 'Normal shops' },
  { id: 'EggFestival',    label: 'Egg Festival',    tip: 'Strawberry, Spring 13',   defaultOn: false, group: 'Festival' },
  { id: 'Oasis',          label: 'Oasis',           tip: 'Desert shop',             defaultOn: false, group: 'Desert' },
  { id: 'IslandTrader',   label: 'Island Trader',   tip: 'Ginger Island trade',     defaultOn: false, group: 'Island' },
  { id: 'TravelingCart',  label: 'Traveling Cart',  tip: 'Random Fri/Sun cart',     defaultOn: false, group: 'Random / Special' },
  { id: 'Crafted',        label: 'Crafted',         tip: 'Made from a recipe',      defaultOn: false, group: 'Random / Special' },
  { id: 'Drop',           label: 'Drop / Quest',    tip: 'Drops, foraging, quests', defaultOn: false, group: 'Random / Special' },
  { id: 'SeedMaker',      label: 'Seed Maker',      tip: 'Only via Seed Maker',     defaultOn: false, group: 'Random / Special' },
  { id: 'Special',        label: 'Special',         tip: 'Ancient Fruit etc.',      defaultOn: false, group: 'Random / Special' },
];

export const DEFAULT_ENABLED: SeedSource[] = ALL_SOURCES
  .filter((s) => s.defaultOn)
  .map((s) => s.id);

const GROUPS: SourceDef['group'][] = [
  'Normal shops', 'Festival', 'Desert', 'Island', 'Random / Special',
];

function summarize(enabled: SeedSource[]): string {
  if (enabled.length === 0) return 'No seed sources enabled.';
  const labels = ALL_SOURCES.filter((s) => enabled.includes(s.id)).map((s) => s.label);
  const onlyNormal =
    enabled.length === 2 &&
    enabled.includes('Pierre') &&
    enabled.includes('JojaMart');
  if (onlyNormal) return 'Showing normal shop seeds only.';
  return `Showing ${labels.join(', ')}.`;
}

interface Props {
  enabled: SeedSource[];
  onChange: (next: SeedSource[]) => void;
}

export function Filters({ enabled, onChange }: Props) {
  function toggle(id: SeedSource) {
    onChange(enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id]);
  }
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Seed sources</h2>
        <span className="summary">{summarize(enabled)}</span>
      </div>
      {GROUPS.map((g) => (
        <div className="filter-group" key={g}>
          <span className="group-label">{g}</span>
          <div className="chips">
            {ALL_SOURCES.filter((s) => s.group === g).map((s) => (
              <button
                key={s.id}
                className="chip"
                data-active={enabled.includes(s.id)}
                onClick={() => toggle(s.id)}
                title={s.tip}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
