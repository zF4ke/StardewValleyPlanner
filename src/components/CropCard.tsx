import { FERTILIZER_BY_ID } from '../data/fertilizers';
import { CropPlan, SeedSource } from '../domain/types';
import { Icon } from './Icon';

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

interface Props {
  plan: CropPlan;
  rank: number;
  onSelect?: () => void;
}

const gold = (n: number) => `${Math.round(n).toLocaleString()}g`;

const SOURCE_LABEL: Record<SeedSource, string> = {
  Pierre: "Pierre's",
  JojaMart: 'JojaMart',
  Oasis: 'Oasis',
  EggFestival: 'Egg Festival',
  TravelingCart: 'Traveling Cart',
  IslandTrader: 'Island Trader',
  Crafted: 'Crafted',
  Drop: 'Drop / Quest',
  SeedMaker: 'Seed Maker',
  Special: 'Special',
};

export function CropCard({ plan, rank, onSelect }: Props) {
  const { crop } = plan;
  const netClass = 'value profit' + (plan.netProfit < 0 ? ' neg' : '');
  const laterHarvests = Math.max(0, plan.harvestDays.length - 1);

  return (
    <article
      className={'card' + (onSelect ? ' clickable' : '')}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="rank" title={`Rank #${rank}`}>{rank}</div>

      <header className="card-head">
        <Icon emoji={crop.emoji ?? '🌱'} className="emoji" />
        <div className="head-text">
          <div className="crop-name">{crop.name}</div>
          <div className="source-line">
            from <b>{SOURCE_LABEL[crop.source]}</b>
            {crop.accessNote && <span className="access-note"> · {crop.accessNote}</span>}
          </div>
        </div>
      </header>

      <div className="primary-stats">
        <div className="primary">
          <span className="label">Net profit</span>
          <span className={netClass}>{gold(plan.netProfit)}</span>
        </div>
        <div className="primary">
          <span className="label">Final gold</span>
          <span className="value">{gold(plan.finalMoney)}</span>
        </div>
      </div>

      <div className="secondary-stats">
        <div><span>{plan.allowReplanting ? 'Total seeds' : 'Seeds bought'}</span><b>{plan.seedsBought}</b></div>
        {plan.maxTiles !== undefined && <div><span>Max tiles</span><b>{plan.maxTiles}</b></div>}
        {plan.allowReplanting && <div><span>Plantings</span><b>{plan.plantingCount}</b></div>}
        <div><span>Seed spend</span><b>{gold(plan.seedSpend)}</b></div>
        <div>
          <span>Total harvests</span>
          <b>{plan.harvestDays.length}{crop.regrowthDays && laterHarvests > 0 ? ` (${laterHarvests} later)` : ''}</b>
        </div>
        <div><span>First harvest</span><b>{plan.firstHarvestDate}</b></div>
        {plan.harvestDays.length > 1 && (
          <div><span>Last harvest</span><b>{plan.lastHarvestDate}</b></div>
        )}
      </div>

      {plan.processingMode !== 'raw' && (
        <div className="proc-block">
          <div className="proc-head">
            <b>
              {plan.crop.name}
              {plan.kegProductLabel && ` → ${plan.kegProductLabel}`}
              {plan.effectiveProcessingMode === 'silver-aged'  && plan.kegProductLabel && ' → Silver'}
              {plan.effectiveProcessingMode === 'gold-aged'    && plan.kegProductLabel && ' → Gold'}
              {plan.effectiveProcessingMode === 'iridium-aged' && plan.kegProductLabel && ' → Iridium'}
            </b>
          </div>
          <div className="proc-split">
            {plan.processedCount} processed · {plan.rawLeftoverCount} raw leftover
          </div>
          {plan.kegLimit === undefined && plan.minimumKegsRequired > 0 && (
            <div className="proc-split">
              Needs {plan.minimumKegsRequired.toLocaleString()} kegs for this timing
            </div>
          )}
          {plan.busiestKegDayDate && plan.busiestKegDayCount > 0 && (
            <div className="proc-split">
              Busiest keg day: {plan.busiestKegDayCount.toLocaleString()} actions on {plan.busiestKegDayDate}
            </div>
          )}
          {plan.lastFinishedDate && (
            <div className="proc-split">Last finished: {plan.lastFinishedDate}</div>
          )}
          {plan.processingWarnings.map((w) => (
            <div className="proc-warn" key={w}>{w}</div>
          ))}
        </div>
      )}

      {plan.fertilizerId !== 'none' && (() => {
        const fert = FERTILIZER_BY_ID[plan.fertilizerId];
        const mix = plan.qualityMixFertilized;
        return (
          <div className="fert-block">
            <div className="fert-head">
              <Icon emoji={fert.emoji} className="fert-emoji" />
              <b>{fert.name}</b>
              <span className="fert-req">requires {plan.fertilizerRequired}</span>
            </div>
            {plan.unfertilizedSeeds > 0 && (
              <div className="fert-split">
                {plan.fertilizedSeeds} fertilized · {plan.unfertilizedSeeds} on bare soil
              </div>
            )}
            {fert.qualityLevel > 0 && (
              <div className="quality-mix">
                <span title="Regular"><Icon emoji="⬜" /> {pct(mix.regular)}</span>
                <span title="Silver"><Icon emoji="🥈" /> {pct(mix.silver)}</span>
                <span title="Gold"><Icon emoji="🥇" /> {pct(mix.gold)}</span>
                <span title="Iridium"><Icon emoji="💠" /> {pct(mix.iridium)}</span>
              </div>
            )}
            {fert.speedMod > 0 && (
              <div className="fert-split">
                Growth {crop.growthDays}→{plan.effectiveGrowthDays} days (first harvest only)
              </div>
            )}
          </div>
        );
      })()}

      {(plan.allowReplanting || plan.tileLimitHit) && (
        <div className="notes">
          <span className="notes-label">Planting</span>
          <span>
            {plan.allowReplanting
              ? `${plan.plantingCount} planting${plan.plantingCount === 1 ? '' : 's'}: ${plan.plantingDates.join(', ')}`
              : plan.tileLimitHit
                ? 'Limited by max tiles.'
                : 'Tile limit active.'}
          </span>
        </div>
      )}

      {crop.notes && (
        <div className="notes">
          <span className="notes-label">Assumptions</span>
          <span>{crop.notes}</span>
        </div>
      )}
      {crop.regrowthDays && laterHarvests === 0 && (
        <div className="notes">
          <span className="notes-label">Timing</span>
          <span>There is only time for the first harvest before this crop stops being valid.</span>
        </div>
      )}

    </article>
  );
}
