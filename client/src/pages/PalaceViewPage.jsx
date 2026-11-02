import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { 
  MapPin, 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  X, 
  Edit3, 
  Trash2, 
  BrainCircuit, 
  ArrowLeft,
  Sparkles,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PalaceViewPage() {
  const { placeId } = useParams();
  const navigate = useNavigate();

  // Mock Place
  const [place, setPlace] = useState({
    id: placeId || 1,
    name: "Alex's Studio Apartment",
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1600",
    flags: [
      {
        id: 101,
        x: 28,
        y: 42,
        title: "Front Door: Resting Potential (-70mV)",
        topic: "Action Potential",
        keyPoint: "Na+/K+ ATPase and leak channels establish negative resting polarity",
        emoji: "🚪",
        note: "Imagine 3 sodium ions flying out and 2 potassium ions entering the keyhole."
      },
      {
        id: 102,
        x: 64,
        y: 35,
        title: "Kitchen Counter: Rapid Na+ Influx",
        topic: "Action Potential",
        keyPoint: "Threshold stimulus (-55mV) triggers voltage-gated Na+ channels",
        emoji: "⚡",
        note: "Electric sparks pouring over the countertop as gates swing open."
      },
      {
        id: 103,
        x: 80,
        y: 68,
        title: "Living Room Rug: Saltatory Conduction",
        topic: "Cellular Neuroscience",
        keyPoint: "Myelin sheaths and Nodes of Ranvier leapfrog impulses",
        emoji: "🏃",
        note: "Hopping between the circular patterns on the rug without touching the gaps."
      }
    ]
  });

  const [activeFlag, setActiveFlag] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [newFlagCoord, setNewFlagCoord] = useState(null);

  // New flag form state
  const [formTitle, setFormTitle] = useState('');
  const [formKeyPoint, setFormKeyPoint] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formEmoji, setFormEmoji] = useState('📍');

  const containerRef = useRef(null);

  const handleImageClick = (e) => {
    if (!isAddMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNewFlagCoord({ x: Math.round(x), y: Math.round(y) });
  };

  const handleSaveFlag = (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !newFlagCoord) return;
    const newFlag = {
      id: Date.now(),
      x: newFlagCoord.x,
      y: newFlagCoord.y,
      title: formTitle,
      topic: "Action Potential",
      keyPoint: formKeyPoint || formTitle,
      note: formNote,
      emoji: formEmoji
    };
    setPlace(prev => ({ ...prev, flags: [...prev.flags, newFlag] }));
    setActiveFlag(newFlag);
    setIsAddMode(false);
    setNewFlagCoord(null);
    setFormTitle('');
    setFormNote('');
  };

  const handleDeleteFlag = (flagId) => {
    setPlace(prev => ({ ...prev, flags: prev.flags.filter(f => f.id !== flagId) }));
    setActiveFlag(null);
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] lg:h-screen w-full flex flex-col bg-background overflow-hidden">
      
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-card/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-border shadow-lg">
          <button
            onClick={() => navigate('/palace')}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Back to Palaces"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xs font-bold text-foreground">{place.name}</h2>
            <p className="text-[10px] text-muted-foreground">{place.flags.length} memory flags pinned</p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => {
              setIsAddMode(!isAddMode);
              if (activeFlag) setActiveFlag(null);
            }}
            className={`px-3.5 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all ${
              isAddMode
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isAddMode ? 'Tap Photo to Place Flag' : 'Add Flag'}</span>
          </button>

          <button
            onClick={() => navigate('/recall')}
            className="px-3.5 py-2 rounded-2xl bg-card/90 backdrop-blur-md border border-border text-foreground font-bold text-xs hover:bg-muted shadow-lg flex items-center gap-1.5"
          >
            <BrainCircuit className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Recall Mode</span>
          </button>
        </div>
      </div>

      {/* Main Pan/Zoom Viewer */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        <TransformWrapper
          initialScale={1}
          minScale={0.8}
          maxScale={4}
          centerOnInit
          wheel={{ step: 0.1 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Floating Zoom Controls */}
              <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-1.5 bg-card/90 backdrop-blur-md p-1 rounded-2xl border border-border shadow-lg">
                <button
                  onClick={() => zoomIn()}
                  aria-label="Zoom in"
                  className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => zoomOut()}
                  aria-label="Zoom out"
                  className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => resetTransform()}
                  aria-label="Reset zoom"
                  className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                <div 
                  ref={containerRef}
                  onClick={handleImageClick}
                  className="relative select-none max-w-full max-h-full inline-block"
                >
                  <img
                    src={place.imageUrl}
                    alt={place.name}
                    className="max-h-[85vh] w-auto object-contain rounded-2xl shadow-2xl pointer-events-auto"
                  />

                  {/* Rendered Flags at X% and Y% */}
                  {place.flags.map((flag) => (
                    <motion.button
                      key={flag.id}
                      initial={{ scale: 0, y: -20 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFlag(flag);
                      }}
                      style={{ left: `${flag.x}%`, top: `${flag.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 group flex items-center gap-1.5 p-1 rounded-full shadow-xl transition-transform hover:scale-125 focus:outline-none ${
                        activeFlag?.id === flag.id
                          ? 'ring-4 ring-primary bg-primary text-primary-foreground scale-110'
                          : 'bg-card/90 backdrop-blur-md border border-border text-foreground hover:bg-card'
                      }`}
                    >
                      <span className="text-base sm:text-lg leading-none p-1">{flag.emoji}</span>
                      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-[10px] font-bold px-1 whitespace-nowrap">
                        {flag.title}
                      </span>
                    </motion.button>
                  ))}

                  {/* Temporary dropped pin preview */}
                  {newFlagCoord && (
                    <div
                      style={{ left: `${newFlagCoord.x}%`, top: `${newFlagCoord.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xl animate-bounce"
                    >
                      📍
                    </div>
                  )}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      {/* SIDE PANEL (Desktop) / BOTTOM SHEET (Mobile) for Flag Detail */}
      <AnimatePresence>
        {activeFlag && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed lg:absolute bottom-0 right-0 lg:top-0 w-full lg:w-96 bg-card/95 backdrop-blur-xl border-t lg:border-l border-border p-6 shadow-2xl z-30 flex flex-col justify-between max-h-[80vh] lg:max-h-full overflow-y-auto"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{activeFlag.emoji}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">
                    Palace Pin #{activeFlag.id}
                  </span>
                </div>
                <button
                  onClick={() => setActiveFlag(null)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">
                  {activeFlag.title}
                </h3>
                <span className="text-xs text-primary font-semibold block mt-0.5">
                  Topic: {activeFlag.topic}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Anchored Key Point:
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {activeFlag.keyPoint}
                </p>
              </div>

              {activeFlag.note && (
                <div className="p-3.5 rounded-2xl bg-accent/40 border border-primary/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground block">
                    Spatial Memory Story:
                  </span>
                  <p className="text-xs text-foreground italic leading-relaxed">
                    "{activeFlag.note}"
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between gap-3 mt-6">
              <button
                onClick={() => handleDeleteFlag(activeFlag.id)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger/10 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <button
                onClick={() => setActiveFlag(null)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD FLAG MODAL FORM */}
      {newFlagCoord && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveFlag}
            className="bg-card border border-border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Pin Concept to Spot ({newFlagCoord.x}%, {newFlagCoord.y}%)
              </h3>
              <button type="button" onClick={() => setNewFlagCoord(null)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Emoji Icon</label>
                <div className="flex gap-2">
                  {['⚡', '🚪', '🏃', '🧬', '🔬', '💡', '🔥'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setFormEmoji(em)}
                      className={`text-lg p-2 rounded-xl border ${
                        formEmoji === em ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Flag Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bed Post: Hyperpolarization"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Key Idea / Gap</label>
                <input
                  type="text"
                  placeholder="The concept to test during recall"
                  value={formKeyPoint}
                  onChange={(e) => setFormKeyPoint(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Vivid Spatial Hook</label>
                <textarea
                  rows={2}
                  placeholder="Make it unusual or funny so it sticks in your memory palace..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewFlagCoord(null)}
                className="px-3.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm"
              >
                Drop Pin
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

