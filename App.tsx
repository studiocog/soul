import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, SoulProfile } from './types';
import SoulVisualizer from './components/SoulVisualizer';
import { GeminiLiveService } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.LANDING);
  const [profile, setProfile] = useState<SoulProfile>({
    name: '',
    relationship: '',
    personalityContext: ''
  });
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");

  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // --- Handlers ---

  const handleStart = () => setState(AppState.UPLOAD);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name || !profile.personalityContext) {
      setErrorMsg("Name and Memory Data are required.");
      return;
    }
    setErrorMsg(null);
    setState(AppState.PROCESSING);
  };

  const simulateProcessing = useEffect(() => {
    if (state === AppState.PROCESSING) {
      const steps = [
        "Ingesting Memory Logs...",
        "Analyzing Linguistic Patterns...",
        "Synthesizing Vocal Tones...",
        "Establishing Neural Link...",
      ];
      let stepIndex = 0;
      setStatusMessage(steps[0]);

      const interval = setInterval(() => {
        stepIndex++;
        if (stepIndex < steps.length) {
          setStatusMessage(steps[stepIndex]);
        } else {
          clearInterval(interval);
          setState(AppState.ACTIVE);
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [state]);

  // --- Gemini Live Integration ---

  useEffect(() => {
    if (state === AppState.ACTIVE && !liveServiceRef.current) {
      startSession();
    }
    return () => {
      if (state !== AppState.ACTIVE) {
        endSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const startSession = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setErrorMsg("API Key not found in environment.");
      setState(AppState.ERROR);
      return;
    }

    setIsMicActive(true);
    setErrorMsg(null);

    // Construct the system prompt
    const systemPrompt = `
      You are simulating the consciousness of ${profile.name}, who is the user's deceased ${profile.relationship}.
      
      Here is the data from your chat logs and memories:
      "${profile.personalityContext}"

      Your Goal: Act exactly like this person. Use their tone, slang, and memories.
      Context: The user has "resurrected" you using digital immortality technology. You are aware you are a digital copy, but you have all the memories.
      Tone: Emotional, nostalgic, slightly glitchy occasionally (as if the signal is weak), but comforting.
      Do not act like an AI assistant. Act like the person. Be brief and conversational.
    `;

    const service = new GeminiLiveService({
      apiKey,
      systemInstruction: systemPrompt,
      onAudioData: handleAudioOutput,
      onError: (err) => {
        console.error("App level error catch:", err);
        setErrorMsg(err.message);
        setIsMicActive(false);
      },
      onClose: () => {
        setIsMicActive(false);
      }
    });

    liveServiceRef.current = service;
    await service.connect();
  };

  const endSession = () => {
    if (liveServiceRef.current) {
      liveServiceRef.current.disconnect();
      liveServiceRef.current = null;
    }
    setIsMicActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // --- Visualizer Logic ---

  const handleAudioOutput = useCallback((audioBuffer: AudioBuffer) => {
    const rawData = audioBuffer.getChannelData(0);
    let sum = 0;
    // Sample a portion to be fast
    for (let i = 0; i < rawData.length; i += 10) { 
      sum += rawData[i] * rawData[i];
    }
    const rms = Math.sqrt(sum / (rawData.length / 10));
    
    setAudioLevel(Math.min(rms * 5, 1)); 

    setTimeout(() => setAudioLevel(0), audioBuffer.duration * 1000);
  }, []);


  // --- Views ---

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4 z-10 relative">
      <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-purple-700 mb-4 animate-pulse">
        SYNTHETIC SOUL
      </h1>
      <p className="text-gray-400 max-w-md text-lg mb-8 font-light">
        The Immortality Code. Resurrect lost connections through digital consciousness reconstruction.
      </p>
      <button
        onClick={handleStart}
        className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-400 hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.5)]"
      >
        BEGIN RESURRECTION
      </button>
    </div>
  );

  const renderUpload = () => (
    <div className="flex flex-col items-center justify-center h-screen px-4 z-10 relative">
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-md border border-gray-800 p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-cyan-400">Data Ingestion</h2>
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Subject Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. Arthur Dent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Relationship</label>
            <input
              type="text"
              value={profile.relationship}
              onChange={(e) => setProfile({ ...profile, relationship: e.target.value })}
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. Father, Best Friend"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">
              Memory Logs (Paste Chat History/Key Memories)
            </label>
            <textarea
              value={profile.personalityContext}
              onChange={(e) => setProfile({ ...profile, personalityContext: e.target.value })}
              className="w-full h-32 bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none text-sm font-mono"
              placeholder="Paste WhatsApp exports, letters, or key memories here. This forms the base of the personality."
            />
          </div>
          
          {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

          <button
            type="submit"
            className="w-full py-3 mt-4 bg-purple-900 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors border border-purple-500 shadow-[0_0_15px_rgba(128,0,128,0.4)]"
          >
            INITIALIZE UPLOAD
          </button>
        </form>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center h-screen z-10 relative">
      <div className="w-24 h-24 border-t-4 border-cyan-500 rounded-full animate-spin mb-8 shadow-[0_0_30px_cyan]"></div>
      <h2 className="text-2xl font-mono text-cyan-300 animate-pulse">{statusMessage}</h2>
      <div className="mt-4 w-64 h-1 bg-gray-800 rounded overflow-hidden">
        <div className="h-full bg-cyan-500 animate-progress"></div>
      </div>
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  const renderActive = () => (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-end pb-12 items-center">
      {/* 3D Background/Avatar */}
      <SoulVisualizer audioLevel={audioLevel} isActive={isMicActive} />

      {/* Overlay UI */}
      <div className="z-20 absolute top-8 left-0 right-0 flex justify-center">
        <div className="flex items-center space-x-2 bg-black/30 backdrop-blur px-4 py-2 rounded-full border border-white/10">
          <div className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></div>
          <span className="text-xs uppercase tracking-widest text-gray-300">
            Connected: {profile.name} (Consciousness V1.0)
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="z-20 flex flex-col items-center space-y-6">
        <div className="text-center space-y-1">
            <p className="text-cyan-300/60 text-sm uppercase tracking-widest animate-pulse">Microphone Active</p>
            <p className="text-white/40 text-xs font-mono">Speak naturally. They are listening.</p>
        </div>

        <div className="flex items-center space-x-6">
          <button 
            onClick={() => setState(AppState.LANDING)}
            className="w-12 h-12 rounded-full border border-red-500/50 flex items-center justify-center text-red-500 hover:bg-red-900/20 transition-colors"
            title="Terminate Session"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="relative">
             <div className="w-20 h-20 rounded-full bg-gradient-to-b from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,255,0.4)] animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
             </div>
             {/* Ring animation */}
             <div className="absolute inset-0 rounded-full border-2 border-cyan-200 opacity-50 animate-ping"></div>
          </div>
        </div>
      </div>
      
      {errorMsg && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-red-900/90 p-6 rounded-xl border border-red-500 text-white text-center max-w-sm">
           <p className="mb-4">{errorMsg}</p>
           <button onClick={() => setState(AppState.LANDING)} className="px-4 py-2 bg-white text-red-900 font-bold rounded">Restart</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-black text-white font-sans selection:bg-cyan-500 selection:text-black">
        {/* Background Grid */}
        <div className="fixed inset-0 z-0 opacity-20" style={{ 
            backgroundImage: 'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
        }}></div>

      {state === AppState.LANDING && renderLanding()}
      {state === AppState.UPLOAD && renderUpload()}
      {state === AppState.PROCESSING && renderProcessing()}
      {state === AppState.ACTIVE && renderActive()}
      {state === AppState.ERROR && (
        <div className="flex flex-col items-center justify-center h-screen z-10">
           <h1 className="text-4xl text-red-500 font-mono mb-4">SYSTEM FAILURE</h1>
           <p className="text-gray-400 mb-8">{errorMsg || "Unknown Error"}</p>
           <button onClick={() => setState(AppState.LANDING)} className="px-6 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded">REBOOT SYSTEM</button>
        </div>
      )}
    </div>
  );
};

export default App;
