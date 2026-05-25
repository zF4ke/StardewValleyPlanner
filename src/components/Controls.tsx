import { FERTILIZERS } from '../data/fertilizers';
import { FarmingLevel, FertilizerId, Quality, Season, SEASONS } from '../domain/types';

interface Props {
  season: Season;
  day: number;
  money: number;
  quality: Quality;
  farmingLevel: FarmingLevel;
  fertilizerId: FertilizerId;
  fertilizerAmount: number | undefined;
  onChange: (patch: Partial<{
    season: Season; day: number; money: number; quality: Quality;
    farmingLevel: FarmingLevel; fertilizerId: FertilizerId;
    fertilizerAmount: number | undefined;
  }>) => void;
}

export function Controls({
  season, day, money, farmingLevel, fertilizerId, fertilizerAmount, onChange
}: Props) {
  const fertChoices = FERTILIZERS.filter((f) => !f.planterHidden);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>🌱 Plan your season</h2>
      </div>

      <div className="field" style={{ minWidth: 0 }}>
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

      <div className="row" style={{ marginTop: 12 }}>
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
          <label>Farming level (0–14)</label>
          <input
            type="number"
            min={0}
            max={14}
            value={farmingLevel}
            onChange={(e) => onChange({
              farmingLevel: clamp(parseInt(e.target.value) || 0, 0, 14) as FarmingLevel
            })}
          />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ minWidth: 240 }}>
          <label>Fertilizer</label>
          <select
            value={fertilizerId}
            onChange={(e) => onChange({ fertilizerId: e.target.value as FertilizerId })}
          >
            {fertChoices.map((f) => (
              <option key={f.id} value={f.id}>{f.emoji} {f.name}</option>
            ))}
          </select>
        </div>

        {fertilizerId !== 'none' && (
          <div className="field" style={{ minWidth: 240 }}>
            <label>Fertilizer on hand (blank = unlimited)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={fertilizerAmount ?? ''}
              placeholder="Unlimited"
              onChange={(e) => {
                const v = e.target.value.trim();
                onChange({
                  fertilizerAmount: v === '' ? undefined : Math.max(0, parseInt(v) || 0)
                });
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
