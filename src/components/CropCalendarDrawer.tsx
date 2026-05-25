import { useEffect } from 'react';
import { calendarEvents } from '../domain/planner';
import { FERTILIZER_BY_ID } from '../data/fertilizers';
import { CropPlan, DAYS_PER_SEASON, Season } from '../domain/types';

interface Props {
  plan: CropPlan;
  season: Season;
  day: number;
  onClose: () => void;
}

const gold = (n: number) => `${Math.round(n).toLocaleString()}g`;

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type CellKind = 'plant' | 'water' | 'harvest' | 'regrowHarvest';
const KIND_LABEL: Record<CellKind, string> = {
  plant: '🌱',
  water: '💧',
  harvest: '⭐',
  regrowHarvest: '⭐',
};
const KIND_TITLE: Record<CellKind, string> = {
  plant: 'Plant',
  water: 'Water',
  harvest: 'First harvest',
  regrowHarvest: 'Later harvest',
};

export function CropCalendarDrawer({ plan, season, day, onClose }: Props) {
  const fert = FERTILIZER_BY_ID[plan.fertilizerId];
  const events = calendarEvents(plan.crop, season, day, fert.speedMod);
  // Reduce to one kind per day-of-season within the visible 28-day window.
  const byDay = new Map<number, CellKind>();
  const priority: CellKind[] = ['harvest', 'regrowHarvest', 'plant', 'water'];
  for (const e of events) {
    if (e.day < 1 || e.day > DAYS_PER_SEASON) continue;
    const existing = byDay.get(e.day);
    if (!existing || priority.indexOf(e.kind) < priority.indexOf(existing)) {
      byDay.set(e.day, e.kind);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const crop = plan.crop;
  const laterHarvests = Math.max(0, plan.harvestDays.length - 1);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`${crop.name} calendar`}>
        <header className="drawer-head">
          <div className="drawer-title">
            <span className="emoji" aria-hidden>{crop.emoji ?? '🌱'}</span>
            <div>
              <div className="crop-name">{crop.name}</div>
              <div className="source-line">{crop.seasons.join(' / ')}</div>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <section className="drawer-section">
          <h3>{season} calendar</h3>
          <div className="cal-grid">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="cal-head">{d}</div>
            ))}
            {Array.from({ length: DAYS_PER_SEASON }, (_, i) => i + 1).map((d) => {
              const kind = byDay.get(d);
              return (
                <div
                  key={d}
                  className={'cal-cell' + (kind ? ` k-${kind}` : '')}
                  title={kind ? `${KIND_TITLE[kind]} · ${season} ${d}` : `${season} ${d}`}
                >
                  <span className="cal-day">{d}</span>
                  {kind && <span className="cal-icon">{KIND_LABEL[kind]}</span>}
                </div>
              );
            })}
          </div>
          <div className="cal-legend">
            <span><span className="swatch k-plant" /> Plant</span>
            <span><span className="swatch k-water" /> Water</span>
            <span><span className="swatch k-harvest" /> First harvest</span>
            {crop.regrowthDays && <span><span className="swatch k-regrowHarvest" /> Later harvests</span>}
          </div>
        </section>

        <section className="drawer-section">
          <h3>Plan summary</h3>
          <div className="kv-grid">
            <div><span>Source</span><b>{crop.source}</b></div>
            <div><span>Growth</span><b>{crop.growthDays} days</b></div>
            {crop.regrowthDays && <div><span>After first harvest</span><b>every {crop.regrowthDays} days</b></div>}
            <div><span>Per harvest</span><b>{crop.producePerHarvest}</b></div>
            <div><span>Seeds bought</span><b>{plan.seedsBought}</b></div>
            <div><span>Seed spend</span><b>{gold(plan.seedSpend)}</b></div>
            <div>
              <span>Total harvests</span>
              <b>{plan.harvestDays.length}{crop.regrowthDays && laterHarvests > 0 ? ` (${laterHarvests} later)` : ''}</b>
            </div>
            <div><span>Revenue</span><b>{gold(plan.revenue)}</b></div>
            <div><span>Final gold</span><b>{gold(plan.finalMoney)}</b></div>
            <div><span>Net profit</span><b className={'profit' + (plan.netProfit < 0 ? ' neg' : '')}>{gold(plan.netProfit)}</b></div>
          </div>
          <div className="harvest-dates">
            <span className="kv-label">Harvest dates:</span> {plan.harvestDates.join(' · ')}
          </div>
          {crop.regrowthDays && (
            <p className="note-line">
              {laterHarvests > 0
                ? 'This crop is planted once. Each later harvest is another real harvest from the same plant, as long as it is watered between harvests.'
                : 'This crop is planted once, but this date only leaves enough time for the first harvest before it stops being valid.'}
            </p>
          )}
        </section>

        {(crop.accessNote || crop.notes) && (
          <section className="drawer-section">
            <h3>Notes</h3>
            {crop.accessNote && (
              <p className="note-line"><b>How to get seeds:</b> {crop.accessNote}</p>
            )}
            {crop.notes && (
              <p className="note-line"><b>Assumptions:</b> {crop.notes}</p>
            )}
          </section>
        )}
      </aside>
    </>
  );
}
