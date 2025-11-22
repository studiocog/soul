export enum AppState {
  LANDING = 'LANDING',
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export interface SoulProfile {
  name: string;
  relationship: string;
  personalityContext: string;
}

export interface VisualizerData {
  volume: number;
}