import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

export function useSpeech() {
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const liveIntervalRef = useRef(null);
  const isChunkTranscribingRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const listeningRef = useRef(false);

  const [mode, setMode] = useState('speech');
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    finalTranscriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (Recognition) {
      setMode('speech');
      setSupported(true);
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onresult = (event) => {
        let interimText = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) {
            const piece = result[0].transcript.trim();
            if (piece) {
              finalTranscriptRef.current = `${finalTranscriptRef.current}${finalTranscriptRef.current ? ' ' : ''}${piece}`;
            }
          } else {
            interimText += result[0].transcript;
          }
        }
        const combined = `${finalTranscriptRef.current}${interimText ? (finalTranscriptRef.current ? ' ' : '') + interimText.trim() : ''}`.trim();
        setTranscript(combined);
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setListening(false);
          listeningRef.current = false;
          setError('Microphone access was denied. You can type your explanation instead.');
        } else if (event.error !== 'no-speech') {
          console.warn('SpeechRecognition error:', event.error);
        }
      };

      recognition.onend = () => {
        if (listeningRef.current) {
          try {
            recognition.start();
          } catch (_) {}
        } else {
          setListening(false);
        }
      };

      recognitionRef.current = recognition;
      return () => {
        try {
          recognition.stop();
        } catch (_) {}
        recognitionRef.current = null;
      };
    } else if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
      setMode('recorder');
      setSupported(true);
    }
  }, []);

  const start = useCallback(async () => {
    setError('');
    listeningRef.current = true;
    setListening(true);

    if (mode === 'speech' && recognitionRef.current) {
      try {
        finalTranscriptRef.current = transcript;
        recognitionRef.current.start();
      } catch (startError) {
        if (startError.name !== 'InvalidStateError') {
          setError('Voice input could not start. You can type your explanation instead.');
        }
      }
    } else if (mode === 'recorder') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audioChunksRef.current = [];

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;

        // Periodic live transcription updates while speaking in browsers without native SpeechRecognition (every 4s)
        window.clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = window.setInterval(async () => {
          if (!listeningRef.current || isChunkTranscribingRef.current || !mediaRecorderRef.current) return;
          if (mediaRecorderRef.current.state === 'recording') {
            try {
              mediaRecorderRef.current.requestData();
            } catch (_) {}
          }
          if (audioChunksRef.current.length < 2) return;
          const blobType = (mediaRecorderRef.current.mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
          const currentBlob = new Blob(audioChunksRef.current, { type: blobType });
          if (currentBlob.size < 2000) return;

          isChunkTranscribingRef.current = true;
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              if (!listeningRef.current) return;
              const res = await api.post('/transcribe', { audio: reader.result, mimetype: blobType });
              if (res?.transcript && res.transcript.trim() && listeningRef.current) {
                setTranscript(res.transcript.trim());
              }
            } catch (err) {
              console.debug('Live transcribe tick skipped:', err?.message);
            } finally {
              isChunkTranscribingRef.current = false;
            }
          };
          reader.readAsDataURL(currentBlob);
        }, 4000);

      } catch (err) {
        setListening(false);
        listeningRef.current = false;
        setError('Microphone access denied or unavailable. You can type your explanation instead.');
      }
    }
  }, [mode, transcript]);

  const stop = useCallback(async () => {
    listeningRef.current = false;
    setListening(false);
    window.clearInterval(liveIntervalRef.current);

    if (mode === 'speech') {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
    } else if (mode === 'recorder' && mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      if (recorder.state !== 'inactive') {
        setIsProcessing(true);
        recorder.onstop = async () => {
          try {
            const blobType = (recorder.mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
            const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
            if (audioBlob.size < 500) {
              setError('Recording was too short. Speak your thoughts and click Stop when done.');
              setIsProcessing(false);
              return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
              try {
                const base64Data = reader.result;
                const result = await api.post('/transcribe', { audio: base64Data, mimetype: blobType });
                if (result?.transcript && result.transcript.trim()) {
                  setTranscript(result.transcript.trim());
                  setError('');
                } else if (!finalTranscriptRef.current) {
                  setError('No clear speech was detected. You can speak again or type directly.');
                }
              } catch (e) {
                console.warn('Transcription error:', e);
                setError(e?.message || 'Could not transcribe audio. You can type or edit your explanation.');
              } finally {
                setIsProcessing(false);
              }
            };
            reader.readAsDataURL(audioBlob);
          } catch (e) {
            console.error('Recording processing error:', e);
            setIsProcessing(false);
          } finally {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        };
        try {
          if (recorder.state === 'recording') recorder.requestData();
        } catch (_) {}
        recorder.stop();
      }
    }
  }, [mode]);

  const clear = useCallback(() => {
    window.clearInterval(liveIntervalRef.current);
    finalTranscriptRef.current = '';
    setTranscript('');
    setError('');
  }, []);

  return {
    mode,
    supported,
    listening,
    isProcessing,
    error,
    transcript,
    setTranscript,
    start,
    stop,
    clear,
  };
}
