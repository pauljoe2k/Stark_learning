import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  MapPin, 
  ArrowLeft, 
  Sparkles,
  Camera
} from 'lucide-react';

export default function PalaceNewPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [preview, setPreview] = useState(null);

  const samplePhotos = [
    { name: "My Studio Apartment", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800" },
    { name: "Science Library 2nd Floor", url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=800" },
    { name: "Favorite Coffee Corner", url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800" },
  ];

  const handleSelectSample = (sample) => {
    setName(sample.name);
    setPreview(sample.url);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    navigate('/palace/1');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <button
        onClick={() => navigate('/palace')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Palaces
      </button>

      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Create a New Memory Palace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a place you know like the back of your hand (bedroom, campus walk, desk).
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
        <div>
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
            Place Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. My Bedroom & Study Desk"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
            Place Photo
          </label>
          
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden h-56 border border-border">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="absolute top-2 right-2 px-3 py-1 rounded-xl bg-card/90 backdrop-blur-md text-xs font-bold text-danger border border-border shadow-sm"
              >
                Change Photo
              </button>
            </div>
          ) : (
            <div
              onClick={() => setPreview(samplePhotos[0].url)}
              className="border-2 border-dashed border-border hover:border-primary/50 bg-background rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-2 transition-colors"
            >
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-foreground">Upload your room photo or snap a picture</p>
              <p className="text-[11px] text-muted-foreground">JPG, PNG (wide angle works best)</p>
            </div>
          )}
        </div>

        {/* Quick Sample Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Or choose a starter template:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {samplePhotos.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectSample(s)}
                className="p-2 bg-background border border-border hover:border-primary/50 rounded-xl text-left text-xs font-semibold text-foreground flex items-center gap-2 group transition-all"
              >
                <img src={s.url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                <span className="truncate group-hover:text-primary">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/palace')}
            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
          >
            Create Memory Palace
          </button>
        </div>
      </form>
    </div>
  );
}

