import { PATCH_NOTES } from '../data/patchNotes';

export function PatchNotes() {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>📜 Patch Notes</h2>
        <span className="summary">Newest first · {PATCH_NOTES.length} releases</span>
      </div>

      <ol className="patch-list">
        {PATCH_NOTES.map((p, i) => (
          <li key={p.version} className={'patch-entry' + (i === 0 ? ' is-latest' : '')}>
            <header className="patch-head">
              <span className="patch-version">{p.version}</span>
              <span className="patch-title">{p.title}</span>
              {i === 0 && <span className="patch-latest-pill">Latest</span>}
            </header>
            <ul className="patch-bullets">
              {p.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
