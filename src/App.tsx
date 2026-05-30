import { useEffect, useMemo, useRef, useState } from 'react';
import { Controls } from './components/Controls';
import { CropCalendarDrawer } from './components/CropCalendarDrawer';
import { CropCard } from './components/CropCard';
import { DEFAULT_ENABLED, Filters } from './components/Filters';
import { FertilizerWorkshop } from './components/FertilizerWorkshop';
import { Icon } from './components/Icon';
import { PatchNotes } from './components/PatchNotes';
import { SprinklerTracker } from './components/SprinklerTracker';
import { TrackedCropsDrawer } from './components/TrackedCropsDrawer';
import { CURRENT_VERSION } from './data/patchNotes';
import { loadPlannerInputs, PlannerInputs, savePlannerInputs } from './data/plannerInputs';
import {
  CurrentDay,
  TrackedCrop,
  createTrackedCrop,
  loadToday,
  loadTrackedCrops,
  saveToday,
  saveTrackedCrops,
} from './data/trackedCrops';
import {
  CropPlan, FarmingLevel, FertilizerId, ProcessingMode, Quality, Season, SeedSource,
} from './domain/types';

type Page = 'planner' | 'workshop' | 'sprinklers' | 'patch';
type Theme = 'light' | 'dark';
type PlannerStatus = 'settling' | 'calculating';

interface PlannerWorkerResponse {
  id: number;
  plans?: CropPlan[];
  error?: string;
}

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

  const [initialInputs] = useState(() => loadPlannerInputs());
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
  const [processingMode, setProcessingMode] = useState<ProcessingMode>(initialInputs.processingMode);
  const [kegCount, setKegCount] = useState<number | undefined>(initialInputs.kegCount);
  const [caskCount, setCaskCount] = useState<number | undefined>(initialInputs.caskCount);
  const [hasTiller, setHasTiller] = useState(initialInputs.hasTiller);
  const [hasArtisan, setHasArtisan] = useState(initialInputs.hasArtisan);
  const [maxSeasons, setMaxSeasons] = useState(initialInputs.maxSeasons ?? 4);
  const plannerWorker = useRef<Worker | null>(null);
  const plannerRequestId = useRef(0);
  const [plans, setPlans] = useState<CropPlan[]>([]);
  const [plannerBusy, setPlannerBusy] = useState(true);
  const [plannerStatus, setPlannerStatus] = useState<PlannerStatus>('calculating');
  const [plannerError, setPlannerError] = useState<string | null>(null);

  const plannerInput = useMemo<PlannerInputs>(() => ({
      season, day, money, quality, farmingLevel,
      fertilizerId, fertilizerAmount, enabledSources: enabled,
      processingMode, kegCount, caskCount, hasTiller, hasArtisan, maxSeasons,
    }), [
      season, day, money, quality, farmingLevel, fertilizerId, fertilizerAmount, enabled,
      processingMode, kegCount, caskCount, hasTiller, hasArtisan, maxSeasons,
    ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      savePlannerInputs(plannerInput);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [plannerInput]);

  useEffect(() => {
    const worker = new Worker(new URL('./workers/plannerWorker.ts', import.meta.url), { type: 'module' });
    plannerWorker.current = worker;
    const onMessage = (event: MessageEvent<PlannerWorkerResponse>) => {
      if (event.data.id !== plannerRequestId.current) return;
      if (event.data.error) {
        setPlannerError(event.data.error);
        setPlannerBusy(false);
        return;
      }
      setPlans(event.data.plans ?? []);
      setPlannerError(null);
      setPlannerBusy(false);
    };
    const onError = (event: ErrorEvent) => {
      setPlannerError(event.message || 'Planner worker failed.');
      setPlannerBusy(false);
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    return () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.terminate();
      if (plannerWorker.current === worker) {
        plannerWorker.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const id = plannerRequestId.current + 1;
    plannerRequestId.current = id;
    setPlannerBusy(true);
    setPlannerStatus('settling');
    setPlannerError(null);
    const timeout = window.setTimeout(() => {
      setPlannerStatus('calculating');
      plannerWorker.current?.postMessage({ id, input: plannerInput });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [
    plannerInput,
  ]);
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
        processingMode, kegCount, caskCount, hasTiller, hasArtisan,
      }),
    ]);
    setFarmOpen(true);
  };

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
          data-active={page === 'sprinklers'}
          onClick={() => setPage('sprinklers')}
        ><Icon emoji="💧" /> Sprinklers</button>
        <button
          className="nav-tab"
          data-active={page === 'patch'}
          onClick={() => setPage('patch')}
        ><Icon emoji="📜" /> Patch Notes</button>
      </nav>

      {page === 'planner' && (
        <>
          <p className="subtitle">
            Pick a date, set your gold, and compare raw harvests, keg goods, and aged artisan plans.
          </p>

          <Controls
            season={season}
            day={day}
            money={money}
            quality={quality}
            farmingLevel={farmingLevel}
            fertilizerId={fertilizerId}
            fertilizerAmount={fertilizerAmount}
            processingMode={processingMode}
            kegCount={kegCount}
            caskCount={caskCount}
            hasTiller={hasTiller}
            hasArtisan={hasArtisan}
            maxSeasons={maxSeasons}
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
              if (p.processingMode !== undefined) setProcessingMode(p.processingMode);
              if (Object.prototype.hasOwnProperty.call(p, 'kegCount')) setKegCount(p.kegCount);
              if (Object.prototype.hasOwnProperty.call(p, 'caskCount')) setCaskCount(p.caskCount);
              if (p.hasTiller !== undefined) setHasTiller(p.hasTiller);
              if (p.hasArtisan !== undefined) setHasArtisan(p.hasArtisan);
              if (p.maxSeasons !== undefined) setMaxSeasons(p.maxSeasons);
            }}
          />

          <Filters enabled={enabled} onChange={setEnabled} />

          <section className={'panel planner-panel' + (plannerBusy ? ' is-planning' : '')} aria-busy={plannerBusy}>
            <div className="panel-head">
              <h2>Best profit from this planting</h2>
              {plannerBusy && (
                <span className="planning-chip" role="status" aria-live="polite">
                  <span className="spinner" aria-hidden="true" />
                  {plannerStatus === 'settling' ? 'Waiting for input' : 'Calculating'}
                </span>
              )}
            </div>
            {plannerError ? (
              <div className="empty">
                Planner failed: {plannerError}
              </div>
            ) : plans.length === 0 ? (
              <div className="empty">
                {plannerBusy
                  ? 'Calculating crop plans...'
                  : 'No crops match. Try lowering the day, raising your gold, or enabling more seed sources above.'}
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
      {page === 'sprinklers' && (
        <>
          <p className="subtitle">
            Pick a sprinkler tier, set a goal, and see exactly what's left to mine or buy.
          </p>
          <SprinklerTracker />
        </>
      )}
      {page === 'patch' && <PatchNotes />}

      <footer>
        Data from the <a href="https://stardewvalleywiki.com/Crops" target="_blank" rel="noreferrer">Stardew Valley Wiki</a>.
        Quality-fertilizer probabilities use the canonical formula from the game source.
      </footer>
    </div>
  );
}
