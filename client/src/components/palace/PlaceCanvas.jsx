import { useRef } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import FlagMarker from './FlagMarker.jsx';

export default function PlaceCanvas({ place, addMode, flags, selectedFlag, onSelectFlag, onDraft }) {
  const imageRef = useRef(null);
  const pointerStart = useRef(null);

  function handlePointerDown(event) {
    if (!addMode || event.target.closest('[data-flag-marker]')) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!addMode || !start || event.target.closest('[data-flag-marker]')) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    onDraft({ x, y });
  }

  return (
    <section aria-label={`${place.name} image and flags`} className="min-w-0 flex-1">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {addMode ? 'Tap a spot on the photo to add a flag.' : 'Pinch or use controls to zoom. Select a flag to view it.'}
        </p>
      </div>
      <TransformWrapper minScale={1} maxScale={5} centerOnInit>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="mb-2 flex justify-end gap-1">
              <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomIn()} className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-paper"><ZoomIn size={18} /></button>
              <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomOut()} className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-paper"><ZoomOut size={18} /></button>
              <button type="button" aria-label="Reset zoom" title="Reset zoom" onClick={() => resetTransform()} className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-paper"><RotateCcw size={17} /></button>
            </div>
            <TransformComponent
              wrapperClass="!h-auto !max-h-[70vh] !w-full overflow-hidden rounded-2xl bg-slate-200"
              contentClass="!h-auto !w-full"
            >
              <div
                className={`relative w-full select-none ${addMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
              >
                <img
                  ref={imageRef}
                  src={place.imageUrl}
                  alt={`${place.name} overview`}
                  draggable="false"
                  className="block h-auto w-full"
                />
                {flags.map((flag) => (
                  <FlagMarker
                    key={flag.id}
                    flag={flag}
                    selected={selectedFlag?.id === flag.id}
                    onClick={onSelectFlag}
                  />
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </section>
  );
}