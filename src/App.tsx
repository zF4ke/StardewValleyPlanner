import { useMemo, useState } from 'react';
import { Controls } from './components/Controls';
import { CropCalendarDrawer } from './components/CropCalendarDrawer';
import { CropCard } from './components/CropCard';
import { DEFAULT_ENABLED, Filters } from './components/Filters';
import { FertilizerWorkshop } from './components/FertilizerWorkshop';
import { PatchNotes } from './components/PatchNotes';
import { CROPS } from './data/crops';
import { FERTILIZER_BY_ID } from './data/fertilizers';
import { CURRENT_VERSION } from './data/patchNotes';
import { rankCrops } from './domain/planner';
import { FarmingLevel, FertilizerId, Quality, Season, SeedSource } from './domain/types';

type Page = 'planner' | 'workshop' | 'patch';

export default function App() {
  const [page, setPage] = useState<Page>('planner');
  const [season, setSeason] = useState<Season>('Spring');
  const [day, setDay] = useState(1);
  const [money, setMoney] = useState(500);
  const [quality, setQuality] = useState<Quality>('Regular');
  const [farmingLevel, setFarmingLevel] = useState<FarmingLevel>(0);
  const [fertilizerId, setFertilizerId] = useState<FertilizerId>('none');
  const [fertilizerAmount, setFertilizerAmount] = useState<number | undefined>(undefined);
  const [enabled, setEnabled] = useState<SeedSource[]>(DEFAULT_ENABLED);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);

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
        🌻 Stardew Crop Planner
        <button
          className="version-pill"
          onClick={() => setPage('patch')}
          title="View patch notes"
        >{CURRENT_VERSION}</button>
      </h1>

      <nav className="page-nav">
        <button
          className="nav-tab"
          data-active={page === 'planner'}
          onClick={() => setPage('planner')}
        >🌱 Crop Planner</button>
        <button
          className="nav-tab"
          data-active={page === 'workshop'}
          onClick={() => setPage('workshop')}
        >🧪 Fertilizer Workshop</button>
        <button
          className="nav-tab"
          data-active={page === 'patch'}
          onClick={() => setPage('patch')}
        >📜 Patch Notes</button>
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
                {season} {day} · Farming L{farmingLevel} · {fert.emoji} {fert.name} · {plans.length} match{plans.length === 1 ? '' : 'es'}
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
