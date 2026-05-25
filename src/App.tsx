import { useMemo, useState } from 'react';
import { Controls } from './components/Controls';
import { CropCalendarDrawer } from './components/CropCalendarDrawer';
import { CropCard } from './components/CropCard';
import { DEFAULT_ENABLED, Filters } from './components/Filters';
import { CROPS } from './data/crops';
import { rankCrops } from './domain/planner';
import { Quality, Season, SeedSource } from './domain/types';

export default function App() {
  const [season, setSeason] = useState<Season>('Spring');
  const [day, setDay] = useState(1);
  const [money, setMoney] = useState(500);
  const [quality, setQuality] = useState<Quality>('Regular');
  const [enabled, setEnabled] = useState<SeedSource[]>(DEFAULT_ENABLED);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);

  const plans = useMemo(
    () => rankCrops(CROPS, { season, day, money, quality, enabledSources: enabled }),
    [season, day, money, quality, enabled]
  );

  return (
    <div className="app">
      <h1 className="title">🌻 Stardew Crop Planner</h1>
      <p className="subtitle">
        Pick a date, set your gold, and see which crops earn the most before the season ends.
      </p>

      <Controls
        season={season}
        day={day}
        money={money}
        quality={quality}
        onChange={(p) => {
          if (p.season !== undefined) setSeason(p.season);
          if (p.day !== undefined) setDay(p.day);
          if (p.money !== undefined) setMoney(p.money);
          if (p.quality !== undefined) setQuality(p.quality);
        }}
      />

      <Filters enabled={enabled} onChange={setEnabled} />

      <section className="panel">
        <div className="panel-head">
          <h2>Best profit before season end</h2>
          <span className="summary">
            Planted on {season} {day} · selling at {quality} · {plans.length} match{plans.length === 1 ? '' : 'es'}
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

      <footer>
        Data from the <a href="https://stardewvalleywiki.com/Crops" target="_blank" rel="noreferrer">Stardew Valley Wiki</a>.
        Quality multipliers assume the whole harvest sells at the chosen tier.
      </footer>
    </div>
  );
}
