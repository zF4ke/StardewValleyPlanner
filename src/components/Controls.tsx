import { FERTILIZERS } from '../data/fertilizers';
import { PROCESSING_MODE_LABEL } from '../data/processing';
import {
  FarmingLevel,
  FertilizerId,
  ProcessingMode,
  Quality,
  Season,
  SEASONS,
} from '../domain/types';
import { Icon } from './Icon';

interface Props {
  season: Season;
  day: number;
  money: number;
  quality: Quality;
  farmingLevel: FarmingLevel;
  fertilizerId: FertilizerId;
  fertilizerAmount: number | undefined;
  processingMode: ProcessingMode;
  kegCount: number | undefined;
  caskCount: number | undefined;
  hasTiller: boolean;
  hasArtisan: boolean;
  onChange: (patch: Partial<{
    season: Season; day: number; money: number; quality: Quality;
    farmingLevel: FarmingLevel; fertilizerId: FertilizerId;
    fertilizerAmount: number | undefined;
    processingMode: ProcessingMode;
    kegCount: number | undefined;
    caskCount: number | undefined;
    hasTiller: boolean;
    hasArtisan: boolean;
  }>) => void;
}

const MODES: ProcessingMode[] = ['raw', 'keg', 'silver-aged', 'gold-aged', 'iridium-aged'];

export function Controls({
  season, day, money, farmingLevel, fertilizerId, fertilizerAmount,
  processingMode, kegCount, caskCount, hasTiller, hasArtisan,
  onChange,
}: Props) {
  const fertChoices = FERTILIZERS.filter((f) => !f.planterHidden);
  const isProcessing = processingMode !== 'raw';
  const isAging = processingMode !== 'raw' && processingMode !== 'keg';

  return (
    <section className="panel">
      <div className="panel-head">
        <h2><Icon emoji="🌱" /> Plan your season</h2>
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
          <input type="number" min={1} max={28} value={day}
            onChange={(e) => onChange({ day: clamp(parseInt(e.target.value) || 1, 1, 28) })} />
        </div>
        <div className="field">
          <label>Gold available</label>
          <input type="number" min={0} step={50} value={money}
            onChange={(e) => onChange({ money: Math.max(0, parseInt(e.target.value) || 0) })} />
        </div>
        <div className="field">
          <label>Farming level (0–14)</label>
          <input type="number" min={0} max={14} value={farmingLevel}
            onChange={(e) => onChange({
              farmingLevel: clamp(parseInt(e.target.value) || 0, 0, 14) as FarmingLevel
            })} />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ minWidth: 240 }}>
          <label>Fertilizer</label>
          <select value={fertilizerId}
            onChange={(e) => onChange({ fertilizerId: e.target.value as FertilizerId })}>
            {fertChoices.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        {fertilizerId !== 'none' && (
          <div className="field" style={{ minWidth: 240 }}>
            <label>Fertilizer on hand (blank = unlimited)</label>
            <input type="number" min={0} step={1}
              value={fertilizerAmount ?? ''} placeholder="Unlimited"
              onChange={(e) => {
                const v = e.target.value.trim();
                onChange({ fertilizerAmount: v === '' ? undefined : Math.max(0, parseInt(v) || 0) });
              }} />
          </div>
        )}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ minWidth: 240 }}>
          <label>Artisan processing</label>
          <select value={processingMode}
            onChange={(e) => onChange({ processingMode: e.target.value as ProcessingMode })}>
            {MODES.map((m) => (
              <option key={m} value={m}>{PROCESSING_MODE_LABEL[m]}</option>
            ))}
          </select>
        </div>
        {isProcessing && (
          <div className="field" style={{ minWidth: 200 }}>
            <label>Kegs available (blank = ∞)</label>
            <input type="number" min={0} step={1}
              value={kegCount ?? ''} placeholder="Unlimited"
              onChange={(e) => {
                const v = e.target.value.trim();
                onChange({ kegCount: v === '' ? undefined : Math.max(0, parseInt(v) || 0) });
              }} />
          </div>
        )}
        {isAging && (
          <div className="field" style={{ minWidth: 200 }}>
            <label>Casks available (blank = ∞)</label>
            <input type="number" min={0} step={1}
              value={caskCount ?? ''} placeholder="Unlimited"
              onChange={(e) => {
                const v = e.target.value.trim();
                onChange({ caskCount: v === '' ? undefined : Math.max(0, parseInt(v) || 0) });
              }} />
          </div>
        )}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ minWidth: 0 }}>
          <label>Professions</label>
          <div className="chips">
            <button
              className="chip"
              data-active={hasTiller}
              onClick={() => onChange({ hasTiller: !hasTiller })}
              title="+10% on raw crop sales"
            >Tiller</button>
            <button
              className="chip"
              data-active={hasArtisan}
              onClick={() => onChange({ hasArtisan: !hasArtisan })}
              title="+40% on artisan goods (not Coffee)"
            >Artisan</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
