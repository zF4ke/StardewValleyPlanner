import { Quality, Season, SEASONS } from '../domain/types';

interface Props {
  season: Season;
  day: number;
  money: number;
  quality: Quality;
  onChange: (patch: Partial<{ season: Season; day: number; money: number; quality: Quality }>) => void;
}

const QUALITIES: Quality[] = ['Regular', 'Silver', 'Gold', 'Iridium'];

export function Controls({ season, day, money, quality, onChange }: Props) {
  return (
    <section className="panel">
      <h2>🌱 Plan your season</h2>
      <div className="row">
        <div className="field">
          <label>Season</label>
          <div className="chips">
            {SEASONS.map((s) => (
              <button
                key={s}
                className="chip season-chip"
                data-season={s}
                data-active={s === season}
                onClick={() => onChange({ season: s })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Day (1–28)</label>
          <input
            type="number"
            min={1}
            max={28}
            value={day}
            onChange={(e) => onChange({ day: clamp(parseInt(e.target.value) || 1, 1, 28) })}
          />
        </div>

        <div className="field">
          <label>Gold available</label>
          <input
            type="number"
            min={0}
            step={50}
            value={money}
            onChange={(e) => onChange({ money: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>

        <div className="field">
          <label>Sale quality</label>
          <div className="chips quality-row">
            {QUALITIES.map((q) => (
              <button
                key={q}
                className="chip"
                data-quality={q}
                data-active={q === quality}
                onClick={() => onChange({ quality: q })}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
