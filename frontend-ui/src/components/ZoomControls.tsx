import { MAX_ZOOM, MIN_ZOOM } from "../map/usePanZoom";

/** +, − and Fit, for anyone not using a wheel, trackpad or pinch. */
export function ZoomControls({ k, onZoom, onFit }: { k: number; onZoom: (factor: number) => void; onFit: () => void }) {
  return (
    <div className="zoom-controls" role="group" aria-label="Zoom" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="Zoom in" onClick={() => onZoom(1.3)} disabled={k >= MAX_ZOOM - 0.001}>
        <span aria-hidden="true">+</span>
      </button>
      <button type="button" aria-label="Zoom out" onClick={() => onZoom(1 / 1.3)} disabled={k <= MIN_ZOOM + 0.001}>
        <span aria-hidden="true">−</span>
      </button>
      <button type="button" className="zoom-fit" onClick={onFit}>
        Fit
      </button>
    </div>
  );
}
