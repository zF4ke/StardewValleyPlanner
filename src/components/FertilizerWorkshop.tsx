import { useMemo, useState } from 'react';
import {
  FERTILIZERS,
  FERTILIZER_BY_ID,
  INGREDIENT_LABEL,
  INGREDIENT_VALUE,
  IngredientId,
  Fertilizer,
} from '../data/fertilizers';
import { FertilizerId } from '../domain/types';

const gold = (n: number) => `${Math.round(n).toLocaleString()}g`;

type Option = {
  label: string;
  totalGold: number;
  batches?: number;
  produced?: number;
  excess?: number;
  ingredients?: Array<{ id: IngredientId; qty: number; cost: number }>;
  perUnit: number;
  notes?: string;
  currency?: string;
};

function evaluateCraft(fert: Fertilizer, want: number, ingredientCosts: Record<IngredientId, number>): Option | null {
  if (!fert.recipe) return null;
  const { ingredients, outputs } = fert.recipe;
  const batches = Math.ceil(want / outputs);
  const produced = batches * outputs;
  const totals = ingredients.map((ing) => ({
    id: ing.id,
    qty: ing.qty * batches,
    cost: ing.qty * batches * ingredientCosts[ing.id],
  }));
  const totalGold = totals.reduce((s, t) => s + t.cost, 0);
  return {
    label: `Craft (${batches}× recipe)`,
    totalGold,
    batches,
    produced,
    excess: produced - want,
    ingredients: totals,
    perUnit: totalGold / want,
  };
}

function evaluateBuy(fert: Fertilizer, want: number): Option[] {
  return fert.vendors.map((v) => ({
    label: `Buy from ${v.name}`,
    totalGold: v.price * want,
    perUnit: v.price,
    notes: v.notes,
    currency: v.currency,
  }));
}

export function FertilizerWorkshop() {
  const [fertId, setFertId] = useState<FertilizerId>('basic');
  const [qty, setQty] = useState(50);
  const [ingredientCosts, setIngredientCosts] = useState<Record<IngredientId, number>>(
    () => ({ ...INGREDIENT_VALUE }) as Record<IngredientId, number>
  );

  const fert = FERTILIZER_BY_ID[fertId];

  const options = useMemo<Option[]>(() => {
    const opts: Option[] = [];
    const craft = evaluateCraft(fert, qty, ingredientCosts);
    if (craft) opts.push(craft);
    opts.push(...evaluateBuy(fert, qty));
    // gold options first; non-gold vendor options at the end
    return opts.sort((a, b) => {
      if (!!a.currency !== !!b.currency) return a.currency ? 1 : -1;
      return a.totalGold - b.totalGold;
    });
  }, [fert, qty, ingredientCosts]);

  const cheapest = options.find((o) => !o.currency);
  const recipeIngredients = fert.recipe?.ingredients ?? [];
  const uniqueIngredients = Array.from(new Set(recipeIngredients.map((i) => i.id)));

  return (
    <section className="panel workshop">
      <h2>🧪 Fertilizer Workshop</h2>
      <p className="subtitle-soft">
        Pick a fertilizer and a target quantity. We compare buying from each vendor
        against the gold-value of the crafting ingredients and recommend the cheapest path.
      </p>

      <div className="row">
        <div className="field" style={{ minWidth: 240 }}>
          <label>Fertilizer</label>
          <select value={fertId} onChange={(e) => setFertId(e.target.value as FertilizerId)}>
            {FERTILIZERS.filter((f) => f.id !== 'none').map((f) => (
              <option key={f.id} value={f.id}>{f.emoji} {f.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Quantity wanted</label>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </div>

      <div className="ws-grid">
        <article className="ws-card">
          <h3>{fert.emoji} {fert.name}</h3>
          <p className="note-line">{fert.summary}</p>
          {fert.unlock && <p className="note-line"><b>Unlock:</b> {fert.unlock}</p>}
          <div className="kv-grid">
            <div><span>Sell price</span><b>{gold(fert.sellPrice)}</b></div>
            {fert.qualityLevel > 0 && <div><span>Quality level</span><b>{fert.qualityLevel}</b></div>}
            {fert.speedMod > 0 && <div><span>Speed bonus</span><b>{Math.round(fert.speedMod * 100)}%</b></div>}
            {fert.retainChance > 0 && <div><span>Water retain</span><b>{Math.round(fert.retainChance * 100)}%</b></div>}
          </div>

          {fert.recipe && (
            <>
              <h4 className="ws-subhead">Recipe</h4>
              <ul className="meta-list">
                {fert.recipe.ingredients.map((ing) => (
                  <li key={ing.id}>{ing.qty}× {INGREDIENT_LABEL[ing.id]}</li>
                ))}
                <li>→ produces {fert.recipe.outputs}</li>
              </ul>
            </>
          )}

          {uniqueIngredients.length > 0 && (
            <>
              <h4 className="ws-subhead">Ingredient gold value</h4>
              <div className="ingredient-overrides">
                {uniqueIngredients.map((id) => (
                  <label key={id} className="ingredient-row">
                    <span>{INGREDIENT_LABEL[id]}</span>
                    <input
                      type="number"
                      min={0}
                      value={ingredientCosts[id]}
                      onChange={(e) =>
                        setIngredientCosts((cur) => ({
                          ...cur,
                          [id]: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </>
          )}
        </article>

        <article className="ws-card">
          <h3>Comparison</h3>
          {cheapest && (
            <div className="ws-best">
              <span className="best-label">Cheapest</span>
              <b>{cheapest.label}</b>
              <span>· {gold(cheapest.totalGold)} total · {gold(cheapest.perUnit)}/unit</span>
            </div>
          )}
          <ul className="ws-options">
            {options.map((o, i) => (
              <li key={i} className={'ws-option' + (o === cheapest ? ' is-best' : '')}>
                <div className="ws-option-head">
                  <b>{o.label}</b>
                  <span>
                    {o.currency
                      ? `${o.totalGold.toLocaleString()} ${o.currency}`
                      : `${gold(o.totalGold)} total`}
                  </span>
                </div>
                <div className="ws-option-sub">
                  {!o.currency && <>{gold(o.perUnit)}/unit</>}
                  {o.batches !== undefined && (
                    <> · {o.batches} batch{o.batches === 1 ? '' : 'es'} → {o.produced} produced
                       {o.excess && o.excess > 0 ? ` (${o.excess} extra)` : ''}</>
                  )}
                  {o.notes && <> · {o.notes}</>}
                </div>
                {o.ingredients && (
                  <ul className="ws-ingredients">
                    {o.ingredients.map((t) => (
                      <li key={t.id}>{t.qty}× {INGREDIENT_LABEL[t.id]} <span>· {gold(t.cost)}</span></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <p className="note-line">
            Cost model is gold-value: crafted cost = ingredient gold value × required quantity.
            Non-gold trades (Cinder Shard etc.) are listed separately and not compared on price.
          </p>
        </article>
      </div>
    </section>
  );
}
