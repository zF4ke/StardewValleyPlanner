import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_STATE,
  LogField,
  MATERIALS,
  MaterialKey,
  PriceYear,
  RECIPES,
  SPRINKLER_TYPES,
  SprinklerType,
  buyGap,
  krobusGap,
  loadSprinklerState,
  makeId,
  materialsFor,
  parseImport,
  saveSprinklerState,
  summarize,
} from '../data/sprinklerState';
import { Icon } from './Icon';

const gold = (n: number) => `${Math.round(n).toLocaleString()}g`;
const num = (n: number) => Math.round(n).toLocaleString();
const clamp = (x: number) => Math.max(0, Math.floor(x));

const META = new Map(MATERIALS.map((m) => [m.key, m]));

export function SprinklerTracker() {
  const [state, setState] = useState(() => loadSprinklerState());
  const [priceYear, setPriceYear] = useState<PriceYear>('y1');
  const [logLabel, setLogLabel] = useState('');
  const [logGains, setLogGains] = useState<Partial<Record<LogField, number>>>({});

  useEffect(() => {
    const t = window.setTimeout(() => saveSprinklerState(state), 250);
    return () => window.clearTimeout(t);
  }, [state]);

  // One-time import helper: run importSprinklerData('{...}') in the browser console.
  useEffect(() => {
    const w = window as unknown as { importSprinklerData?: (raw: string | object) => unknown };
    w.importSprinklerData = (raw) => {
      try {
        const next = parseImport(raw);
        setState(next);
        // eslint-disable-next-line no-console
        console.log('✅ Sprinkler data imported.', next);
        return next;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('❌ Sprinkler import failed:', err);
        return undefined;
      }
    };
    return () => { delete w.importSprinklerData; };
  }, []);

  const s = useMemo(() => summarize(state), [state]);
  const gap = buyGap(s.clintNeed, priceYear);
  const krobus = krobusGap(s.remaining);
  const pct = s.goal > 0 ? Math.min(100, (s.built / s.goal) * 100) : 0;
  const recipe = s.recipe;

  const relevant = useMemo(() => materialsFor(state.type), [state.type]);

  const logFields = useMemo(() => {
    const fields: Array<{ key: LogField; label: string; emoji: string }> = [
      { key: 'built', label: recipe.label, emoji: recipe.emoji },
    ];
    for (const key of relevant) {
      const m = META.get(key)!;
      fields.push({ key, label: m.label, emoji: m.emoji });
    }
    return fields;
  }, [relevant, recipe]);

  const fieldMeta = (k: LogField, builtType: SprinklerType = state.type) =>
    k === 'built'
      ? { emoji: RECIPES[builtType].emoji, label: RECIPES[builtType].label }
      : META.get(k as MaterialKey)!;

  const setType = (type: SprinklerType) => setState((cur) => ({ ...cur, type }));
  const setGoal = (v: string) => setState((cur) => ({ ...cur, goal: clamp(Number(v) || 0) }));
  const setBuilt = (v: string) =>
    setState((cur) => ({ ...cur, built: { ...cur.built, [cur.type]: clamp(Number(v) || 0) } }));
  const setMat = (key: MaterialKey, v: string) =>
    setState((cur) => ({ ...cur, mats: { ...cur.mats, [key]: clamp(Number(v) || 0) } }));

  const setLogGain = (key: LogField, v: string) =>
    setLogGains((cur) => ({ ...cur, [key]: clamp(Number(v) || 0) }));

  // Adding a log line records the haul AND folds it into your current totals.
  const addLog = (e: FormEvent) => {
    e.preventDefault();
    const gains: Partial<Record<LogField, number>> = {};
    for (const f of logFields) {
      const v = clamp(logGains[f.key] ?? 0);
      if (v) gains[f.key] = v;
    }
    if (Object.keys(gains).length === 0 && !logLabel.trim()) return;

    setState((cur) => {
      const mats = { ...cur.mats };
      const built = { ...cur.built };
      for (const [k, v] of Object.entries(gains)) {
        if (k === 'built') built[cur.type] = clamp(built[cur.type] + (v as number));
        else mats[k as MaterialKey] = clamp(mats[k as MaterialKey] + (v as number));
      }
      const entry = {
        id: makeId(),
        label: logLabel.trim() || `Entry ${cur.logs.length + 1}`,
        gains,
        ...(gains.built ? { builtType: cur.type } : {}),
      };
      return { ...cur, mats, built, logs: [...cur.logs, entry] };
    });
    setLogLabel('');
    setLogGains({});
  };

  // Removing a log line rolls its amounts back out of your totals.
  const removeLog = (id: string) =>
    setState((cur) => {
      const entry = cur.logs.find((l) => l.id === id);
      if (!entry) return cur;
      const mats = { ...cur.mats };
      const built = { ...cur.built };
      const builtType = entry.builtType ?? cur.type;
      for (const [k, v] of Object.entries(entry.gains)) {
        if (k === 'built') built[builtType] = clamp(built[builtType] - (v as number));
        else mats[k as MaterialKey] = clamp(mats[k as MaterialKey] - (v as number));
      }
      return { ...cur, mats, built, logs: cur.logs.filter((l) => l.id !== id) };
    });

  const reset = () => {
    if (!window.confirm('Reset the sprinkler tracker to zero? This also clears your log.')) return;
    setState({ ...structuredClone(DEFAULT_STATE), type: state.type });
  };

  const stillNeeded = s.cards.filter((c) => c.key !== 'built' && c.remaining > 0);

  return (
    <>
      <section className="panel sprink-hero">
        <div className="sprink-types" role="group" aria-label="Sprinkler type">
          {SPRINKLER_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className="sprink-type"
              data-active={state.type === t}
              onClick={() => setType(t)}
            >
              <Icon emoji={RECIPES[t].emoji} /> {RECIPES[t].label}
            </button>
          ))}
        </div>

        <div className="sprink-hero-main">
          <div className="sprink-inputs">
            <label className="sprink-field">
              <span>Goal</span>
              <input type="number" min={0} value={state.goal} onChange={(e) => setGoal(e.target.value)} />
            </label>
            <label className="sprink-field">
              <span>Built</span>
              <input type="number" min={0} value={state.built[state.type]} onChange={(e) => setBuilt(e.target.value)} />
            </label>
          </div>

          <div className="sprink-progress">
            <div className="sprink-progress-top">
              <span><Icon emoji={recipe.emoji} /> {num(s.built)} / {num(s.goal)} built</span>
              <b>{pct.toFixed(0)}%</b>
            </div>
            <div className="sprink-barwrap">
              <div className={'sprink-bar' + (s.done ? ' is-full' : '')} style={{ width: `${pct}%` }} />
            </div>
            <p className="sprink-note">
              {s.done ? (
                <>
                  <Icon emoji={recipe.emoji} /> Goal reached. {num(s.goal * recipe.tiles)} tiles watered.
                </>
              ) : s.craftableNow > 0 ? (
                <>
                  {num(s.craftableNow)} craftable now from stock.
                  <span>{num(s.goal * recipe.tiles)} tiles at goal.</span>
                </>
              ) : (
                <>
                  Not enough refined materials to craft another yet.
                  <span>{num(s.goal * recipe.tiles)} tiles at goal.</span>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="sprink-h2"><Icon emoji="🎒" /> Your materials</h2>
        <div className="sprink-mats">
          {relevant.map((key) => {
            const meta = META.get(key)!;
            return (
              <label key={key} className="sprink-mat">
                <span><Icon emoji={meta.emoji} /> {meta.label}</span>
                <input type="number" min={0} value={state.mats[key]} onChange={(e) => setMat(key, e.target.value)} />
              </label>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2 className="sprink-h2"><Icon emoji="🧮" /> Still needed</h2>
        <div className="sprink-section-body">
          {s.done ? (
            <p className="sprink-empty"><Icon emoji={recipe.emoji} /> Nothing left to gather. You've hit your goal.</p>
          ) : stillNeeded.length === 0 ? (
            <p className="sprink-empty">
              You already have the raw materials. Smelt and craft {num(s.remaining)} more.
            </p>
          ) : (
            <div className="sprink-cards">
              {stillNeeded.map((c) => {
                const fill = c.target > 0 ? Math.min(100, (c.owned / c.target) * 100) : 0;
                return (
                  <div key={c.key} className="sprink-card">
                    <div className="sprink-card-fill" style={{ width: `${fill}%` }} aria-hidden />
                    <div className="sprink-card-body">
                      <div className="sprink-card-head">
                        <Icon emoji={c.emoji} /> <span>{c.label}</span>
                      </div>
                      <div className="sprink-card-nums">
                        <span className="sprink-card-have">{num(c.owned)} / {num(c.target)}</span>
                        <span className="sprink-card-need">{num(c.remaining)} left</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!s.done && (
            <div className="sprink-cost">
              <div className="sprink-cost-line">
                Clint cost for ore and coal still missing: <b>{gold(gap)}</b>
                <span className="sprink-cost-hint">(Quartz, Iridium Ore &amp; Battery Packs aren't sold by Clint)</span>
              </div>
              <div className="sprink-toggle" role="group" aria-label="Clint price year">
                <button type="button" data-active={priceYear === 'y1'} onClick={() => setPriceYear('y1')}>Year 1</button>
                <button type="button" data-active={priceYear === 'y2'} onClick={() => setPriceYear('y2')}>Year 2+</button>
              </div>
              {state.type === 'iridium' && (
                <div className="sprink-cost-line">
                  Or buy the remaining {num(s.remaining)} from Krobus: <b>{gold(krobus)}</b>
                  <span className="sprink-cost-hint">(10,000g each, Fridays)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="sprink-h2"><Icon emoji="📒" /> Daily log</h2>
        <form className="sprink-log-form" onSubmit={addLog}>
          <input
            className="sprink-log-label"
            type="text"
            placeholder="Label (e.g. Fall 11)"
            value={logLabel}
            onChange={(e) => setLogLabel(e.target.value)}
          />
          <div className="sprink-log-grid">
            {logFields.map((f) => (
              <label key={f.key} className="sprink-log-input">
                <span><Icon emoji={f.emoji} /> {f.label}</span>
                <input
                  type="number"
                  min={0}
                  value={logGains[f.key] ?? ''}
                  onChange={(e) => setLogGain(f.key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <button type="submit" className="sp-btn sp-btn-save">Add to log</button>
        </form>

        {state.logs.length === 0 ? (
          <p className="sprink-empty sprink-log-empty">No entries yet. Record what you gather each day.</p>
        ) : (
          <ul className="sprink-log-list">
            {[...state.logs].reverse().map((entry) => {
              const gains = Object.entries(entry.gains).filter(([, v]) => (v ?? 0) > 0);
              return (
                <li key={entry.id} className="sprink-log-row">
                  <span className="sprink-log-rowlabel">{entry.label}</span>
                  <span className="sprink-log-gains">
                    {gains.length === 0 ? (
                      <span className="sprink-log-none">No materials</span>
                    ) : (
                      gains.map(([k, v]) => {
                          const meta = fieldMeta(k as LogField, entry.builtType);
                        return (
                          <span key={k} className="sprink-log-chip" title={meta.label}>
                            <Icon emoji={meta.emoji} /> {num(v as number)}
                          </span>
                        );
                      })
                    )}
                  </span>
                  <button
                    type="button"
                    className="sprink-log-remove"
                    aria-label={`Remove ${entry.label}`}
                    onClick={() => removeLog(entry.id)}
                  >×</button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="sprink-actions">
          <button className="sp-btn sp-btn-danger" onClick={reset}>Reset tracker</button>
        </div>
      </section>
    </>
  );
}
