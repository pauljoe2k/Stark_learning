import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import type { FlagRecord } from '../../api';
import { FlagMarker } from './FlagMarker';

export interface FlagPosition {
  x: number;
  y: number;
}

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  kind: 'add' | 'drag';
  flagId?: number;
}

interface PlaceCanvasProps {
  imageUrl: string;
  imageAlt: string;
  flags: FlagRecord[];
  selectedFlagId: number | null;
  addMode: boolean;
  onDraftPosition: (position: FlagPosition) => void;
  onSelectFlag: (flagId: number) => void;
  onReposition: (flagId: number, position: FlagPosition) => void;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function PlaceCanvas({
  imageUrl,
  imageAlt,
  flags,
  selectedFlagId,
  addMode,
  onDraftPosition,
  onSelectFlag,
  onReposition,
}: PlaceCanvasProps) {
  const canvasRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const suppressClickRef = useRef(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [draggedPosition, setDraggedPosition] = useState<{ id: number; x: number; y: number } | null>(null);

  const updateImageSize = useCallback(() => {
    const image = imageRef.current;
    const wrapper = canvasRef.current?.querySelector('.place-transform-wrapper');
    if (!image?.naturalWidth || !image.naturalHeight || !wrapper) return;
    const scale = Math.min(
      wrapper.clientWidth / image.naturalWidth,
      wrapper.clientHeight / image.naturalHeight,
      1,
    );
    if (scale > 0) {
      setImageSize({
        width: Math.round(image.naturalWidth * scale),
        height: Math.round(image.naturalHeight * scale),
      });
    }
  }, []);

  useEffect(() => {
    const wrapper = canvasRef.current?.querySelector('.place-transform-wrapper');
    if (!wrapper) return;
    const observer = new ResizeObserver(updateImageSize);
    observer.observe(wrapper);
    updateImageSize();
    return () => observer.disconnect();
  }, [imageUrl, updateImageSize]);

  function positionFromEvent(event: PointerEvent<HTMLDivElement>): FlagPosition | null {
    const image = imageRef.current;
    if (!image) return null;
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  }

  function startBackgroundGesture(event: PointerEvent<HTMLDivElement>): void {
    if (!addMode || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      kind: 'add',
    };
  }

  function startFlagGesture(flag: FlagRecord, event: PointerEvent<HTMLButtonElement>): void {
    if (event.button !== 0) return;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      kind: 'drag',
      flagId: flag.id,
    };
    setDraggedPosition({ id: flag.id, x: flag.x, y: flag.y });
  }

  function moveGesture(event: PointerEvent<HTMLDivElement>): void {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 6) {
      gesture.moved = true;
    }
    if (gesture.kind === 'drag' && gesture.moved && gesture.flagId !== undefined) {
      const position = positionFromEvent(event);
      if (position) setDraggedPosition({ id: gesture.flagId, ...position });
    }
  }

  function endGesture(event: PointerEvent<HTMLDivElement>): void {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (!gesture.moved) {
      if (gesture.kind === 'add' && addMode) {
        const position = positionFromEvent(event);
        if (position) onDraftPosition(position);
      }
      setDraggedPosition(null);
      return;
    }
    if (gesture.kind === 'drag' && gesture.flagId !== undefined) {
      const position = positionFromEvent(event);
      if (position) onReposition(gesture.flagId, position);
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
    setDraggedPosition(null);
  }

  return (
    <section ref={canvasRef} className={`place-canvas${addMode ? ' add-mode' : ''}`} aria-label="Place photo and flags">
      <div className="canvas-toolbar" aria-label="Photo zoom controls">
        <span>{addMode ? 'Tap a spot to place a flag' : 'Pinch, scroll, or drag to explore'}</span>
      </div>
      <TransformWrapper
        initialScale={1}
        minScale={0.75}
        maxScale={5}
        centerOnInit
        limitToBounds
        doubleClick={{ mode: 'toggle', step: 2, animationTime: 220 }}
        wheel={{ step: 0.12 }}
        panning={{ velocityDisabled: true, excluded: ['flag-marker'] }}
        pinch={{ step: 5, allowPanning: true }}
        keyboard={{ disabled: false }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="canvas-zoom-controls" aria-label="Zoom controls">
              <button type="button" onClick={() => zoomIn()} aria-label="Zoom in"><Plus size={17} /></button>
              <button type="button" onClick={() => zoomOut()} aria-label="Zoom out"><Minus size={17} /></button>
              <button type="button" onClick={() => resetTransform()} aria-label="Reset zoom and position"><RotateCcw size={16} /></button>
            </div>
            <TransformComponent
              wrapperClass="place-transform-wrapper"
              contentClass="place-transform-content"
              wrapperStyle={{ width: '100%', height: 'min(68vh, 680px)' }}
              contentStyle={{ width: '100%' }}
            >
              <div
                className="place-image-layer"
                style={imageSize ? { width: imageSize.width, height: imageSize.height } : undefined}
                onPointerDown={startBackgroundGesture}
                onPointerMove={moveGesture}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={imageAlt}
                  draggable={false}
                  onLoad={updateImageSize}
                  onDragStart={(event) => event.preventDefault()}
                />
                {flags.map((flag) => {
                  const position = draggedPosition?.id === flag.id ? draggedPosition : flag;
                  return (
                    <FlagMarker
                      key={flag.id}
                      x={position.x}
                      y={position.y}
                      title={flag.title}
                      emoji={flag.emoji}
                      selected={selectedFlagId === flag.id}
                      onPointerDown={(event) => startFlagGesture(flag, event)}
                      onSelect={() => {
                        if (suppressClickRef.current) {
                          suppressClickRef.current = false;
                          return;
                        }
                        onSelectFlag(flag.id);
                      }}
                    />
                  );
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </section>
  );
}
