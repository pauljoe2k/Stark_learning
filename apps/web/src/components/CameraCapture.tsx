import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, RotateCcw, X } from 'lucide-react';

interface CameraCaptureProps {
  disabled?: boolean;
  accept?: string;
  hint?: string;
  onSelect: (file: File) => void;
}

export function CameraCapture({
  disabled = false,
  accept = 'application/pdf,image/*',
  hint = 'PDF, JPEG, PNG or WebP · up to 20 MB · two pages per topic',
  onSelect,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => setCameraError('Camera preview could not start.'));
    return () => { video.srcObject = null; };
  }, [stream]);

  useEffect(() => () => {
    stream?.getTracks().forEach((track) => track.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl, stream]);

  function stopCamera(): void {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  }

  async function startCamera(): Promise<void> {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera capture is not available in this browser. Use the file picker instead.');
      return;
    }
    try {
      setStream(await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      }));
    } catch {
      setCameraError('Camera access was denied or unavailable. You can still choose a file.');
    }
  }

  function chooseFile(file: File | undefined): void {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    stopCamera();
    onSelect(file);
  }

  function captureFrame(): void {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Wait for the camera preview before taking a photo.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('This browser could not capture the camera image.');
      return;
    }
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('The camera image could not be captured. Try again.');
        return;
      }
      const file = new File([blob], `pinpoint-${Date.now()}.jpg`, { type: 'image/jpeg' });
      chooseFile(file);
    }, 'image/jpeg', 0.9);
  }

  return (
    <div className="camera-capture">
      {previewUrl && (
        <div className="camera-preview">
          <img src={previewUrl} alt="Selected study material preview" />
          <button
            type="button"
            className="icon-button preview-clear"
            onClick={() => {
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            aria-label="Clear selected file"
            disabled={disabled}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      )}
      {stream && (
        <div className="camera-preview">
          <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" />
          <div className="camera-controls">
            <button type="button" className="primary-button" onClick={captureFrame} disabled={disabled}>
              <Camera size={17} aria-hidden="true" /> Capture
            </button>
            <button type="button" className="icon-button" onClick={stopCamera} aria-label="Close camera">
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <div className="camera-actions">
        <label className="secondary-button">
          <ImagePlus size={17} aria-hidden="true" /> Choose a file
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept={accept}
            capture="environment"
            disabled={disabled}
            onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
          />
        </label>
        <button type="button" className="secondary-button" onClick={() => void startCamera()} disabled={disabled || Boolean(stream)}>
          <RotateCcw size={17} aria-hidden="true" /> Use camera
        </button>
      </div>
      {cameraError && <p className="form-error" role="alert">{cameraError}</p>}
      <p className="camera-hint">{hint}</p>
    </div>
  );
}
