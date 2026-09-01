export type ControlMode = 'MODE_2' | 'MODE_1';

export type AssistLevel = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';

export type CameraView = 'CHASE' | 'FPV' | 'TOP' | 'FOLLOW_FAR';

export type MissionType = 
  | 'TUTORIAL'
  | 'COIN_HUNT'
  | 'RING_RACE'
  | 'RESCUE'
  | 'AI_RACING'
  | 'FREE_FLIGHT';

export interface DroneControlInput {
  throttle: number; // -1 to 1 (or 0 to 1 depending on mode)
  yaw: number;      // -1 to 1 (left / right rotation)
  pitch: number;    // -1 to 1 (forward / backward tilt)
  roll: number;     // -1 to 1 (left / right slide tilt)
}

export interface DroneTelemetry {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  speedKmh: number;
  altitudeM: number;
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
  throttlePct: number;
  batteryPct: number;
  isGrounded: boolean;
  hasCrashed: boolean;
  hasPatient: boolean;
  propellerRpm: number;
  armed: boolean;
  autoFlightState?: 'TAKEOFF' | 'LANDING' | 'NONE';
  speedGear: SpeedGear;
  raceRank?: 1 | 2;
  aiDistanceM?: number;
  aiFinished?: boolean;
  currentNavGuide?: {
    stepName: string;
    direction: 'ENTER' | 'EXIT' | 'APPROACH' | 'CLIMB' | 'DESCEND';
    instruction: string;
    distanceM: number;
    recommendedAltM: number;
  };
}

export interface MissionStage {
  id: string;
  type: MissionType;
  title: string;
  subtitle: string;
  description: string;
  difficulty: '쉬움' | '보통' | '어려움';
  badgeIcon: string;
  targetCount: number;
  timeLimitSec: number;
  starThresholds: [number, number, number]; // [3 stars max time, 2 stars max time, 1 star max time]
  objectives: string[];
}

export interface MissionProgress {
  unlocked: boolean;
  completed: boolean;
  bestTimeSec: number | null;
  highScore: number;
  stars: number; // 0 to 3
}

export type SpeedGear = 1 | 2 | 3;

export type DroneModelType = 'QUAD_PROBE' | 'HEXA_RESCUE' | 'TWIN_RACER' | 'OCTA_EXPLORER' | 'CYBER_JET' | 'STEALTH_ACE';

export interface DroneSkin {
  id: string;
  name: string;
  modelType: DroneModelType;
  modelTypeName: string;
  primaryColor: string;
  secondaryColor: string;
  propColor: string;
  ledColor: string;
  glowColor: string;
  unlockedByDefault: boolean;
  requiredStars: number;
  description: string;
  stats: {
    topSpeed: number; // 1 - 5
    agility: number;  // 1 - 5
    stability: number;// 1 - 5
  };
}

export interface UserPilotProfile {
  pilotName: string;
  callsign: string;
  avatarSeed: string;
  totalFlightTimeSec: number;
  totalMissionsCompleted: number;
  totalCoinsCollected: number;
  totalRingsPassed: number;
  totalPatientsRescued: number;
  totalRacesWon: number;
  selectedSkinId: string;
  assistLevel: AssistLevel;
  soundEnabled: boolean;
  voiceGuideEnabled: boolean;
  sensitivity: number; // 0.5 to 2.0
  invertPitch: boolean;
  missionProgress: Record<string, MissionProgress>;
  achievements: string[];
}

export interface RingGate {
  id: number;
  position: [number, number, number];
  rotationY: number;
  radius: number;
  passed: boolean;
  active: boolean;
}

export interface CoinItem {
  id: number;
  position: [number, number, number];
  collected: boolean;
}

export interface RescueTarget {
  id: string;
  patientPosition: [number, number, number];
  hospitalPosition: [number, number, number];
  pickedUp: boolean;
  delivered: boolean;
  name: string;
}

export interface AiRacerState {
  position: { x: number; y: number; z: number };
  currentWaypointIdx: number;
  speed: number;
  lap: number;
  finished: boolean;
  finishTimeSec: number | null;
  droneMeshOffset?: number;
}
