import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeech() {
  const recognitionRef = useRef(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return undefined;
    setSupported(true);
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText) setTranscript((current) => `${current}${current ? ' ' : ''}${finalText.trim()}`);
      if (interimText) setError(`Listening: ${interimText}`);
      else setError('');
    };
    recognition.onerror = (event) => {
      setListening(false);
      setError(event.error === 'not-allowed' ? 'Microphone access was denied. You can type your explanation instead.' : `Voice input stopped (${event.error}). You can continue by typing.`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError('');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (startError) {
      if (startError.name !== 'InvalidStateError') setError('Voice input could not start. You can type your explanation instead.');
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const clear = useCallback(() => {
    setTranscript('');
    setError('');
  }, []);

  return { supported, listening, error, transcript, setTranscript, start, stop, clear };
}