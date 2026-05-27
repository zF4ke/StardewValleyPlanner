import { useEffect } from 'react';
import { CROPS } from '../data/crops';
import { FERTILIZER_BY_ID } from '../data/fertilizers';
import {
  CurrentDay,
  TrackedCrop,
  advanceDay,
  fromAbsolute,
  plantedAbsolute,
  toAbsolute,
} from '../data/trackedCrops';
import { harvestOffsets, planCrop } from '../domain/planner';
import { CropPlan, SEASONS, Season } from '../domain/types';
import { CropCalendarView } from './CropCalendarView';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  tracked: TrackedCrop[];
  today: CurrentDay;
  onTodayChange: (t: CurrentDay) => void;
  onRemove: (id: string) => void;
}

function formatDate(d: CurrentDay): string {
  return `${d.season} ${d.day}${d.year > 1 ? ` (Y${d.year})` : ''}`;
}

interface StatusInfo { text: string; tone: 'pending' | 'soon' | 'today' | 'done' }

function getStatus(t: TrackedCrop, today: CurrentDay): StatusInfo {
  const crop = CROPS.find((c) => c.name === t.cropName);
  if (!crop) return { text: 'Unknown crop', tone: 'pending' };
  const fert = FERTILIZER_BY_ID[t.fertilizerId];
  const offsets = harvestOffsets(crop, t.season, t.day, fert?.speedMod ?? 0);
  if (offsets.length === 0) return { text: 'No harvests possible this season.', tone: 'done' };
  const plantedAbs = plantedAbsolute(t);
  const daysSincePlant = toAbsolute(today) - plantedAbs;
  if (daysSincePlant < 0) {
    const days = -daysSincePlant;
    return { text: `Planting in ${days} day${days === 1 ? '' : 's'} — ${formatDate(fromAbsolute(plantedAbs))}.`, tone: 'pending' };
  }
  const plan = planFromTracked(t);
  const actions = offsets.map((offset) => ({ offset, label: 'Harvest' }));
  for (const e of plan?.processingEvents ?? []) {
    if (e.kind === 'collectKeg') actions.push({ offset: e.day, label: 'Collect keg product' });
    if (e.kind === 'collectCask') actions.push({ offset: e.day, label: 'Collect aged product' });
  }
  actions.sort((a, b) => a.offset - b.offset);
  const upcoming = actions.find((a) => a.offset >= daysSincePlant);
  if (upcoming === undefined) return { text: 'All harvests and processing done.', tone: 'done' };
  const daysToAction = upcoming.offset - daysSincePlant;
  const actionDate = formatDate(fromAbsolute(plantedAbs + upcoming.offset));
  if (daysToAction === 0) return { text: `${upcoming.label} today! (${actionDate})`, tone: 'today' };
  if (daysToAction <= 2) return { text: `${upcoming.label} in ${daysToAction} day${daysToAction === 1 ? '' : 's'} — ${actionDate}.`, tone: 'soon' };
  return { text: `Next: ${upcoming.label.toLowerCase()} in ${daysToAction} days — ${actionDate}.`, tone: 'pending' };
}

/** Rebuild the same CropPlan the right-drawer would have shown when this
 *  crop was tracked, by feeding planCrop a synthetic input that yields the
 *  saved seed count. */
function planFromTracked(t: TrackedCrop): CropPlan | null {
  const crop = CROPS.find((c) => c.name === t.cropName);
  if (!crop || crop.seedCost <= 0) return null;
  const money = t.seedsBought * crop.seedCost;
  return planCrop(crop, {
    season: t.season, day: t.day, money,
    quality: 'Regular', enabledSources: [crop.source],
    farmingLevel: t.farmingLevel,
    fertilizerId: t.fertilizerId,
    fertilizerAmount: t.fertilizerAmount,
    processingMode: t.processingMode ?? 'raw',
    kegCount: t.kegCount,
    caskCount: t.caskCount,
    hasTiller: t.hasTiller,
    hasArtisan: t.hasArtisan,
  });
}

/** Day-of-the-planted-season that "today" lands on. Returns undefined if
 *  today is in a different season/year context than the planted season. */
function todayInPlantedSeason(t: TrackedCrop, today: CurrentDay): number | undefined {
  if (today.season !== t.season || today.year !== 1) return undefined;
  return today.day;
}

export function TrackedCropsDrawer({ open, onClose, tracked, today, onTodayChange, onRemove }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sorted = [...tracked].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer drawer-left" role="dialog" aria-label="Tracked crops">
        <header className="drawer-head">
          <div className="drawer-title">
            <Icon emoji="📋" size="1.6rem" />
            <div>
              <div className="crop-name">My Farm</div>
              <div className="source-line">{sorted.length} tracked crop{sorted.length === 1 ? '' : 's'}</div>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <section className="today-card">
          <div className="today-card-label">Today</div>
          <div className="today-card-date">{formatDate(today)}</div>
          <div className="today-card-buttons">
            <button className="sp-btn" onClick={() => onTodayChange(advanceDay(today, -1))}>−1 day</button>
            <button className="sp-btn sp-btn-save" onClick={() => onTodayChange(advanceDay(today, 1))}>+1 day</button>
          </div>
          <details className="today-edit-details">
            <summary>Edit date</summary>
            <div className="today-edit-row">
              <label>
                <span>Season</span>
                <select
                  value={today.season}
                  onChange={(e) => onTodayChange({ ...today, season: e.target.value as Season })}
                >
                  {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>
                <span>Day</span>
                <input
                  type="number" min={1} max={28} value={today.day}
                  onChange={(e) => onTodayChange({
                    ...today, day: Math.max(1, Math.min(28, parseInt(e.target.value) || 1)),
                  })}
                />
              </label>
              <label>
                <span>Year</span>
                <input
                  type="number" min={1} value={today.year}
                  onChange={(e) => onTodayChange({ ...today, year: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </label>
            </div>
          </details>
        </section>

        {sorted.length === 0 ? (
          <p className="note-line" style={{ padding: '0 4px' }}>
            Nothing tracked yet. Click a crop in the planner results, then hit <b>Track this plan</b>.
          </p>
        ) : (
          sorted.map((t) => {
            const crop = CROPS.find((c) => c.name === t.cropName);
            const fert = FERTILIZER_BY_ID[t.fertilizerId];
            const status = getStatus(t, today);
            const plan = planFromTracked(t);
            const todayDay = todayInPlantedSeason(t, today);
            return (
              <article key={t.id} className="tracked-block">
                <div className="tracked-top">
                  <Icon emoji={crop?.emoji ?? '🌱'} className="tracked-icon" />
                  <div className="tracked-name">{t.cropName}</div>
                  <button
                    className="tracked-remove"
                    onClick={() => { if (confirm(`Stop tracking ${t.cropName}?`)) onRemove(t.id); }}
                    title="Stop tracking this crop"
                    aria-label="Remove"
                  >×</button>
                </div>
                <div className="tracked-sub">
                  {t.seedsBought} seeds · planted {t.season} {t.day} ·{' '}
                  <Icon emoji={fert.emoji} /> {fert.name}
                </div>
                <div className={`tracked-status tone-${status.tone}`}>{status.text}</div>

                {plan ? (
                  <CropCalendarView
                    plan={plan}
                    season={t.season}
                    day={t.day}
                    todayDayOfSeason={todayDay}
                  />
                ) : (
                  <p className="note-line">Can't rebuild calendar — crop data may have changed.</p>
                )}
              </article>
            );
          })
        )}
      </aside>
    </>
  );
}
