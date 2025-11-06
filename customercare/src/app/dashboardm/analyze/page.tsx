'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/app/services/axios';
import {useIDContext} from '@/app/context/booleancontext';


// Tell TypeScript about the global Recorder from recorder.js
declare var Recorder: any;

export default function EmotionSentimentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<any>(null);
  const intervalRef = useRef<number>();

  const [callId, setCallId] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const {getOrgname}=useIDContext();
  const orgname= getOrgname();
const callIdRef = useRef<number | null>(null);
  // Load recorder.js script and verify auth
  useEffect(() => {
    // Load recorder.js from public folder
    const script = document.createElement('script');
    script.src = '/recorder.js';
    script.async = true;
    document.body.appendChild(script);

    // Verify auth
    api.get('/auth/verify-token/', { withCredentials: true }).catch(() => {
      router.push('/loginm/');
    });

    return () => {
      document.body.removeChild(script);
    };
  }, [router]);

  useEffect(() => {
  callIdRef.current = callId;
}, [callId]);

  // Capture a single frame from video as JPEG
  const captureImage = () => {
    const video = videoRef.current!;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg');
  };

  // Set up recorder.js with the user's mic stream
  const setupRecorderJS = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const input = audioContext.createMediaStreamSource(stream);
    const recorder = new Recorder(input, { numChannels: 1 });
    recorderRef.current = recorder;
  };

  // Send a single 2-second chunk of audio + current video frame to the backend
  const sendChunk = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    recorder.clear();
    recorder.record();
    const currentCallId = callIdRef.current;
    if (!currentCallId) return;
    setTimeout(() => {
      recorder.stop();

      recorder.exportWAV(async (blob: Blob) => {
        const image = captureImage();
        const formData = new FormData();
        formData.append('audio', blob, 'audio.wav');
        formData.append('image', image);
        const audioURL = URL.createObjectURL(blob);
        const audio = new Audio(audioURL);
        try {
          const res = await api.post(
            `/analysis/${currentCallId}/chunk/`,
            formData,
            {
              withCredentials: true,
              headers: { 'Content-Type': 'multipart/form-data' },
            }
          );
          setEmotion(res.data.serializer.emotion);
          setSentiment(res.data.serializer.employee_sentiment);
          setPrompt(res.data.response);
        } catch (err: any) {
          console.error(err);
        }
      });
    }, 8000);
  };

  const sendnotification = async () => {
    try {
      const res = await api.post(
        '/sendnotification/',
        {},
        { withCredentials: true }
      );
    } catch (error: any) {
      setEmotion(error.response?.data?.detail || error.message);
    }
  };


  // Start call, access webcam/mic, begin chunk loop
  const handleListen = async () => {
    setLoading(true);
    setError(null);
    setEmotion(null);
    setSentiment(null);

    try {
      const res = await api.post(
        '/analysis/start/',
        { customer: 'CustomerName',
         orgname: orgname },
        { withCredentials: true }
      );
      setCallId(res.data.id);
    } catch (err: any) {
      setError('Failed to start call');
      setLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      videoRef.current!.srcObject = stream;
      await new Promise((resolve) => (videoRef.current!.onloadedmetadata = resolve));
      setupRecorderJS(stream);
    } catch {
      setError('Cannot access webcam or mic');
      setLoading(false);
      return;
    }

    setListening(true);
    setLoading(false);
    intervalRef.current = window.setInterval(sendChunk, 10000);
  };

  // Stop everything
  const handleStop = async () => {
    clearInterval(intervalRef.current);
    setListening(false);

    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (callId) {
      try {
          const res = await api.post(
          `/analysis/${callId}/end/`,
          {},
          { withCredentials: true }
        );
        console.log(res.data);

        setPrompt(res.data.response)
      } catch (err) {
        console.error('Error ending call', err);
      }
    }
  };

  return (
    <div className="flex flex-col items-center p-6 space-y-4">
      <h1 className="text-2xl font-bold">Emotion & Sentiment Analyzer</h1>

      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full max-w-md rounded shadow bg-black"
      />

      {!listening ? (
        <button
          onClick={handleListen}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Initializing…' : 'Listen'}
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Stop Listening
        </button>
      )}

      <button
        onClick={sendChunk}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Get Emotion for {callId && callId}
      </button>
      <button
        onClick={sendnotification}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Send Notification {callId && callId}
      </button>
      {error && <p className="text-red-600">{error}</p>}
      {emotion && (
        <p className="text-lg">
          <strong>Emotion:</strong> {emotion}
        </p>
      )}
      {sentiment && (
        <p className="text-lg">
          <strong>Sentiment:</strong> {sentiment}
        </p>
      )}
      {prompt && (
        <p className="text-lg">
          <strong>Prompt:</strong> {prompt}
        </p>
      )}
    </div>
  );
}
