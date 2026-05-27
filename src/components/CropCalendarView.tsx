import { calendarEvents, offsetToDate } from '../domain/planner';
import { FERTILIZER_BY_ID } from '../data/fertilizers';
import { CropPlan, DAYS_PER_SEASON, Season } from '../domain/types';
import { Icon } from './Icon';

const gold = (n: number) => `${Math.round(n).toLocaleString()}g`;

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type CellKind = 'plant' | 'water' | 'harvest' | 'regrowHarvest' | 'loadKeg' | 'collectKeg' | 'loadCask' | 'collectCask';
const KIND_LABEL: Record<CellKind, string> = {
  plant: '🌱',
  water: '💧',
  harvest: '⭐',
  regrowHarvest: '⭐',
  loadKeg: '🛢️',
  collectKeg: '🍷',
  loadCask: '🌳',
  collectCask: '💎',
};
const KIND_TITLE: Record<CellKind, string> = {
  plant: 'Plant',
  water: 'Water',
  harvest: 'First harvest',
  regrowHarvest: 'Later harvest',
  loadKeg: 'Load keg',
  collectKeg: 'Collect keg product',
  loadCask: 'Load cask',
  collectCask: 'Collect aged product',
};

interface Props {
  plan: CropPlan;
  season: Season;
  day: number;
  /** When provided, draws a red outline on that day-of-season cell. */
  todayDayOfSeason?: number;
}

export function CropCalendarView({ plan, season, day, todayDayOfSeason }: Props) {
  const fert = FERTILIZER_BY_ID[plan.fertilizerId];
  const events = calendarEvents(plan.crop, season, day, fert.speedMod);
  const byDay = new Map<number, CellKind[]>();
  const priority: CellKind[] = [
    'collectCask', 'collectKeg', 'harvest', 'regrowHarvest',
    'loadCask', 'loadKeg', 'plant', 'water',
  ];
  const addKind = (calendarDay: number, kind: CellKind) => {
    if (calendarDay < 1 || calendarDay > DAYS_PER_SEASON) return;
    const list = byDay.get(calendarDay) ?? [];
    if (!list.includes(kind)) {
      list.push(kind);
      list.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
      byDay.set(calendarDay, list);
    }
  };
  for (const e of events) {
    addKind(e.day, e.kind as CellKind);
  }
  for (const e of plan.processingEvents) {
    addKind(day + e.day, e.kind);
  }

  const crop = plan.crop;
  const laterHarvests = Math.max(0, plan.harvestDays.length - 1);
  const processingDates = plan.processingEvents
    .filter((e) => e.kind === 'collectKeg' || e.kind === 'collectCask')
    .map((e) => `${e.count} ${KIND_TITLE[e.kind].replace('Collect ', '')}: ${offsetToDate(season, day, e.day)}`);
  const visibleProcessingDates = compactList(processingDates);

  return (
    <>
      <section className="drawer-section">
        <h3>{season} calendar</h3>
        <div className="cal-grid">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="cal-head">{d}</div>
          ))}
          {Array.from({ length: DAYS_PER_SEASON }, (_, i) => i + 1).map((d) => {
            const kinds = byDay.get(d) ?? [];
            const kind = kinds[0];
            const isToday = todayDayOfSeason !== undefined && d === todayDayOfSeason;
            return (
              <div
                key={d}
                className={
                  'cal-cell'
                  + (kind ? ` k-${kind}` : '')
                  + (isToday ? ' is-today' : '')
                }
                title={kinds.length > 0 ? `${kinds.map((k) => KIND_TITLE[k]).join(' + ')} · ${season} ${d}` : `${season} ${d}`}
              >
                <span className="cal-day">{d}</span>
                {kinds.length > 0 && (
                  <span className="cal-icons">
                    {kinds.slice(0, 3).map((k) => (
                      <Icon key={k} emoji={KIND_LABEL[k]} className="cal-icon" />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="cal-legend">
          <span><span className="swatch k-plant" /> Plant</span>
          <span><span className="swatch k-water" /> Water</span>
          <span><span className="swatch k-harvest" /> First harvest</span>
          {crop.regrowthDays && <span><span className="swatch k-regrowHarvest" /> Later harvests</span>}
          {plan.processingMode !== 'raw' && <span><span className="swatch k-loadKeg" /> Keg/cask work</span>}
          {plan.processingMode !== 'raw' && <span><span className="swatch k-collectKeg" /> Collect artisan goods</span>}
          {todayDayOfSeason !== undefined && <span><span className="swatch is-today-swatch" /> Today</span>}
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
          {plan.processingMode !== 'raw' && (
            <>
              <div><span>Processed</span><b>{plan.processedCount}{plan.kegProductLabel ? ` ${plan.kegProductLabel}` : ''}</b></div>
              <div><span>Raw leftover</span><b>{plan.rawLeftoverCount}</b></div>
              <div><span>Last finished</span><b>{plan.lastFinishedDate}</b></div>
            </>
          )}
        </div>
        <div className="harvest-dates">
          <span className="kv-label">Harvest dates:</span> {plan.harvestDates.join(' · ')}
        </div>
        {plan.processingWarnings.length > 0 && (
          <div className="harvest-dates" style={{ marginTop: 4 }}>
            {plan.processingWarnings.map((w) => (
              <div key={w} className="note-line"><b>Heads up:</b> {w}</div>
            ))}
          </div>
        )}
        {visibleProcessingDates.length > 0 && (
          <div className="harvest-dates">
            <span className="kv-label">Processing dates:</span> {visibleProcessingDates.join(' · ')}
          </div>
        )}
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
    </>
  );
}

function compactList(items: string[]): string[] {
  if (items.length <= 14) return items;
  return [
    ...items.slice(0, 10),
    `… ${items.length - 12} more …`,
    ...items.slice(-2),
  ];
}
