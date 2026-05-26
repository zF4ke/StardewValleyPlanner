import { useEffect, useMemo, useState } from 'react';
import { Controls } from './components/Controls';
import { CropCalendarDrawer } from './components/CropCalendarDrawer';
import { CropCard } from './components/CropCard';
import { DEFAULT_ENABLED, Filters } from './components/Filters';
import { FertilizerWorkshop } from './components/FertilizerWorkshop';
import { Icon } from './components/Icon';
import { PatchNotes } from './components/PatchNotes';
import { TrackedCropsDrawer } from './components/TrackedCropsDrawer';
import { CROPS } from './data/crops';
import { FERTILIZER_BY_ID } from './data/fertilizers';
import { CURRENT_VERSION } from './data/patchNotes';
import { loadPlannerInputs, savePlannerInputs } from './data/plannerInputs';
import {
  CurrentDay,
  TrackedCrop,
  createTrackedCrop,
  loadToday,
  loadTrackedCrops,
  saveToday,
  saveTrackedCrops,
} from './data/trackedCrops';
import { rankCrops } from './domain/planner';
import { FarmingLevel, FertilizerId, Quality, Season, SeedSource } from './domain/types';

type Page = 'planner' | 'workshop' | 'patch';
type Theme = 'light' | 'dark';

