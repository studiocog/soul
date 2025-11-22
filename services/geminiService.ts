import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData, createBlob } from '../utils/audioUtils';

interface GeminiLiveConfig {
  apiKey: string;
  systemInstruction: string;
  onAudioData: (buffer: AudioBuffer) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export class GeminiLiveService {
  private client: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private config: GeminiLiveConfig;

  constructor(config: GeminiLiveConfig) {
    this.config = config;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  public async connect() {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    try {
      // Resume contexts if suspended (browser autoplay policy)
      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
      if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Establish connection and await it to catch initial network errors
      this.sessionPromise = this.client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onerror: (e: ErrorEvent) => {
            console.error("Gemini Live Error", e);
            this.config.onError(new Error("Network error: Unable to connect to Soul Interface."));
          },
          onclose: (e: CloseEvent) => {
              console.log("Gemini Live Closed", e);
              this.config.onClose();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }, 
          },
          systemInstruction: { parts: [{ text: this.config.systemInstruction }] },
        },
      });

      // Wait for the promise to ensure connection starts successfully
      await this.sessionPromise;
      
    } catch (err: any) {
      console.error("Connection Failed", err);
      this.config.onError(new Error(err.message || "Failed to initialize connection"));
      this.disconnect();
    }
  }

  private handleOpen() {
    console.log("Connection established. Starting audio stream.");
    if (!this.inputAudioContext || !this.stream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    // Use ScriptProcessor for wide compatibility in this demo context
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createBlob(inputData);
      
      this.sessionPromise?.then((session) => {
        try {
            session.sendRealtimeInput({ media: pcmBlob });
        } catch (e) {
            console.error("Error sending input", e);
        }
      });
    };

    source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

    if (base64Audio && this.outputAudioContext) {
      const encoded = decode(base64Audio);
      if (encoded.length === 0) return;

      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      
      try {
        const audioBuffer = await decodeAudioData(encoded, this.outputAudioContext, 24000, 1);
        
        this.config.onAudioData(audioBuffer);

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);

        source.addEventListener('ended', () => {
          this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
      } catch (e) {
        console.error("Error decoding audio", e);
      }
    }

    if (message.serverContent?.interrupted) {
      this.stopAudioPlayback();
    }
  }

  private stopAudioPlayback() {
    for (const source of this.sources) {
      source.stop();
    }
    this.sources.clear();
    if (this.outputAudioContext) {
        this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  public async disconnect() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.processor?.disconnect();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    
    if (this.sessionPromise) {
        // Attempt to close session if method exists (depends on SDK version), otherwise just ignore
        this.sessionPromise.then(session => {
            if (typeof session.close === 'function') session.close();
        }).catch(() => {});
    }
  }
}
