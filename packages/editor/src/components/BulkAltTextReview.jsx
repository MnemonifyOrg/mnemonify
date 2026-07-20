import { useState } from 'react';

// Phase 4.6 Step 9: the "Review all" screen reached from Step 8's grouped
// "N images missing alt text" Course Health finding. Operates directly on
// course.assets (kind: 'image') rather than walking blocks -- alt text
// lives on the shared asset, so fixing it here resolves the finding
// regardless of which block(s) reference that asset (a plain image block
// or a carousel slide).
//
// The list of assets to review is captured ONCE via the useState
// initializer, not re-derived from the live `assets` prop on every render.
// If it were re-filtered live, an asset would vanish from the list the
// instant its alt text became non-empty -- yanking focus out from under
// the author mid-keystroke. Instead each row looks up its OWN current
// value from the live `assets` prop (so the input always reflects real
// state) while staying in the list, showing a checkmark once done, until
// the whole screen is closed.
export default function BulkAltTextReview({ assets, onUpdateCourseAsset, onClose }) {
  const [items] = useState(() => (assets || []).filter((a) => a.kind === 'image' && !a.alt?.trim()));
  const byId = new Map((assets || []).map((a) => [a.asset_id, a]));
  const remaining = items.filter((it) => !(byId.get(it.asset_id)?.alt || '').trim()).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <h2>Review missing alt text</h2>
        <p className="settings-panel__hint">
          {remaining === 0
            ? 'All images now have alt text.'
            : `${remaining} of ${items.length} image${items.length === 1 ? '' : 's'} still ${remaining === 1 ? 'needs' : 'need'} alt text.`}
        </p>
        <ul className="alt-text-review__list">
          {items.map((item) => {
            const asset = byId.get(item.asset_id) || item;
            const done = !!asset.alt?.trim();
            return (
              <li
                key={item.asset_id}
                className={done ? 'alt-text-review__row alt-text-review__row--done' : 'alt-text-review__row'}
              >
                <img className="alt-text-review__thumb" src={`/${asset.src}`} alt="" />
                <div className="alt-text-review__caption">
                  <span className="alt-text-review__field-label">Caption</span>
                  <span className="alt-text-review__caption-text">{asset.caption?.trim() || '(none)'}</span>
                </div>
                <div className="alt-text-review__alt">
                  <label className="alt-text-review__field-label" htmlFor={`alt-text-${item.asset_id}`}>
                    Alt text
                  </label>
                  <input
                    id={`alt-text-${item.asset_id}`}
                    className="input"
                    placeholder="Describe this image..."
                    value={asset.alt || ''}
                    onChange={(e) => onUpdateCourseAsset(item.asset_id, { alt: e.target.value })}
                  />
                </div>
                {done && (
                  <span className="alt-text-review__check" aria-label="Done">
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