export default function App() {
  const [page, setPage] = useState<Page>('planner');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
    if (saved === 'light' || saved === 'dark') return saved;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* private mode */ }
  }, [theme]);

  const initialInputs = loadPlannerInputs();
  const [season, setSeason] = useState<Season>(initialInputs.season);
  const [day, setDay] = useState(initialInputs.day);
  const [money, setMoney] = useState(initialInputs.money);
  const [quality, setQuality] = useState<Quality>(initialInputs.quality);
  const [farmingLevel, setFarmingLevel] = useState<FarmingLevel>(initialInputs.farmingLevel);
  const [fertilizerId, setFertilizerId] = useState<FertilizerId>(initialInputs.fertilizerId);
  const [fertilizerAmount, setFertilizerAmount] = useState<number | undefined>(initialInputs.fertilizerAmount);
  const [enabled, setEnabled] = useState<SeedSource[]>(
    initialInputs.enabledSources.length > 0 ? initialInputs.enabledSources : DEFAULT_ENABLED
  );

  useEffect(() => {
    savePlannerInputs({
      season, day, money, quality, farmingLevel,
      fertilizerId, fertilizerAmount, enabledSources: enabled,
    });
  }, [season, day, money, quality, farmingLevel, fertilizerId, fertilizerAmount, enabled]);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [tracked, setTracked] = useState<TrackedCrop[]>(() => loadTrackedCrops());
  const [today, setToday] = useState<CurrentDay>(() => loadToday());
  const [farmOpen, setFarmOpen] = useState(false);

  useEffect(() => { saveTrackedCrops(tracked); }, [tracked]);
  useEffect(() => { saveToday(today); }, [today]);

  const trackPlan = (cropName: string) => {
    const plan = plans.find((p) => p.crop.name === cropName);
    if (!plan) return;
    setTracked((cur) => [
      ...cur,
      createTrackedCrop({
        cropName,
        season, day, farmingLevel, fertilizerId, fertilizerAmount,
        seedsBought: plan.seedsBought,
      }),
    ]);
    setFarmOpen(true);
  };

  const plans = useMemo(
    () => rankCrops(CROPS, {
      season, day, money, quality, enabledSources: enabled,
      farmingLevel, fertilizerId, fertilizerAmount,
    }),
    [season, day, money, quality, enabled, farmingLevel, fertilizerId, fertilizerAmount]
  );

  const fert = FERTILIZER_BY_ID[fertilizerId];

  return (
    <div className="app">
      <h1 className="title">
        <Icon emoji="🌻" className="title-icon" /> Stardew Workshop
        <button
          className="version-pill"
          onClick={() => setPage('patch')}
          title="View patch notes"
        >{CURRENT_VERSION}</button>
      </h1>

      <button
        className="theme-toggle"
        onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle theme"
      ><Icon emoji={theme === 'dark' ? '☀️' : '🌙'} /></button>

      <button
        className="farm-toggle"
        onClick={() => setFarmOpen(true)}
        title="My farm — tracked crops"
        aria-label="Open tracked crops"
      >
        <Icon emoji="📌" />
        {tracked.length > 0 && <span className="farm-badge">{tracked.length}</span>}
      </button>

      <TrackedCropsDrawer
        open={farmOpen}
        onClose={() => setFarmOpen(false)}
        tracked={tracked}
        today={today}
        onTodayChange={setToday}
        onRemove={(id) => setTracked((cur) => cur.filter((t) => t.id !== id))}
      />

      <nav className="page-nav">
        <button
          className="nav-tab"
          data-active={page === 'planner'}
          onClick={() => setPage('planner')}
        ><Icon emoji="🌱" /> Crop Planner</button>
        <button
          className="nav-tab"
          data-active={page === 'workshop'}
          onClick={() => setPage('workshop')}
        ><Icon emoji="🧪" /> Fertilizer Workshop</button>
        <button
          className="nav-tab"
          data-active={page === 'patch'}
          onClick={() => setPage('patch')}
        ><Icon emoji="📜" /> Patch Notes</button>
      </nav>

      {page === 'planner' && (
        <>
          <p className="subtitle">
            Pick a date, set your gold, and see which crops earn the most before the season ends.
          </p>

          <Controls
            season={season}
            day={day}
            money={money}
            quality={quality}
            farmingLevel={farmingLevel}
            fertilizerId={fertilizerId}
            fertilizerAmount={fertilizerAmount}
            onChange={(p) => {
              if (p.season !== undefined) setSeason(p.season);
              if (p.day !== undefined) setDay(p.day);
              if (p.money !== undefined) setMoney(p.money);
              if (p.quality !== undefined) setQuality(p.quality);
              if (p.farmingLevel !== undefined) setFarmingLevel(p.farmingLevel);
              if (p.fertilizerId !== undefined) setFertilizerId(p.fertilizerId);
              if (Object.prototype.hasOwnProperty.call(p, 'fertilizerAmount')) {
                setFertilizerAmount(p.fertilizerAmount);
              }
            }}
          />

          <Filters enabled={enabled} onChange={setEnabled} />

          <section className="panel">
            <div className="panel-head">
              <h2>Best profit before season end</h2>
              <span className="summary">
                {season} {day} · Farming L{farmingLevel} · <Icon emoji={fert.emoji} /> {fert.name} · {plans.length} match{plans.length === 1 ? '' : 'es'}
              </span>
            </div>
            {plans.length === 0 ? (
              <div className="empty">
                No crops match. Try lowering the day, raising your gold, or enabling more seed sources above.
              </div>
            ) : (
              <div className="results">
                {plans.map((p, i) => (
                  <CropCard
                    key={p.crop.name}
                    plan={p}
                    rank={i + 1}
                    onSelect={() => setSelectedCrop(p.crop.name)}
                  />
                ))}
              </div>
            )}
          </section>

          {selectedCrop && (() => {
            const plan = plans.find((p) => p.crop.name === selectedCrop);
            return plan ? (
              <CropCalendarDrawer
                plan={plan}
                season={season}
                day={day}
                onClose={() => setSelectedCrop(null)}
                onTrack={() => trackPlan(plan.crop.name)}
                tracked={tracked.some((t) => t.cropName === plan.crop.name)}
              />
            ) : null;
          })()}
        </>
      )}

      {page === 'workshop' && <FertilizerWorkshop />}
      {page === 'patch' && <PatchNotes />}

      <footer>
        Data from the <a href="https://stardewvalleywiki.com/Crops" target="_blank" rel="noreferrer">Stardew Valley Wiki</a>.
        Quality-fertilizer probabilities use the canonical formula from the game source.
      </footer>
    </div>
  );
}
