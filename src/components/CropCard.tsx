import { CropPlan, SeedSource } from '../domain/types';

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

function metadataLines(crop: CropPlan['crop']): string[] {
  const lines: string[] = [];
  lines.push(`Grows in ${crop.seasons.join(', ')}`);
  if (crop.regrowthDays) lines.push(`After first harvest, harvest again every ${crop.regrowthDays} days`);
  if (crop.trellis) lines.push('Trellis crop (blocks tile)');
  if (crop.seasons.length > 1) lines.push('Multi-season');
  if (crop.producePerHarvest > 1) lines.push(`${crop.producePerHarvest} per harvest`);
  return lines;
}

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
        <span className="emoji" aria-hidden>{crop.emoji ?? '🌱'}</span>
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
        <div><span>Seeds bought</span><b>{plan.seedsBought}</b></div>
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

      <ul className="meta-list">
        {metadataLines(crop).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

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
