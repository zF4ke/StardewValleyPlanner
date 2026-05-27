import { calendarEvents, offsetToDate } from '../domain/planner';
import { FERTILIZER_BY_ID } from '../data/fertilizers';
import { CropPlan, DAYS_PER_SEASON, SEASONS, Season } from '../domain/types';
import { Icon } from './Icon';

const gold = (n: number) => `${Math.round(n).toLocaleString()}g`;

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SEASON_START: Record<Season, number> = { Spring: 0, Summer: 1, Fall: 2, Winter: 3 };
const MAX_EXTENDED_CALENDAR_CELLS = 420;

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
  const byOffset = new Map<number, CellKind[]>();
  const priority: CellKind[] = [
    'collectCask', 'collectKeg', 'harvest', 'regrowHarvest',
    'loadCask', 'loadKeg', 'plant', 'water',
  ];
  const addKind = (offset: number, kind: CellKind) => {
    if (offset < 0) return;
    const list = byOffset.get(offset) ?? [];
    if (!list.includes(kind)) {
      list.push(kind);
      list.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
      byOffset.set(offset, list);
    }
  };
  for (const e of events) {
    addKind(e.day - day, e.kind as CellKind);
  }
  for (const e of plan.processingEvents) {
    addKind(e.day, e.kind);
  }

  const crop = plan.crop;
  const laterHarvests = Math.max(0, plan.harvestDays.length - 1);
  const startAbs = SEASON_START[season] * DAYS_PER_SEASON + (day - 1);
  const maxOffset = Math.max(
    plan.daysUsed,
    ...plan.harvestDays,
    ...plan.processingEvents.map((e) => e.day),
    0
  );
  const firstSeasonBlock = Math.floor(startAbs / DAYS_PER_SEASON);
  const firstCalendarAbs = firstSeasonBlock * DAYS_PER_SEASON;
  const lastPlanAbs = startAbs + maxOffset;
  const fullCalendarCells = Math.ceil((lastPlanAbs - firstCalendarAbs + 1) / 7) * 7;
  const calendarCells = Math.min(fullCalendarCells, MAX_EXTENDED_CALENDAR_CELLS);
  const calendarIsCapped = calendarCells < fullCalendarCells;
  const processingDates = plan.processingEvents
    .filter((e) => e.kind === 'collectKeg' || e.kind === 'collectCask')
    .map((e) => `${e.count} ${KIND_TITLE[e.kind].replace('Collect ', '')}: ${offsetToDate(season, day, e.day)}`);
  const visibleProcessingDates = compactList(processingDates);

  return (
    <>
      <section className="drawer-section">
        <h3>Plan calendar</h3>
        <div className="cal-grid cal-grid-extended">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="cal-head">{d}</div>
          ))}
          {Array.from({ length: calendarCells }, (_, i) => {
            const absoluteDay = firstCalendarAbs + i;
            const block = Math.floor(absoluteDay / DAYS_PER_SEASON);
            const blockSeason = SEASONS[block % SEASONS.length];
            const year = Math.floor(block / SEASONS.length) + 1;
            const d = (absoluteDay % DAYS_PER_SEASON) + 1;
            const offset = absoluteDay - startAbs;
            const kinds = byOffset.get(offset) ?? [];
            const kind = kinds[0];
            const isToday =
              todayDayOfSeason !== undefined &&
              block === firstSeasonBlock &&
              d === todayDayOfSeason;
            const isSeasonStart = d === 1;
            const title = kinds.length > 0
              ? `${kinds.map((k) => KIND_TITLE[k]).join(' + ')} · ${blockSeason} ${d}${year > 1 ? ` (Y${year})` : ''}`
              : `${blockSeason} ${d}${year > 1 ? ` (Y${year})` : ''}`;
            const seasonLabel = year > 1 ? `${blockSeason} Y${year}` : blockSeason;
            const showSeasonLabel = i === 0 || isSeasonStart;
          return (
            <div
              key={absoluteDay}
              className={
                'cal-cell'
                + (offset < 0 ? ' is-before-plan' : '')
                + (kind ? ` k-${kind}` : '')
                + (isToday ? ' is-today' : '')
                + (isSeasonStart ? ' is-season-start' : '')
              }
              title={title}
            >
              <span className="cal-day">{d}</span>
              {showSeasonLabel && (
                <span className="cal-season-tag">{seasonLabel}</span>
              )}
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
        {calendarIsCapped && (
          <p className="note-line">
            Calendar preview stops after {MAX_EXTENDED_CALENDAR_CELLS} days because this machine queue runs for a very long time.
            Processing dates below still show the full schedule summary.
          </p>
        )}
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
              {plan.kegLimit === undefined && plan.minimumKegsRequired > 0 && (
                <div><span>Kegs needed</span><b>{plan.minimumKegsRequired.toLocaleString()}</b></div>
              )}
              {plan.caskLimit === undefined && plan.minimumCasksRequired > 0 && (
                <div><span>Casks needed</span><b>{plan.minimumCasksRequired.toLocaleString()}</b></div>
              )}
              {plan.busiestKegDayDate && plan.busiestKegDayCount > 0 && (
                <div><span>Busiest keg day</span><b>{plan.busiestKegDayDate}: {plan.busiestKegDayCount.toLocaleString()} actions</b></div>
              )}
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
        {plan.kegLimit === undefined && plan.minimumKegsRequired > 0 && plan.busiestKegDayDate && (
          <p className="note-line">
            Unlimited kegs means this finish date assumes at least <b>{plan.minimumKegsRequired.toLocaleString()}</b> kegs
            and up to <b>{plan.busiestKegDayCount.toLocaleString()}</b> keg load/collect actions on {plan.busiestKegDayDate}.
            Enter your real keg count for a slower queue that does not assume that much same-day machine work.
          </p>
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
