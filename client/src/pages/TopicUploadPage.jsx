import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  FileText, 
  Check, 
  Trash2, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  AlertCircle,
  GripVertical
} from 'lucide-react';

export default function TopicUploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Upload, 2: Key Points Review
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('Photosynthesis: The Light-Dependent Reactions');
  const [summary, setSummary] = useState(
    'Covers photosystems II and I, the splitting of water to produce oxygen, proton gradient establishment across the thylakoid membrane, and ATP synthase phosphorylation.'
  );
  const [keyPoints, setKeyPoints] = useState([
    { id: 1, text: 'Photon absorption excites P680 reaction center in Photosystem II' },
    { id: 2, text: 'Photolysis splits H2O into O2, protons, and replacement electrons' },
    { id: 3, text: 'Plastoquinone transfers electrons through Cytochrome b6f complex' },
    { id: 4, text: 'Proton accumulation inside thylakoid lumen creates electrochemical gradient' },
    { id: 5, text: 'Photosystem I re-energizes electrons at P700 to reduce NADP+ into NADPH' },
    { id: 6, text: 'Chemiosmotic ATP synthesis driven by protons passing through ATP synthase' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newPointText, setNewPointText] = useState('');

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSimulateExtract = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(2);
    }, 1200);
  };

  const handleRemovePoint = (id) => {
    setKeyPoints(keyPoints.filter((kp) => kp.id !== id));
  };

  const handleAddPoint = () => {
    if (!newPointText.trim()) return;
    setKeyPoints([
      ...keyPoints,
      { id: Date.now(), text: newPointText.trim() }
    ]);
    setNewPointText('');
  };

  const handlePointChange = (id, newText) => {
    setKeyPoints(keyPoints.map(kp => kp.id === id ? { ...kp, text: newText } : kp));
  };

  const handleSaveTopic = () => {
    // Navigate to topic detail or explanation
    navigate('/topics/11');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Step {step} of 2 · AI Extraction</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          {step === 1 ? 'Add New Topic Material' : 'Review & Edit AI Key Points'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 1 
            ? 'Upload up to 2 pages of notes or lecture slides. Gemini will extract essential anchor concepts.' 
            : 'Gemini distilled your notes into core testable points. Edit or add missing points before saving.'}
        </p>
      </div>

      {step === 1 ? (
        /* STEP 1: UPLOAD */
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-border hover:border-primary/60 bg-card rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer group flex flex-col items-center justify-center space-y-4 shadow-sm"
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <input
              id="fileInput"
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files && setFile(e.target.files[0])}
            />

            <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <p className="text-sm font-bold text-foreground">
                {file ? file.name : 'Click to select or drag & drop lecture PDF / photos'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, PNG, JPG (maximum 2 pages server-enforced)
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Strict 2-page limit ensures tight, memorable palace journeys</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => navigate('/topics')}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulateExtract}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 flex items-center gap-2 hover:bg-primary/90 transition-all"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Gemini Extracting Key Points...</span>
                </>
              ) : (
                <>
                  <span>Extract Key Points</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* STEP 2: REVIEW & EDIT KEY POINTS */
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Extracted Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Summary
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Key Points ({keyPoints.length} extracted)
              </h3>
              <span className="text-xs text-muted-foreground">Recommended: 5 to 8 points</span>
            </div>

            <div className="space-y-2.5">
              {keyPoints.map((kp, idx) => (
                <div
                  key={kp.id}
                  className="p-3 bg-card border border-border rounded-2xl flex items-center gap-3 group shadow-sm hover:border-primary/40 transition-colors"
                >
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>

                  <input
                    type="text"
                    value={kp.text}
                    onChange={(e) => handlePointChange(kp.id, e.target.value)}
                    className="flex-1 bg-transparent text-xs text-foreground focus:outline-none"
                  />

                  <button
                    onClick={() => handleRemovePoint(kp.id)}
                    className="text-muted-foreground hover:text-danger p-1 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                    title="Remove point"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Key Point row */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Add another key point..."
                value={newPointText}
                onChange={(e) => setNewPointText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPoint()}
                className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleAddPoint}
                className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                Add
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Back to Upload
            </button>
            <button
              onClick={handleSaveTopic}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 flex items-center gap-2 hover:bg-primary/90 transition-all"
            >
              <Check className="w-4 h-4" />
              Save Topic & Go to Teach Back
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

