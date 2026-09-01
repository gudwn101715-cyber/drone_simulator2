import * as THREE from 'three';
import { 
  DroneControlInput, 
  DroneTelemetry, 
  AssistLevel, 
  CameraView, 
  MissionStage, 
  DroneSkin, 
  RingGate, 
  CoinItem, 
  RescueTarget, 
  AiRacerState,
  SpeedGear
} from '../types';
import { soundManager } from '../utils/audio';
import { CityNavGraph } from './cityNavGraph';

function getPointAlongPolyline(points: THREE.Vector3[], progress: number): THREE.Vector3 {
  if (points.length === 0) return new THREE.Vector3();
  if (points.length === 1) return points[0].clone();
  if (progress <= 0) return points[0].clone();
  if (progress >= 1) return points[points.length - 1].clone();

  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const l = points[i].distanceTo(points[i + 1]);
    segLens.push(l);
    totalLen += l;
  }

  if (totalLen <= 0.001) return points[0].clone();

  const targetDist = progress * totalLen;
  let accumulated = 0;

  for (let i = 0; i < segLens.length; i++) {
    const nextAcc = accumulated + segLens[i];
    if (targetDist <= nextAcc || i === segLens.length - 1) {
      const segRatio = segLens[i] > 0 ? (targetDist - accumulated) / segLens[i] : 0;
      return points[i].clone().lerp(points[i + 1], Math.max(0, Math.min(1, segRatio)));
    }
    accumulated = nextAcc;
  }

  return points[points.length - 1].clone();
}

function getSmoothSplinePoint(waypoints: THREE.Vector3[], t: number): THREE.Vector3 {
  if (waypoints.length === 0) return new THREE.Vector3();
  if (waypoints.length === 1) return waypoints[0].clone();
  if (waypoints.length === 2) return waypoints[0].clone().lerp(waypoints[1], t);

  try {
    const curve = new THREE.CatmullRomCurve3(waypoints, false, 'centripetal', 0.25);
    return curve.getPoint(Math.max(0, Math.min(1, t)));
  } catch {
    return getPointAlongPolyline(waypoints, t);
  }
}

function createSignBoardMesh(text: string, isEntrance: boolean, width = 6.8, height = 1.3): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // High contrast backdrop
    ctx.fillStyle = isEntrance ? 'rgba(6, 78, 59, 0.95)' : 'rgba(120, 53, 15, 0.95)';
    ctx.fillRect(0, 0, 512, 128);

    // High contrast outer border
    ctx.lineWidth = 10;
    ctx.strokeStyle = isEntrance ? '#10b981' : '#f59e0b';
    ctx.strokeRect(5, 5, 502, 118);

    // Inner frame
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(12, 12, 488, 104);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = isEntrance ? '#34d399' : '#fbbf24';
    ctx.shadowBlur = 12;
    ctx.fillText(text, 256, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geo, mat);
}

function createBillboardMesh(
  title: string,
  subtitle: string,
  tag: string,
  themeColor: string,
  accentColor: string,
  width = 12.0,
  height = 5.5
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dark modern gradient background
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.6, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Glowing outer border
    ctx.lineWidth = 10;
    ctx.strokeStyle = themeColor;
    ctx.strokeRect(5, 5, 502, 246);

    // Tag / Badge pill
    ctx.fillStyle = themeColor;
    ctx.beginPath();
    ctx.roundRect(28, 22, 160, 36, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, 108, 40);

    // Main Title text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 12;
    ctx.fillText(title, 28, 108);

    // Subtitle text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 21px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText(subtitle, 28, 156);

    // Tech divider line
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, 188);
    ctx.lineTo(484, 188);
    ctx.stroke();

    // Bottom Tech Status Bar
    ctx.fillStyle = accentColor;
    ctx.font = '700 16px monospace';
    ctx.fillText('LIVE DISPLAY // SMART CITY 2026 // 4K 60FPS', 28, 220);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geo, mat);
}

export interface WorldCallbacks {
  onTelemetry: (data: DroneTelemetry) => void;
  onCoinCollected: (coinId: number, totalCollected: number) => void;
  onRingPassed: (ringId: number, nextRingId: number) => void;
  onPatientPickedUp: () => void;
  onPatientDelivered: () => void;
  onCrash: (impactSpeed: number) => void;
  onLapFinished: (lap: number, totalLaps: number, lapTime: number, playerAhead: boolean) => void;
  onRaceFinished: (playerWon: boolean, playerTime: number, aiTime: number) => void;
}

export class DroneWorld {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number = 0;
  private callbacks: WorldCallbacks;

  // Speed Gear Mode (1: ECO, 2: NORMAL STD, 3: TURBO SPORT)
  public speedGear: SpeedGear = 2;

  // Drone State
  private droneGroup: THREE.Group = new THREE.Group();
  private propMeshes: THREE.Mesh[] = [];
  private droneBodyMesh: THREE.Mesh | null = null;
  private ledLights: THREE.PointLight[] = [];
  private tractorBeamMesh: THREE.Mesh | null = null;
  private jetFlameMeshes: THREE.Mesh[] = [];

  private position = new THREE.Vector3(0, 0.4, 0);
  private velocity = new THREE.Vector3(0, 0, 0);
  private rotation = new THREE.Euler(0, 0, 0, 'YXZ'); // pitch (x), yaw (y), roll (z)
  private angularVelocity = new THREE.Vector3(0, 0, 0);
  private batteryPct: number = 100;
  private isGrounded: boolean = true;
  private hasCrashed: boolean = false;
  private armed: boolean = true;
  private autoFlightState: 'TAKEOFF' | 'LANDING' | 'NONE' = 'NONE';

  // Camera Shake & Collision Effects
  private cameraShakeTrauma: number = 0;
  private lastImpactSoundTime: number = 0;
  private currentCameraLookTarget = new THREE.Vector3(0, 0.6, 0);

  // Configuration
  private assistLevel: AssistLevel = 'BEGINNER';
  private cameraView: CameraView = 'CHASE';
  private sensitivity: number = 0.7; // Locked 0.7 standard sensitivity
  private invertPitch: boolean = false;
  private currentSkin: DroneSkin;

  // Controls input
  private currentInput: DroneControlInput = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };

  // Environment & Collision
  private buildingBoxes: THREE.Box3[] = [];
  private groundHelipadPos = new THREE.Vector3(0, 0, 0);
  private baseHelipadMesh: THREE.Group | null = null;

  // Mission Objects
  private currentStage: MissionStage | null = null;
  private rings: RingGate[] = [];
  private ringMeshes: THREE.Group[] = [];
  private coins: CoinItem[] = [];
  private coinMeshes: THREE.Mesh[] = [];
  private rescueTarget: RescueTarget | null = null;
  private rescuePatientMesh: THREE.Group | null = null;
  private hospitalMesh: THREE.Group | null = null;
  private rescueDelivered: boolean = false;
  private patientAttached: boolean = false;

  // Drone model holder (180° inverted to face forward in flight direction)
  private droneModelHolder: THREE.Group = new THREE.Group();

  // Universal Dynamic Augmented Reality Guidance & Holo-Beacon System
  private cityNavGraph = new CityNavGraph();
  private missionGuidanceGroup: THREE.Group = new THREE.Group();
  private missionGuidanceLine: THREE.Line | null = null;
  private guidancePulseOrbs: THREE.Mesh[] = [];
  private guidanceBeaconGroup: THREE.Group = new THREE.Group();
  private guidanceBeaconRings: THREE.Mesh[] = [];
  private guidanceBeaconCone: THREE.Mesh | null = null;
  private guidanceBeaconBeam: THREE.Mesh | null = null;
  private guidanceBeaconLight: THREE.PointLight | null = null;

  // Hospital & Rescue OR transfer
  private hospitalDoctors: THREE.Group[] = [];
  private hospitalORGroup: THREE.Group | null = null;
  private hospitalORDoorLeft: THREE.Mesh | null = null;
  private hospitalORDoorRight: THREE.Mesh | null = null;
  private patientWavingArm: THREE.Mesh | null = null;
  private isTransferringPatientToOR: boolean = false;
  private transferORProgress: number = 0;

  // Racing track models
  private raceTrackGroup: THREE.Group | null = null;

  // Stage 2 Dynamic Obstacles & Landing State
  private stage2Obstacles: { group: THREE.Group; position: THREE.Vector3; radius: number; rotor: THREE.Mesh | THREE.Group }[] = [];
  private stage2LandingReady: boolean = false;

  // AI Racer
  private aiDroneGroup: THREE.Group | null = null;
  private aiProps: THREE.Mesh[] = [];
  private aiRacerState: AiRacerState | null = null;
  private raceWaypoints: THREE.Vector3[] = [];
  private raceStartTime: number = 0;
  private currentLap: number = 1;
  private totalRaceLaps: number = 2;
  private raceActive: boolean = false;
  private raceFinished: boolean = false;
  private isRaceReady: boolean = false;

  // Visual Effects & Particle Pool (Pre-allocated for Zero GC Jitter)
  private particlePool: {
    mesh: THREE.Points;
    geometry: THREE.BufferGeometry;
    material: THREE.PointsMaterial;
    positions: Float32Array;
    velocities: Float32Array;
    active: boolean;
    life: number;
    maxLife: number;
  }[] = [];
  private dustRing: THREE.Mesh | null = null;

  // Scratch Objects & Caches (Eliminates all per-frame heap allocations)
  private _tempVecA = new THREE.Vector3();
  private _tempVecB = new THREE.Vector3();
  private _tempClosestPoint = new THREE.Vector3();
  private _tempNormal = new THREE.Vector3();
  private _tempDiff = new THREE.Vector3();
  private _tempCamOffset = new THREE.Vector3();
  private _tempCamTarget = new THREE.Vector3();
  private _tempRotMat4 = new THREE.Matrix4();
  private _tempOrbPos = new THREE.Vector3();

  // Quest Path Caching state
  private cachedQuestCurve: THREE.CatmullRomCurve3 | null = null;
  private lastQuestCalcTime = 0;
  private lastQuestStartPos = new THREE.Vector3(999, 999, 999);
  private lastQuestGoalPos = new THREE.Vector3(999, 999, 999);
  private lastTelemetryTime = 0;
  private prevIsGrounded = true;

  // Animated Environment Elements (Hot Air Balloons, Pedestrians, Birds, Dog, Lights, Fountain)
  private hotAirBalloons: { group: THREE.Group; baseY: number; phase: number; speed: number; rotSpeed: number }[] = [];
  private animatedPedestrians: {
    group: THREE.Group;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    minVal: number;
    maxVal: number;
    speed: number;
    dir: number;
    isX: boolean;
    walkPhase: number;
  }[] = [];
  private birdFlock: {
    group: THREE.Group;
    leftWing: THREE.Mesh;
    rightWing: THREE.Mesh;
    center: THREE.Vector3;
    radius: number;
    height: number;
    angle: number;
    speed: number;
    flapSpeed: number;
    flapPhase: number;
  }[] = [];
  private parkDog: {
    group: THREE.Group;
    tail: THREE.Mesh;
    head: THREE.Mesh;
    legs: THREE.Mesh[];
    minX: number;
    maxX: number;
    speed: number;
    dir: number;
    walkPhase: number;
  } | null = null;
  private redWarningLights: THREE.Mesh[] = [];
  private fountainWater: THREE.Mesh | null = null;

  // Cyber Sky, Moon, Space Beacons & Airships
  private skyDome: THREE.Mesh | null = null;
  private starsPoints: THREE.Points | null = null;
  private cyberMoonGroup: THREE.Group | null = null;
  private cyberMoonRings: THREE.Mesh[] = [];
  private cyberMoonSatellites: THREE.Mesh[] = [];
  private skyBeacons: { mesh: THREE.Mesh; light: THREE.PointLight | null; baseY: number; pulseSpeed: number; baseOpacity: number }[] = [];
  private skyCruisers: { group: THREE.Group; radius: number; height: number; speed: number; angle: number; engineTrail: THREE.Mesh; strobes: THREE.Mesh[] }[] = [];
  private floatingDataRelays: { group: THREE.Group; innerRing: THREE.Mesh; outerRing: THREE.Mesh; baseY: number; floatSpeed: number; rotSpeed: number }[] = [];

  // Time tracking & 60 FPS Render Loop
  private lastTime: number = performance.now();
  private hoverTimeTracker: number = 0;

  constructor(container: HTMLElement, skin: DroneSkin, callbacks: WorldCallbacks) {
    this.container = container;
    this.currentSkin = skin;
    this.callbacks = callbacks;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617); // Deep cosmic cyberpunk space
    this.scene.fog = new THREE.FogExp2(0x060e24, 0.0055);

    // Camera with balanced depth range (near: 0.45, far: 380) for clean depth resolution without Z-fighting
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.45, 380);
    this.camera.position.set(0, 3, 6);

    // Optimized WebGLRenderer for Tablet Performance:
    // - 0.7x Resolution Scaling for ultra-smooth 60 FPS
    // - logarithmicDepthBuffer disabled to eliminate heavy per-pixel shader calculations
    // - shadowMap disabled to save additional render pass
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      alpha: false, 
      powerPreference: 'high-performance',
      precision: 'mediump',
      logarithmicDepthBuffer: false
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(0.7); // 0.7x tablet scale requested
    
    this.renderer.shadowMap.enabled = false;
    this.renderer.autoClear = true;
    container.appendChild(this.renderer.domElement);

    // Lighting (Shadows disabled for maximum tablet fillrate)
    this.setupLighting(true);

    // Build World
    this.buildCityWorld();
    this.buildGuidanceLineSystem();

    // Build Drone
    this.buildDroneModel();

    // Pre-allocate Particle Pool for Zero Heap Churn during impact sparks
    const maxParticles = 32;
    for (let i = 0; i < 4; i++) {
      const positions = new Float32Array(maxParticles * 3);
      const velocities = new Float32Array(maxParticles * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.28,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Points(geometry, material);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push({
        mesh,
        geometry,
        material,
        positions,
        velocities,
        active: false,
        life: 0,
        maxLife: 0.5
      });
    }

    // Resize handler
    window.addEventListener('resize', this.onWindowResize);

    // Start loop
    this.lastTime = performance.now();
    this.animate();
  }

  private setupLighting(isMobileOrTablet: boolean = false) {
    // Rich Cyber Ambient Light
    const ambient = new THREE.AmbientLight(0x60a5fa, 0.85);
    this.scene.add(ambient);

    // Dynamic Hemisphere Light (Sky Cyan / Ground Deep Indigo)
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.80);
    this.scene.add(hemiLight);

    // Directional Cyber Moonlight
    const sun = new THREE.DirectionalLight(0xa5f3fc, 1.45);
    sun.position.set(80, 140, 60);
    sun.castShadow = !isMobileOrTablet;
    if (sun.castShadow) {
      sun.shadow.mapSize.width = 1024;
      sun.shadow.mapSize.height = 1024;
      sun.shadow.camera.near = 10;
      sun.shadow.camera.far = 350;
      const d = 90;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0005;
    }
    this.scene.add(sun);

    // Street-Level Cyber Neon Point Lights at Key City Intersections
    const streetLightsConfig: { x: number; y: number; z: number; color: number; intensity: number; dist: number }[] = [
      { x: 0, y: 3.5, z: 0, color: 0x00f0ff, intensity: 1.8, dist: 35 },     // Base Pad / Plaza Cyan Glow
      { x: -50, y: 3.5, z: 30, color: 0xf43f5e, intensity: 1.6, dist: 35 },  // Twin Tower Crossway Magenta Glow
      { x: 70, y: 3.5, z: -20, color: 0x22c55e, intensity: 1.8, dist: 35 },  // Hospital Emergency Zone Green Glow
      { x: 35, y: 3.5, z: 40, color: 0xfacc15, intensity: 1.6, dist: 35 },   // Gamma Plaza Gold Glow
      { x: 0, y: 3.5, z: 80, color: 0x38bdf8, intensity: 1.5, dist: 30 },    // South Runway Blue Glow
      { x: 0, y: 3.5, z: -80, color: 0xa855f7, intensity: 1.5, dist: 30 }    // North Runway Purple Glow
    ];

    streetLightsConfig.forEach(cfg => {
      const pLight = new THREE.PointLight(cfg.color, cfg.intensity, cfg.dist);
      pLight.position.set(cfg.x, cfg.y, cfg.z);
      this.scene.add(pLight);
    });
  }

  private buildCityWorld() {
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPad|Tablet|ARM/i.test(navigator.userAgent);

    // 1. Build Spectacular Cyber Sky Dome, Starfield, Holographic Moon, Laser Beacons & Cruisers
    this.buildCyberSkyAndAtmosphere();

    // 2. High-Tech Luminous Cyber Grid Terrain
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshBasicMaterial({ 
      color: 0x070c1b, // Dark cyber slate base
      depthWrite: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);

    // Luminous Cyber Grid Matrix across the ground
    const gridHelper = new THREE.GridHelper(500, 50, 0x00f0ff, 0x1e3a8a);
    gridHelper.position.y = 0.015;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.45;
    this.scene.add(gridHelper);

    // 3. Clear Crossway Roads & Runway Network with LED Edge Strips
    this.buildRoadNetworkAndStreets();

    // 4. Main Base Start / Landing Helipad
    this.baseHelipadMesh = this.buildHelipad(0, 0.10, 0, 7.5, 0xfacc15, 'START / BASE');

    // 5. High-Tech Low-Poly Optimized Buildings (with Corner Neon Trims & Holo-Billboards)
    this.buildBuildings();

    // 6. Park Plaza & Bioluminescent Cyber Trees
    this.buildTreesAndPark();

    // 7. Ambient City Life: Sky Balloons, Pedestrians & Flying Cyber Birds
    this.buildHotAirBalloons();
    this.buildPedestrians();
    this.buildAnimalsAndBirds();
  }

  private buildCyberSkyAndAtmosphere() {
    // 1. Procedural 360° Cyber Sky Dome
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Cosmic Space Gradient (Top Zenith -> Horizon)
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, '#020617');   // Dark Space Zenith
      grad.addColorStop(0.3, '#081432');   // Deep Midnight Blue
      grad.addColorStop(0.65, '#0e265c');  // Cyber Sapphire Blue
      grad.addColorStop(0.85, '#0284c7');  // Atmospheric Cyan Glow
      grad.addColorStop(1.0, '#0f172a');   // Horizon Ground Line
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Flowing Cyber Aurora / Shimmering Nebula Wave Ribbons across the sky
      const drawAuroraWave = (yCenter: number, colorStart: string, colorEnd: string, height: number) => {
        const waveGrad = ctx.createLinearGradient(0, yCenter - height, 0, yCenter + height);
        waveGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
        waveGrad.addColorStop(0.5, colorStart);
        waveGrad.addColorStop(1.0, colorEnd);
        ctx.fillStyle = waveGrad;

        ctx.beginPath();
        ctx.moveTo(0, yCenter);
        for (let x = 0; x <= 1024; x += 16) {
          const wave1 = Math.sin(x * 0.012) * (height * 0.6);
          const wave2 = Math.cos(x * 0.024) * (height * 0.35);
          ctx.lineTo(x, yCenter + wave1 + wave2);
        }
        ctx.lineTo(1024, 512);
        ctx.lineTo(0, 512);
        ctx.closePath();
        ctx.fill();
      };

      // Multi-layer Glowing Aurora Ribbons
      drawAuroraWave(180, 'rgba(0, 240, 255, 0.35)', 'rgba(56, 189, 248, 0.05)', 70);
      drawAuroraWave(220, 'rgba(236, 72, 153, 0.28)', 'rgba(168, 85, 247, 0.05)', 60);
      drawAuroraWave(260, 'rgba(59, 130, 246, 0.30)', 'rgba(2, 132, 199, 0.0)', 50);

      // Horizon Cyber Skyline Silhouette (360-degree city towers with illuminated micro window dots)
      ctx.fillStyle = '#060c1d';
      const buildingWidths = [18, 24, 14, 30, 20, 28, 16, 22, 34, 18, 26, 15];
      let curX = 0;
      let bIdx = 0;
      while (curX < 1024) {
        const bw = buildingWidths[bIdx % buildingWidths.length];
        const bh = 40 + Math.sin(curX * 0.04) * 35 + (bIdx % 5) * 12;
        const by = 512 - bh;
        ctx.fillRect(curX, by, bw - 2, bh);

        // Tower spire
        if (bIdx % 3 === 0) {
          ctx.fillRect(curX + bw / 2 - 1, by - 12, 2, 12);
        }

        // Micro illuminated window grid
        ctx.fillStyle = (bIdx % 2 === 0) ? 'rgba(0, 240, 255, 0.65)' : 'rgba(250, 204, 21, 0.65)';
        for (let wy = by + 6; wy < 500; wy += 8) {
          for (let wx = curX + 3; wx < curX + bw - 4; wx += 5) {
            if (Math.sin(wx * 13 + wy * 7) > -0.2) {
              ctx.fillRect(wx, wy, 2, 3);
            }
          }
        }
        ctx.fillStyle = '#060c1d';

        curX += bw;
        bIdx++;
      }
    }

    const skyTex = new THREE.CanvasTexture(canvas);
    skyTex.wrapS = THREE.RepeatWrapping;
    skyTex.wrapT = THREE.ClampToEdgeWrapping;

    const skyGeo = new THREE.SphereGeometry(420, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // 2. 3D Sparkling Cyber Starfield
    const starCount = 450;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const colorPalette = [
      new THREE.Color(0x00f0ff), // Cyan
      new THREE.Color(0xffffff), // White
      new THREE.Color(0xfacc15), // Gold
      new THREE.Color(0xa855f7), // Purple
      new THREE.Color(0x38bdf8)  // Light Blue
    ];

    for (let i = 0; i < starCount; i++) {
      // Upper hemisphere distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.45; // upper sky
      const r = 390 + Math.random() * 20;

      const sx = r * Math.sin(phi) * Math.cos(theta);
      const sy = Math.abs(r * Math.cos(phi)) + 30; // strictly high altitude
      const sz = r * Math.sin(phi) * Math.sin(theta);

      starPositions[i * 3] = sx;
      starPositions[i * 3 + 1] = sy;
      starPositions[i * 3 + 2] = sz;

      const starCol = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      starColors[i * 3] = starCol.r;
      starColors[i * 3 + 1] = starCol.g;
      starColors[i * 3 + 2] = starCol.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.starsPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starsPoints);

    // 3. Massive Sci-Fi Holographic Cyber Moon & Orbital Station
    this.cyberMoonGroup = new THREE.Group();
    this.cyberMoonGroup.position.set(130, 160, -190);

    // Glowing Lunar Sphere
    const moonGeo = new THREE.SphereGeometry(22, 24, 24);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.cyberMoonGroup.add(moonMesh);

    // Atmospheric Corona Halo
    const haloGeo = new THREE.RingGeometry(22.5, 34.0, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.lookAt(0, 0, 0);
    this.cyberMoonGroup.add(haloMesh);

    // Rotating Holographic Cyber Orbital Rings
    this.cyberMoonRings = [];
    this.cyberMoonSatellites = [];

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(32, 0.4, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75 })
    );
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    this.cyberMoonGroup.add(ring1);
    this.cyberMoonRings.push(ring1);

    const sat1 = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.2, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    sat1.position.set(32, 0, 0);
    ring1.add(sat1);
    this.cyberMoonSatellites.push(sat1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(38, 0.3, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.65 })
    );
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.z = Math.PI / 4;
    this.cyberMoonGroup.add(ring2);
    this.cyberMoonRings.push(ring2);

    const sat2 = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    sat2.position.set(-38, 0, 0);
    ring2.add(sat2);
    this.cyberMoonSatellites.push(sat2);

    this.scene.add(this.cyberMoonGroup);

    // 4. Towering Sky Beacon Laser Searchlights
    this.skyBeacons = [];
    const beaconConfigs: { x: number; y: number; z: number; color: number; h: number }[] = [
      { x: -35, y: 32, z: -40, color: 0x00f0ff, h: 170 }, // Alpha Tower Beacon
      { x: -70, y: 42, z: -20, color: 0xff007f, h: 180 }, // Twin Tower South Beacon
      { x: -70, y: 38, z: 30, color: 0x38bdf8, h: 170 },  // Twin Tower North Beacon
      { x: 35, y: 34, z: 0, color: 0xfacc15, h: 175 },   // Commercial Plaza Beacon
      { x: 70, y: 24, z: -20, color: 0x22c55e, h: 165 }, // Hospital Beacon
      { x: 0, y: 1.0, z: 120, color: 0x00f0ff, h: 160 }  // Runway South Outer Beacon
    ];

    beaconConfigs.forEach((cfg, idx) => {
      const beamGeo = new THREE.CylinderGeometry(0.5, 2.8, cfg.h, 12, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.set(cfg.x, cfg.y + cfg.h / 2, cfg.z);
      this.scene.add(beamMesh);

      // Base emitter ring
      const emitterGeo = new THREE.CylinderGeometry(1.6, 2.0, 1.2, 12);
      const emitterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
      const emitterMesh = new THREE.Mesh(emitterGeo, emitterMat);
      emitterMesh.position.set(cfg.x, cfg.y + 0.6, cfg.z);
      this.scene.add(emitterMesh);

      const pLight = new THREE.PointLight(cfg.color, 1.8, 25);
      pLight.position.set(cfg.x, cfg.y + 2.0, cfg.z);
      this.scene.add(pLight);

      this.skyBeacons.push({
        mesh: beamMesh,
        light: pLight,
        baseY: cfg.y,
        pulseSpeed: 2.0 + idx * 0.5,
        baseOpacity: 0.32
      });
    });

    // 5. Cruising Sci-Fi Heavy Cargo Skycruisers
    this.skyCruisers = [];
    const cruiserConfigs = [
      { radius: 140, height: 75, speed: 0.08, angle: 0, color: 0x00f0ff },
      { radius: 180, height: 95, speed: -0.06, angle: Math.PI, color: 0xec4899 }
    ];

    cruiserConfigs.forEach((cfg) => {
      const cGroup = new THREE.Group();
      
      // Main Streamlined Hull (Fuselage)
      const hullGeo = new THREE.BoxGeometry(7.0, 3.8, 26.0);
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.85,
        roughness: 0.25
      });
      const hullMesh = new THREE.Mesh(hullGeo, hullMat);
      cGroup.add(hullMesh);

      // Glowing Cockpit Bridge Visor
      const visorGeo = new THREE.BoxGeometry(4.2, 1.6, 6.0);
      const visorMat = new THREE.MeshBasicMaterial({ color: cfg.color });
      const visorMesh = new THREE.Mesh(visorGeo, visorMat);
      visorMesh.position.set(0, 1.2, -10.5);
      cGroup.add(visorMesh);

      // Swept-back Heavy Cruiser Wings
      const wingGeo = new THREE.BoxGeometry(22.0, 0.6, 8.0);
      const wingMesh = new THREE.Mesh(wingGeo, hullMat);
      wingMesh.position.set(0, 0.2, 2.0);
      cGroup.add(wingMesh);

      // Illuminated Deck Strips along Hull Sides
      [-3.6, 3.6].forEach(wx => {
        const stripGeo = new THREE.BoxGeometry(0.3, 0.5, 20.0);
        const stripMat = new THREE.MeshBasicMaterial({ color: cfg.color });
        const stripMesh = new THREE.Mesh(stripGeo, stripMat);
        stripMesh.position.set(wx, 0.4, 0);
        cGroup.add(stripMesh);
      });

      // Twin Glowing Ion Thruster Engines (Rear Exhaust Flames)
      [-2.2, 2.2].forEach(ex => {
        const engGeo = new THREE.CylinderGeometry(1.2, 1.4, 3.5, 12);
        const engMesh = new THREE.Mesh(engGeo, hullMat);
        engMesh.rotation.x = Math.PI / 2;
        engMesh.position.set(ex, 0, 13.5);
        cGroup.add(engMesh);

        // Ion Flame Cone
        const flameGeo = new THREE.ConeGeometry(1.1, 7.5, 12);
        const flameMat = new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending
        });
        const flameMesh = new THREE.Mesh(flameGeo, flameMat);
        flameMesh.rotation.x = -Math.PI / 2;
        flameMesh.position.set(ex, 0, 18.0);
        cGroup.add(flameMesh);
      });

      // Wingtip Navigation LED Strobes (Red Port, Green Starboard)
      const strobes: THREE.Mesh[] = [];
      const leftStrobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      leftStrobe.position.set(-11.0, 0.5, 2.0);
      cGroup.add(leftStrobe);
      strobes.push(leftStrobe);

      const rightStrobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      rightStrobe.position.set(11.0, 0.5, 2.0);
      cGroup.add(rightStrobe);
      strobes.push(rightStrobe);

      const initX = Math.cos(cfg.angle) * cfg.radius;
      const initZ = Math.sin(cfg.angle) * cfg.radius;
      cGroup.position.set(initX, cfg.height, initZ);
      this.scene.add(cGroup);

      this.skyCruisers.push({
        group: cGroup,
        radius: cfg.radius,
        height: cfg.height,
        speed: cfg.speed,
        angle: cfg.angle,
        engineTrail: cGroup as any,
        strobes
      });
    });

    // 6. Floating Holographic Data Relays
    this.floatingDataRelays = [];
    const relayConfigs: { x: number; y: number; z: number; color: number }[] = [
      { x: 0, y: 48, z: -50, color: 0x00f0ff },
      { x: -55, y: 55, z: 60, color: 0xec4899 },
      { x: 60, y: 52, z: 20, color: 0xfacc15 }
    ];

    relayConfigs.forEach((cfg, idx) => {
      const rGroup = new THREE.Group();
      rGroup.position.set(cfg.x, cfg.y, cfg.z);

      // Floating Energy Core
      const coreGeo = new THREE.OctahedronGeometry(1.4, 0);
      const coreMat = new THREE.MeshBasicMaterial({ color: cfg.color });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      rGroup.add(coreMesh);

      // Inner Rotating Ring
      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.0, 0.12, 8, 24),
        new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.8 })
      );
      rGroup.add(innerRing);

      // Outer Counter-Rotating Ring
      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.08, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
      );
      rGroup.add(outerRing);

      this.scene.add(rGroup);

      this.floatingDataRelays.push({
        group: rGroup,
        innerRing,
        outerRing,
        baseY: cfg.y,
        floatSpeed: 1.5 + idx * 0.3,
        rotSpeed: 1.0 + idx * 0.4
      });
    });
  }

  private buildRoadNetworkAndStreets() {
    const roadGroup = new THREE.Group();
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x1e293b }); // Realistic dark asphalt

    // 1. Main Central Boulevard (North-South, X: 0, Width: 22, Length: 220, Z: -110 to 110)
    const mainRoadGeo = new THREE.PlaneGeometry(22, 220);
    const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.02, 0);
    mainRoad.receiveShadow = true;
    roadGroup.add(mainRoad);

    // Double Center Yellow Lines
    [-0.3, 0.3].forEach(offX => {
      const yLineGeo = new THREE.PlaneGeometry(0.25, 216);
      const yLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const yLine = new THREE.Mesh(yLineGeo, yLineMat);
      yLine.rotation.x = -Math.PI / 2;
      yLine.position.set(offX, 0.025, 0);
      roadGroup.add(yLine);
    });

    // Dashed White Lane Lines (-5.5m and +5.5m)
    [-5.5, 5.5].forEach(laneX => {
      for (let z = -100; z <= 100; z += 8) {
        // Skip intersections
        if (Math.abs(z - 30) < 9 || Math.abs(z - (-20)) < 9 || Math.abs(z - (-60)) < 9 || Math.abs(z) < 6) continue;
        const dashGeo = new THREE.PlaneGeometry(0.3, 4.0);
        const dashMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(laneX, 0.025, z);
        roadGroup.add(dash);
      }
    });

    // 2. East-West Connecting Crossways (Z = 30, Z = -20, Z = -60)
    const crosswayZs = [30, -20, -60];
    crosswayZs.forEach(cz => {
      const crossRoadGeo = new THREE.PlaneGeometry(160, 16);
      const crossRoad = new THREE.Mesh(crossRoadGeo, roadMat);
      crossRoad.rotation.x = -Math.PI / 2;
      crossRoad.position.set(0, 0.022, cz);
      crossRoad.receiveShadow = true;
      roadGroup.add(crossRoad);

      // Yellow Center Line on Crossways
      const cYLineGeo = new THREE.PlaneGeometry(156, 0.3);
      const cYLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const cYLine = new THREE.Mesh(cYLineGeo, cYLineMat);
      cYLine.rotation.x = -Math.PI / 2;
      cYLine.position.set(0, 0.026, cz);
      roadGroup.add(cYLine);

      // Zebra Crosswalks at intersection entrances
      [-12.5, 12.5].forEach(crossX => {
        for (let bx = -6; bx <= 6; bx += 1.6) {
          const barGeo = new THREE.PlaneGeometry(1.0, 3.8);
          const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const bar = new THREE.Mesh(barGeo, barMat);
          bar.rotation.x = -Math.PI / 2;
          bar.position.set(crossX + (crossX > 0 ? 2.5 : -2.5), 0.028, cz + bx);
          roadGroup.add(bar);
        }
      });
    });

    // 3. Sidewalks & Curbstones with Glowing Cyber LED Strips
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Dark Cyber Concrete
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const cyanLedMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const magentaLedMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });

    // Main Boulevard Left & Right Sidewalks + Glowing Cyan LED Strip
    [-13.5, 13.5].forEach(swX => {
      const swGeo = new THREE.BoxGeometry(4.5, 0.18, 220);
      const sw = new THREE.Mesh(swGeo, sidewalkMat);
      sw.position.set(swX, 0.09, 0);
      sw.receiveShadow = true;
      roadGroup.add(sw);

      // Curb edge
      const curbGeo = new THREE.BoxGeometry(0.3, 0.22, 220);
      const curb = new THREE.Mesh(curbGeo, curbMat);
      const curbX = swX > 0 ? swX - 2.25 : swX + 2.25;
      curb.position.set(curbX, 0.11, 0);
      roadGroup.add(curb);

      // Continuous Glowing Cyan LED Strip along Boulevard Curb
      const ledGeo = new THREE.BoxGeometry(0.12, 0.06, 218);
      const ledMesh = new THREE.Mesh(ledGeo, cyanLedMat);
      ledMesh.position.set(curbX, 0.23, 0);
      roadGroup.add(ledMesh);
    });

    // Crossway Sidewalks + Glowing Magenta LED Strips
    crosswayZs.forEach(cz => {
      [-10.2, 10.2].forEach(offZ => {
        const cSwGeo = new THREE.BoxGeometry(160, 0.18, 4.0);
        const cSw = new THREE.Mesh(cSwGeo, sidewalkMat);
        cSw.position.set(0, 0.09, cz + offZ);
        cSw.receiveShadow = true;
        roadGroup.add(cSw);

        // Glowing Magenta LED Strip along Crossway Edge
        const cLedGeo = new THREE.BoxGeometry(158, 0.06, 0.12);
        const cLedMesh = new THREE.Mesh(cLedGeo, magentaLedMat);
        cLedMesh.position.set(0, 0.20, cz + (offZ > 0 ? offZ - 1.9 : offZ + 1.9));
        roadGroup.add(cLedMesh);
      });
    });

    // 4. Modern Curved Street Lamps along Sidewalks
    const lampPositions: [number, number, number][] = [
      [-14.5, -80, Math.PI / 2], [-14.5, -40, Math.PI / 2], [-14.5, 0, Math.PI / 2], [-14.5, 45, Math.PI / 2], [-14.5, 80, Math.PI / 2],
      [14.5, -80, -Math.PI / 2], [14.5, -40, -Math.PI / 2], [14.5, 0, -Math.PI / 2], [14.5, 45, -Math.PI / 2], [14.5, 80, -Math.PI / 2],
      [35, 21, 0], [55, 21, 0], [-35, 21, 0], [-55, 21, 0],
      [35, -29, Math.PI], [55, -29, Math.PI], [-35, -29, Math.PI], [-55, -29, Math.PI]
    ];

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const lampLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Warm LED bulb

    lampPositions.forEach(([lx, lz, rotY]) => {
      const lamp = new THREE.Group();
      lamp.position.set(lx, 0, lz);
      lamp.rotation.y = rotY;

      // Vertical pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.5, 8), poleMat);
      pole.position.y = 2.75;
      lamp.add(pole);

      // Curved arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.4), poleMat);
      arm.position.set(0, 5.4, 0.6);
      lamp.add(arm);

      // Lamp fixture housing
      const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.8), poleMat);
      fixture.position.set(0, 5.45, 1.2);
      lamp.add(fixture);

      // Glowing lens
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.65), lampLightMat);
      lens.position.set(0, 5.38, 1.2);
      lamp.add(lens);

      roadGroup.add(lamp);
    });

    // 5. Parked Low-Poly City Vehicles along sidewalk parking bays (Static, tasteful)
    const carConfigs = [
      { x: -12.2, z: -10, color: 0x3b82f6, type: 'sedan' }, // Blue sedan
      { x: -12.2, z: 15, color: 0xfacc15, type: 'taxi' }, // Yellow taxi
      { x: 12.2, z: -32, color: 0xe11d48, type: 'sedan' }, // Red hatchback
      { x: 12.2, z: 62, color: 0x0284c7, type: 'pickup' }, // Cyber pickup
      { x: 45, z: -27.5, color: 0x10b981, type: 'sedan' }, // Emerald EV
    ];

    carConfigs.forEach(cfg => {
      const car = new THREE.Group();
      car.position.set(cfg.x, 0, cfg.z);
      car.rotation.y = cfg.x > 0 ? 0 : Math.PI;

      const bodyMat = new THREE.MeshLambertMaterial({ color: cfg.color });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.8 });
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

      // Lower Chassis
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 4.4), bodyMat);
      chassis.position.y = 0.65;
      chassis.castShadow = true;
      car.add(chassis);

      // Cabin / Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 2.4), glassMat);
      cabin.position.set(0, 1.35, -0.2);
      cabin.castShadow = true;
      car.add(cabin);

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      [
        [-1.0, 0.36, 1.3], [1.0, 0.36, 1.3],
        [-1.0, 0.36, -1.3], [1.0, 0.36, -1.3]
      ].forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(wx, wy, wz);
        car.add(wheel);
      });

      // Headlights & Taillights
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      [-0.7, 0.7].forEach(hx => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), hlMat);
        hl.position.set(hx, 0.75, 2.22);
        car.add(hl);

        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), tlMat);
        tl.position.set(hx, 0.75, -2.22);
        car.add(tl);
      });

      // Taxi Sign if taxi
      if (cfg.type === 'taxi') {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        sign.position.set(0, 1.85, -0.2);
        car.add(sign);
      }

      roadGroup.add(car);
    });

    this.scene.add(roadGroup);
  }

  private buildHelipad(x: number, y: number, z: number, size: number, color: number, labelText?: string): THREE.Group {
    const padGroup = new THREE.Group();
    padGroup.position.set(x, y, z);

    // Outer circle
    const circleGeo = new THREE.CircleGeometry(size / 2, 32);
    const circleMat = new THREE.MeshBasicMaterial({ 
      color,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    padGroup.add(circle);

    // Inner ring
    const ringGeo = new THREE.RingGeometry(size / 2 - 0.5, size / 2, 32);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    padGroup.add(ring);

    // Letter 'H'
    const hBarMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    });
    const hBar1 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.2), hBarMat);
    hBar1.rotation.x = -Math.PI / 2;
    hBar1.position.set(-1.1, 0.04, 0);
    padGroup.add(hBar1);

    const hBar2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.2), hBarMat);
    hBar2.rotation.x = -Math.PI / 2;
    hBar2.position.set(1.1, 0.04, 0);
    padGroup.add(hBar2);

    const hBarMid = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.6), hBarMat);
    hBarMid.rotation.x = -Math.PI / 2;
    hBarMid.position.set(0, 0.04, 0);
    padGroup.add(hBarMid);

    this.scene.add(padGroup);
    return padGroup;
  }

  private buildGuidanceLineSystem() {
    // 1. Augmented Reality 3D Quest Flight Trajectory Line (64 interpolated points along obstacle-free corridor)
    const initialPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 64; i++) {
      initialPoints.push(new THREE.Vector3(0, 0, 0));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(initialPoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false
    });
    this.missionGuidanceLine = new THREE.Line(lineGeo, lineMat);
    this.missionGuidanceLine.renderOrder = 9999;
    this.missionGuidanceGroup.add(this.missionGuidanceLine);

    // 2. Animated Flowing Holographic Pulse Orbs along the Trajectory
    this.guidancePulseOrbs = [];
    const orbGeo = new THREE.SphereGeometry(0.22, 12, 12);
    for (let i = 0; i < 8; i++) {
      const orbMat = new THREE.MeshBasicMaterial({
        color: 0xff0033,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.renderOrder = 9999;
      this.missionGuidanceGroup.add(orb);
      this.guidancePulseOrbs.push(orb);
    }
    this.missionGuidanceGroup.visible = false;
    this.scene.add(this.missionGuidanceGroup);

    // 3. 3D Destination Target Holo-Beacon
    this.guidanceBeaconRings = [];
    
    // Concentric Target Reticle Rings
    [1.6, 2.6, 3.8].forEach((r, idx) => {
      const rGeo = new THREE.RingGeometry(r - 0.12, r + 0.12, 32);
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xff0033,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75 - idx * 0.15,
        depthTest: false,
        depthWrite: false
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 9998;
      this.guidanceBeaconGroup.add(ring);
      this.guidanceBeaconRings.push(ring);
    });

    // Downward Guidance Pointer Cone
    const coneGeo = new THREE.ConeGeometry(0.6, 1.4, 8);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false
    });
    this.guidanceBeaconCone = new THREE.Mesh(coneGeo, coneMat);
    this.guidanceBeaconCone.rotation.x = Math.PI; // Pointing down
    this.guidanceBeaconCone.position.y = 1.8;
    this.guidanceBeaconCone.renderOrder = 9999;
    this.guidanceBeaconGroup.add(this.guidanceBeaconCone);

    // High Altitude Sky Vertical Laser Beam
    const beamGeo = new THREE.CylinderGeometry(0.25, 0.25, 60, 12);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.55,
      depthTest: false,
      depthWrite: false
    });
    this.guidanceBeaconBeam = new THREE.Mesh(beamGeo, beamMat);
    this.guidanceBeaconBeam.position.y = 30;
    this.guidanceBeaconBeam.renderOrder = 9997;
    this.guidanceBeaconGroup.add(this.guidanceBeaconBeam);

    // Local Point Light
    this.guidanceBeaconLight = new THREE.PointLight(0xff0033, 2.5, 20);
    this.guidanceBeaconGroup.add(this.guidanceBeaconLight);

    this.guidanceBeaconGroup.visible = false;
    this.scene.add(this.guidanceBeaconGroup);
  }

  private buildBuildings() {
    this.buildingBoxes = [];
    const buildingColors = [0x60a5fa, 0x38bdf8, 0x818cf8, 0xf472b6, 0xfb923c, 0xa78bfa, 0x94a3b8];

    // Streamlined building distribution with fewer buildings and wide open flight corridors:
    const buildingSpecs: {
      x: number;
      z: number;
      w: number;
      d: number;
      h: number;
      color: number;
      hasTunnel?: boolean;
      tunnelY?: number;
      tunnelW?: number;
      tunnelH?: number;
      isRescueRooftop?: boolean;
      isHospital?: boolean;
      southSignText?: string;
      southIsEntrance?: boolean;
      northSignText?: string;
      northIsEntrance?: boolean;
    }[] = [
      // Left boulevard
      { 
        x: -35, z: -40, w: 22, d: 24, h: 32, color: 0, 
        hasTunnel: true, tunnelY: 12.0, tunnelW: 11.0, tunnelH: 7.5,
        southSignText: '[ OUT ▶ 알파 빌딩 관통 출구 ]', // +Z face (front face seen from plaza/photo -> EXIT)
        southIsEntrance: false,
        northSignText: '[ IN ▶ 알파 빌딩 진입 입구 ]', // -Z face (back of building -> ENTRANCE)
        northIsEntrance: true
      },
      { 
        x: -70, z: -20, w: 24, d: 24, h: 42, color: 4, 
        hasTunnel: true, tunnelY: 20.0, tunnelW: 12.0, tunnelH: 7.5,
        southSignText: '[ SKYBRIDGE ▶ 스카이브릿지 연결 ]', // +Z face (connects to skybridge)
        southIsEntrance: false,
        northSignText: '[ IN ▶ 트윈 타워 진입 입구 ]', // -Z face (approached from Alpha exit heading to +Z)
        northIsEntrance: true
      },
      { 
        x: -70, z: 30, w: 24, d: 24, h: 38, color: 5, 
        hasTunnel: true, tunnelY: 20.0, tunnelW: 12.0, tunnelH: 7.5, isRescueRooftop: true,
        southSignText: '[ OUT ▶ 트윈 타워 관통 출구 ]', // +Z face (exit to North crossway heading to +Z)
        southIsEntrance: false,
        northSignText: '[ SKYBRIDGE ▶ 트윈타워 북측 진입 ]', // -Z face (receives skybridge)
        northIsEntrance: true
      },

      // Right boulevard
      { x: 35, z: 0, w: 20, d: 20, h: 34, color: 3 }, // Commercial Plaza
      { 
        x: 35, z: 40, w: 22, d: 24, h: 30, color: 4, 
        hasTunnel: true, tunnelY: 14.0, tunnelW: 11.0, tunnelH: 7.5,
        southSignText: '[ IN ▶ 감마 빌딩 진입 입구 ]', // +Z face (approached from Twin Tower crossway heading to -Z)
        southIsEntrance: true,
        northSignText: '[ OUT ▶ 감마 빌딩 관통 출구 ]', // -Z face (exit towards Finish Gate heading to -Z)
        northIsEntrance: false
      },
      { x: 70, z: -20, w: 26, d: 28, h: 24, color: 6, isHospital: true }, // General Hospital Helipad & Trauma Center!
      { x: 70, z: 30, w: 24, d: 26, h: 36, color: 2 }, // Medical Annex

      // North skyline (backdrop)
      { x: -30, z: -90, w: 24, d: 20, h: 38, color: 0 },
      { x: 30, z: -90, w: 24, d: 20, h: 38, color: 5 },
    ];

    // Build Skybridge Connecting Twin Towers at x: -70 (between z: -8 and z: 18)
    const skybridgeGroup = new THREE.Group();
    skybridgeGroup.position.set(-70, 20.0, 5.0);

    // Skybridge Bottom Walkway (Spanning between the two towers)
    const sbFloor = new THREE.Mesh(
      new THREE.BoxGeometry(14.0, 1.2, 28.0),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    sbFloor.position.y = -3.75;
    skybridgeGroup.add(sbFloor);

    // Skybridge Top Roof
    const sbRoof = new THREE.Mesh(
      new THREE.BoxGeometry(14.0, 1.2, 28.0),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    sbRoof.position.y = 3.75;
    skybridgeGroup.add(sbRoof);

    // Skybridge Solid Enclosing Side Walls (Left & Right - Completely blocks side penetration)
    const sbSideWallGeo = new THREE.BoxGeometry(1.2, 6.3, 28.0);
    const sbSideWallMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const sbGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.8
    });

    [-6.4, 6.4].forEach(ex => {
      // Solid base side wall
      const wallMesh = new THREE.Mesh(sbSideWallGeo, sbSideWallMat);
      wallMesh.position.set(ex, 0, 0);
      skybridgeGroup.add(wallMesh);

      // Glass viewing window strips on side facade
      for (let wz = -10; wz <= 10; wz += 5) {
        const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(1.26, 3.2, 3.8), sbGlassMat);
        glassMesh.position.set(ex, 0.2, wz);
        skybridgeGroup.add(glassMesh);
      }
    });

    // Illuminated Safety Edge Trusses along Floor and Roof
    const edgeTrimGeo = new THREE.BoxGeometry(0.3, 0.4, 28.0);
    const edgeTrimMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    
    [-6.8, 6.8].forEach(ex => {
      const trimBtm = new THREE.Mesh(edgeTrimGeo, edgeTrimMat);
      trimBtm.position.set(ex, -3.15, 0);
      skybridgeGroup.add(trimBtm);

      const trimTop = new THREE.Mesh(edgeTrimGeo, edgeTrimMat);
      trimTop.position.set(ex, 3.15, 0);
      skybridgeGroup.add(trimTop);
    });

    // Skybridge Interior Luminous Tube Lighting
    const sbLightStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.2, 26.0),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    sbLightStrip.position.y = 3.0;
    skybridgeGroup.add(sbLightStrip);

    this.scene.add(skybridgeGroup);

    // Add Skybridge Collision Boxes (Floor, Roof, Solid Left Wall, Solid Right Wall)
    // Ensures drone can ONLY enter through the tunnel mouth from the front/back, NEVER from the side!
    const sbBoxFloor = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-70, 20.0 - 3.75, 5.0),
      new THREE.Vector3(14.0, 1.2, 28.0)
    );
    const sbBoxRoof = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-70, 20.0 + 3.75, 5.0),
      new THREE.Vector3(14.0, 1.2, 28.0)
    );
    const sbBoxLeftWall = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-70 - 6.4, 20.0, 5.0),
      new THREE.Vector3(1.4, 7.5, 28.0)
    );
    const sbBoxRightWall = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-70 + 6.4, 20.0, 5.0),
      new THREE.Vector3(1.4, 7.5, 28.0)
    );
    this.buildingBoxes.push(sbBoxFloor, sbBoxRoof, sbBoxLeftWall, sbBoxRightWall);

    // Build Grand Park Entrance Arch Portal at [0, 5.0, -25]
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -25);

    const archPillarGeo = new THREE.BoxGeometry(1.8, 10.0, 1.8);
    const archPillarMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const archPillarL = new THREE.Mesh(archPillarGeo, archPillarMat);
    archPillarL.position.set(-6.5, 5.0, 0);
    archGroup.add(archPillarL);

    const archPillarR = new THREE.Mesh(archPillarGeo, archPillarMat);
    archPillarR.position.set(6.5, 5.0, 0);
    archGroup.add(archPillarR);

    const archBeamGeo = new THREE.BoxGeometry(15.0, 1.8, 1.8);
    const archBeamMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const archBeam = new THREE.Mesh(archBeamGeo, archBeamMat);
    archBeam.position.set(0, 9.5, 0);
    archGroup.add(archBeam);

    // Glowing Neon Portal Trim on Arch
    const archNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const archNeon = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.3, 2.0), archNeonMat);
    archNeon.position.set(0, 8.4, 0);
    archGroup.add(archNeon);

    this.scene.add(archGroup);

    // Add Arch Collision Boxes (Left Pillar, Right Pillar, Top Beam)
    this.buildingBoxes.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-6.5, 5.0, -25), new THREE.Vector3(1.8, 10.0, 1.8)),
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(6.5, 5.0, -25), new THREE.Vector3(1.8, 10.0, 1.8)),
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 9.5, -25), new THREE.Vector3(15.0, 1.8, 1.8))
    );

    buildingSpecs.forEach(spec => {
      const bGroup = new THREE.Group();
      const color = spec.isHospital ? 0xf1f5f9 : buildingColors[spec.color % buildingColors.length];
      const mat = new THREE.MeshLambertMaterial({ color });

      if (spec.hasTunnel && spec.tunnelY && spec.tunnelW && spec.tunnelH) {
        // Construct Solid Building with Straight Front-to-Back Penetration Tunnel!
        const btmHeight = spec.tunnelY - (spec.tunnelH / 2);
        const topHeight = spec.h - (spec.tunnelY + (spec.tunnelH / 2));
        const pillarW = (spec.w - spec.tunnelW) / 2;

        // 1. Solid Bottom Base Section (Full width & depth)
        const btmGeo = new THREE.BoxGeometry(spec.w, btmHeight, spec.d);
        const btmMesh = new THREE.Mesh(btmGeo, mat);
        btmMesh.position.set(spec.x, btmHeight / 2, spec.z);
        btmMesh.castShadow = true;
        btmMesh.receiveShadow = true;
        this.scene.add(btmMesh);

        // 2. Solid Top Roof Section (Full width & depth)
        const topGeo = new THREE.BoxGeometry(spec.w, topHeight, spec.d);
        const topMesh = new THREE.Mesh(topGeo, mat);
        topMesh.position.set(spec.x, spec.h - topHeight / 2, spec.z);
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        this.scene.add(topMesh);

        // 3. Solid Left Wall (Enclosing side of tunnel completely)
        const pillLGeo = new THREE.BoxGeometry(pillarW, spec.tunnelH, spec.d);
        const pillLMesh = new THREE.Mesh(pillLGeo, mat);
        pillLMesh.position.set(spec.x - (spec.w / 2) + (pillarW / 2), spec.tunnelY, spec.z);
        pillLMesh.castShadow = true;
        pillLMesh.receiveShadow = true;
        this.scene.add(pillLMesh);

        // 4. Solid Right Wall (Enclosing side of tunnel completely)
        const pillRGeo = new THREE.BoxGeometry(pillarW, spec.tunnelH, spec.d);
        const pillRMesh = new THREE.Mesh(pillRGeo, mat);
        pillRMesh.position.set(spec.x + (spec.w / 2) - (pillarW / 2), spec.tunnelY, spec.z);
        pillRMesh.castShadow = true;
        pillRMesh.receiveShadow = true;
        this.scene.add(pillRMesh);

        // Neon Portals at Entrance (Front) and Exit (Back)
        const neonColor = spec.color === 0 ? 0x00f0ff : 0xf43f5e;
        const portalNeonMat = new THREE.MeshBasicMaterial({ color: neonColor });

        // South-facing Portal (+Z face)
        const southPortal = new THREE.Group();
        southPortal.position.set(spec.x, spec.tunnelY, spec.z + spec.d / 2 + 0.1);

        const portalTop = new THREE.Mesh(new THREE.BoxGeometry(spec.tunnelW + 0.8, 0.4, 0.4), portalNeonMat);
        portalTop.position.y = spec.tunnelH / 2;
        southPortal.add(portalTop);

        const portalBtm = new THREE.Mesh(new THREE.BoxGeometry(spec.tunnelW + 0.8, 0.4, 0.4), portalNeonMat);
        portalBtm.position.y = -spec.tunnelH / 2;
        southPortal.add(portalBtm);

        const portalL = new THREE.Mesh(new THREE.BoxGeometry(0.4, spec.tunnelH, 0.4), portalNeonMat);
        portalL.position.x = -spec.tunnelW / 2;
        southPortal.add(portalL);

        const portalR = new THREE.Mesh(new THREE.BoxGeometry(0.4, spec.tunnelH, 0.4), portalNeonMat);
        portalR.position.x = spec.tunnelW / 2;
        southPortal.add(portalR);

        // Directional Neon Runway Chevron Arrow
        const arrowGeo = new THREE.ConeGeometry(0.4, 0.9, 4);
        const arrowMesh = new THREE.Mesh(arrowGeo, portalNeonMat);
        arrowMesh.position.y = spec.tunnelH / 2 + 0.8;
        arrowMesh.rotation.x = Math.PI;
        southPortal.add(arrowMesh);

        // 3D Signboard on South face (+Z face)
        const southSignText = spec.southSignText || '[ IN ▶ 진입 입구 ]';
        const southIsEntrance = spec.southIsEntrance !== undefined ? spec.southIsEntrance : true;
        const southSign = createSignBoardMesh(southSignText, southIsEntrance, Math.min(spec.tunnelW + 1.2, 7.5), 1.2);
        southSign.position.set(0, spec.tunnelH / 2 + 1.2, 0.05);
        southPortal.add(southSign);

        this.scene.add(southPortal);

        // North-facing Portal (-Z face)
        const northPortal = southPortal.clone();
        northPortal.position.z = spec.z - spec.d / 2 - 0.1;
        northPortal.rotation.y = Math.PI; // Face outwards towards rear (-Z)

        // Replace signboard on North face with the north specific signboard
        const northChildrenToRemove: THREE.Object3D[] = [];
        northPortal.children.forEach(c => {
          if ((c as THREE.Mesh).isMesh && c.position.y > spec.tunnelH / 2 + 0.5) {
            northChildrenToRemove.push(c);
          }
        });
        northChildrenToRemove.forEach(c => northPortal.remove(c));

        const northSignText = spec.northSignText || '[ OUT ▶ 관통 출구 ]';
        const northIsEntrance = spec.northIsEntrance !== undefined ? spec.northIsEntrance : false;
        const northSign = createSignBoardMesh(northSignText, northIsEntrance, Math.min(spec.tunnelW + 1.2, 7.5), 1.2);
        northSign.position.set(0, spec.tunnelH / 2 + 1.2, 0.05);
        northPortal.add(northSign);

        this.scene.add(northPortal);

        // Interior Ceiling Neon Strip
        const ceilingStrip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, spec.d), portalNeonMat);
        ceilingStrip.position.set(spec.x, spec.tunnelY + spec.tunnelH / 2 - 0.1, spec.z);
        this.scene.add(ceilingStrip);

        // Interior Floor Edge Neon Trims
        [-spec.tunnelW / 2 + 0.3, spec.tunnelW / 2 - 0.3].forEach(ex => {
          const floorTrim = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, spec.d), portalNeonMat);
          floorTrim.position.set(spec.x + ex, spec.tunnelY - spec.tunnelH / 2 + 0.1, spec.z);
          this.scene.add(floorTrim);
        });

        // Roof edge trim
        const trimGeo = new THREE.BoxGeometry(spec.w + 0.6, 0.8, spec.d + 0.6);
        const trimMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.set(spec.x, spec.h + 0.4, spec.z);
        this.scene.add(trim);

        // If high-rise rescue rooftop helipad
        if (spec.isRescueRooftop) {
          const rPadGeo = new THREE.CircleGeometry(4.2, 32);
          const rPadMat = new THREE.MeshLambertMaterial({ color: 0xfef08a });
          const rPad = new THREE.Mesh(rPadGeo, rPadMat);
          rPad.rotation.x = -Math.PI / 2;
          rPad.position.set(spec.x, spec.h + 0.82, spec.z);
          this.scene.add(rPad);
        }

        // Register Collision Boxes (Bottom, Top, Solid Left Wall, Solid Right Wall)
        this.buildingBoxes.push(
          new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(spec.x, btmHeight / 2, spec.z),
            new THREE.Vector3(spec.w, btmHeight, spec.d)
          ),
          new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(spec.x, spec.h - topHeight / 2, spec.z),
            new THREE.Vector3(spec.w, topHeight, spec.d)
          ),
          new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(spec.x - (spec.w / 2) + (pillarW / 2), spec.tunnelY, spec.z),
            new THREE.Vector3(pillarW, spec.tunnelH, spec.d)
          ),
          new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(spec.x + (spec.w / 2) - (pillarW / 2), spec.tunnelY, spec.z),
            new THREE.Vector3(pillarW, spec.tunnelH, spec.d)
          )
        );

        return; // Skip default solid building construction
      }

      bGroup.position.set(spec.x, spec.h / 2, spec.z);

      const geo = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      bGroup.add(mesh);

      // Roof edge trim
      const trimGeo = new THREE.BoxGeometry(spec.w + 0.6, 0.8, spec.d + 0.6);
      const trimMat = new THREE.MeshLambertMaterial({ color: spec.isHospital ? 0xef4444 : 0x1e293b });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.y = spec.h / 2 + 0.4;
      bGroup.add(trim);

      // Windows
      this.addBuildingWindows(bGroup, spec.w, spec.h, spec.d);

      // Special structures
      if (spec.isHospital) {
        this.hospitalMesh = bGroup;
        // Hospital rooftop red cross helipad
        const hPadGeo = new THREE.CircleGeometry(4.8, 32);
        const hPadMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const hPad = new THREE.Mesh(hPadGeo, hPadMat);
        hPad.rotation.x = -Math.PI / 2;
        hPad.position.y = spec.h / 2 + 0.82;
        bGroup.add(hPad);

        // Helipad Outer Yellow Ring
        const ringGeo = new THREE.RingGeometry(4.6, 4.9, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
        const yRing = new THREE.Mesh(ringGeo, ringMat);
        yRing.rotation.x = -Math.PI / 2;
        yRing.position.y = spec.h / 2 + 0.83;
        bGroup.add(yRing);

        // Red cross on helipad
        const cross1 = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 5.0), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        cross1.rotation.x = -Math.PI / 2;
        cross1.position.y = spec.h / 2 + 0.85;
        bGroup.add(cross1);
        const cross2 = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.4), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        cross2.rotation.x = -Math.PI / 2;
        cross2.position.y = spec.h / 2 + 0.85;
        bGroup.add(cross2);

        // Hospital Rooftop Operating Room (OR) Elevator Airlock Building
        const orBuilding = new THREE.Group();
        orBuilding.position.set(0, spec.h / 2 + 2.0, -9.0);
        
        const orBoxGeo = new THREE.BoxGeometry(6.5, 3.6, 4.5);
        const orBoxMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
        const orBox = new THREE.Mesh(orBoxGeo, orBoxMat);
        orBuilding.add(orBox);

        // OR Entrance Frame
        const doorFrameGeo = new THREE.BoxGeometry(3.6, 2.6, 0.4);
        const doorFrameMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
        const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
        doorFrame.position.set(0, -0.5, 2.26);
        orBuilding.add(doorFrame);

        // OR Sliding Double Doors
        const doorMat = new THREE.MeshStandardMaterial({ 
          color: 0x38bdf8, 
          roughness: 0.2, 
          metalness: 0.8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.3
        });
        const doorGeoL = new THREE.BoxGeometry(1.5, 2.3, 0.1);
        this.hospitalORDoorLeft = new THREE.Mesh(doorGeoL, doorMat);
        this.hospitalORDoorLeft.position.set(-0.8, -0.5, 2.3);
        orBuilding.add(this.hospitalORDoorLeft);

        const doorGeoR = new THREE.BoxGeometry(1.5, 2.3, 0.1);
        this.hospitalORDoorRight = new THREE.Mesh(doorGeoR, doorMat);
        this.hospitalORDoorRight.position.set(0.8, -0.5, 2.3);
        orBuilding.add(this.hospitalORDoorRight);

        // Glowing Green Medical Cross Sign above OR door
        const orSignGeo = new THREE.BoxGeometry(2.4, 0.8, 0.3);
        const orSignMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const orSign = new THREE.Mesh(orSignGeo, orSignMat);
        orSign.position.set(0, 1.2, 2.35);
        orBuilding.add(orSign);

        const orLight = new THREE.PointLight(0x22c55e, 1.5, 8);
        orLight.position.set(0, 1.2, 3.0);
        orBuilding.add(orLight);

        bGroup.add(orBuilding);
        this.hospitalORGroup = orBuilding;

        // 3D Doctor / Paramedic Team on Rooftop Helipad
        this.hospitalDoctors = [];
        const docConfigs = [
          { x: -3.2, z: 2.0, rotY: Math.PI / 4 },
          { x: 3.2, z: 2.0, rotY: -Math.PI / 4 }
        ];

        docConfigs.forEach((cfg) => {
          const docGroup = new THREE.Group();
          docGroup.position.set(cfg.x, spec.h / 2 + 0.85, cfg.z);
          docGroup.rotation.y = cfg.rotY;

          // Body / White Medical Coat
          const coatGeo = new THREE.CylinderGeometry(0.32, 0.4, 1.0, 12);
          const coatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
          const coat = new THREE.Mesh(coatGeo, coatMat);
          coat.position.y = 0.5;
          docGroup.add(coat);

          // Head with Medical Scrub Cap
          const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
          const headMat = new THREE.MeshLambertMaterial({ color: 0x059669 }); // Emerald scrub cap
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.y = 1.15;
          docGroup.add(head);

          // Stethoscope / ID Badge
          const stethGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 16);
          const stethMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
          const steth = new THREE.Mesh(stethGeo, stethMat);
          steth.position.set(0, 0.85, 0.28);
          steth.rotation.x = Math.PI / 4;
          docGroup.add(steth);

          // Glowing Marshaling Safety Baton (Flashing Amber/Green)
          const wandGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
          const wandMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
          const wand = new THREE.Mesh(wandGeo, wandMat);
          wand.position.set(0.35, 0.7, 0.3);
          wand.rotation.x = -Math.PI / 4;
          docGroup.add(wand);

          bGroup.add(docGroup);
          this.hospitalDoctors.push(docGroup);
        });

        // Hospital Facade Massive Glowing Red Cross
        const fCross1 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 8.0), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        fCross1.position.set(0, 0, spec.d / 2 + 0.1);
        bGroup.add(fCross1);
        const fCross2 = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 2.0), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        fCross2.position.set(0, 0, spec.d / 2 + 0.1);
        bGroup.add(fCross2);

        // Ground Ambulance Vehicle at Entrance
        const ambGroup = new THREE.Group();
        ambGroup.position.set(6, -spec.h / 2 + 1.2, spec.d / 2 + 3.5);
        
        // Ambulance Body
        const ambBody = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 2.2, 5.0),
          new THREE.MeshLambertMaterial({ color: 0xffffff })
        );
        ambGroup.add(ambBody);

        // Red stripe
        const ambStripe = new THREE.Mesh(
          new THREE.BoxGeometry(2.64, 0.4, 4.8),
          new THREE.MeshBasicMaterial({ color: 0xdc2626 })
        );
        ambStripe.position.y = 0.1;
        ambGroup.add(ambStripe);

        // Flashing Emergency Beacon on Ambulance
        const ambBeacon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.2, 8),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        ambBeacon.position.y = 1.2;
        ambGroup.add(ambBeacon);

        bGroup.add(ambGroup);
      }

      // High-Tech LED Digital Billboard Attachments on Building Facades
      if (spec.x === -35 && spec.z === -40) {
        // Alpha Building - Facing East Runway
        const bb = createBillboardMesh('SKYTECH AERO LAB', 'Autonomous Flight & AI Drone R&D', 'TECH HUB', '#00f0ff', '#38bdf8', 13, 5.5);
        bb.position.set(spec.w / 2 + 0.08, spec.h / 2 - 4.5, 0);
        bb.rotation.y = Math.PI / 2;
        bGroup.add(bb);
      } else if (spec.x === -70 && spec.z === -20) {
        // Twin Tower South - Facing East Runway
        const bb = createBillboardMesh('NEO SEOUL 2026', 'Smart Urban Aerial Mobility Expo', 'GLOBAL EXPO', '#3b82f6', '#facc15', 14, 6.0);
        bb.position.set(spec.w / 2 + 0.08, spec.h / 2 - 5.0, 0);
        bb.rotation.y = Math.PI / 2;
        bGroup.add(bb);
      } else if (spec.x === 35 && spec.z === 0) {
        // Commercial Plaza - Facing West Runway
        const bb = createBillboardMesh('CYBER ROBO CAFE', '24H High-Speed Drone Express', 'SHOPPING', '#f97316', '#fbbf24', 13, 5.5);
        bb.position.set(-spec.w / 2 - 0.08, spec.h / 2 - 4.0, 0);
        bb.rotation.y = -Math.PI / 2;
        bGroup.add(bb);
      } else if (spec.x === 35 && spec.z === 40) {
        // Gamma Building - Facing West Runway
        const bb = createBillboardMesh('QUANTUM ENERGY', 'Zero-Carbon Aero Battery Propellant', 'ECO POWER', '#8b5cf6', '#4ade80', 13, 5.5);
        bb.position.set(-spec.w / 2 - 0.08, spec.h / 2 - 4.0, 0);
        bb.rotation.y = -Math.PI / 2;
        bGroup.add(bb);
      } else if (spec.isHospital) {
        // General Hospital - Facing West
        const bb = createBillboardMesh('METRO 119 AIR RESCUE', 'Level-1 Emergency Trauma Center', 'EMERGENCY', '#ef4444', '#ffffff', 14, 5.5);
        bb.position.set(-spec.w / 2 - 0.08, spec.h / 2 - 3.5, 0);
        bb.rotation.y = -Math.PI / 2;
        bGroup.add(bb);
      }

      // Rooftop Communication Masts & Flashing Red Aviation Lights on Highrises
      if (spec.h >= 32) {
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.2, 5.5, 8),
          new THREE.MeshLambertMaterial({ color: 0x475569 })
        );
        mast.position.set(0, spec.h / 2 + 2.75, 0);
        bGroup.add(mast);

        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        beacon.position.set(0, spec.h / 2 + 5.5, 0);
        bGroup.add(beacon);
        this.redWarningLights.push(beacon);
      }

      if (spec.isRescueRooftop) {
        // Yellow emergency rooftop beacon pad
        const rPadGeo = new THREE.CircleGeometry(3.5, 32);
        const rPadMat = new THREE.MeshLambertMaterial({ color: 0xfef08a });
        const rPad = new THREE.Mesh(rPadGeo, rPadMat);
        rPad.rotation.x = -Math.PI / 2;
        rPad.position.y = spec.h / 2 + 0.82;
        bGroup.add(rPad);
      }

      // Cyber Glowing Corner LED Edges (All 4 vertical corners of high-tech buildings)
      const neonColorChoices = [0x00f0ff, 0xec4899, 0x38bdf8, 0xfacc15, 0xa855f7];
      const neonCol = neonColorChoices[Math.abs(Math.floor(spec.x * 7 + spec.z * 13)) % neonColorChoices.length];
      const cornerLedMat = new THREE.MeshBasicMaterial({ color: neonCol });
      
      const halfW = spec.w / 2;
      const halfD = spec.d / 2;
      [
        { cx: -halfW, cz: -halfD },
        { cx: halfW, cz: -halfD },
        { cx: -halfW, cz: halfD },
        { cx: halfW, cz: halfD }
      ].forEach(c => {
        const cLedGeo = new THREE.BoxGeometry(0.18, spec.h, 0.18);
        const cLedMesh = new THREE.Mesh(cLedGeo, cornerLedMat);
        cLedMesh.position.set(c.cx, 0, c.cz);
        bGroup.add(cLedMesh);
      });

      this.scene.add(bGroup);

      // Register collision box
      const box = new THREE.Box3();
      box.setFromCenterAndSize(
        new THREE.Vector3(spec.x, spec.h / 2, spec.z),
        new THREE.Vector3(spec.w, spec.h, spec.d)
      );
      this.buildingBoxes.push(box);
    });
  }

  private addBuildingWindows(group: THREE.Group, w: number, h: number, d: number) {
    const winMat = new THREE.MeshBasicMaterial({ 
      color: 0x38bdf8,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    }); // Cyber glowing cyan windows with zero Z-fighting
    const rows = Math.floor(h / 6);
    const cols = Math.floor(w / 5);

    for (let r = 1; r < rows; r++) {
      const y = -h / 2 + r * 6;
      for (let c = 0; c < cols; c++) {
        const x = -w / 2 + (c + 1) * (w / (cols + 1));
        // Front face
        const wMesh1 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), winMat);
        wMesh1.position.set(x, y, d / 2 + 0.15);
        group.add(wMesh1);

        // Back face
        const wMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), winMat);
        wMesh2.rotation.y = Math.PI;
        wMesh2.position.set(x, y, -d / 2 - 0.15);
        group.add(wMesh2);
      }
    }
  }

  private buildTreesAndPark() {
    const parkGroup = new THREE.Group();

    // 1. Central Park Plaza Zone (X: -10 to 10, Z: -75 to -45)
    // Decorative Plaza Pathway Pavers
    const plazaPaveGeo = new THREE.PlaneGeometry(28, 28);
    const plazaPaveMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const plazaPave = new THREE.Mesh(plazaPaveGeo, plazaPaveMat);
    plazaPave.rotation.x = -Math.PI / 2;
    plazaPave.position.set(0, 0.025, -60);
    plazaPave.receiveShadow = true;
    parkGroup.add(plazaPave);

    // Decorative Center Fountain with Water Shimmer
    const fountainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 5.0, 0.6, 16),
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    fountainBase.position.set(0, 0.3, -60);
    fountainBase.castShadow = true;
    fountainBase.receiveShadow = true;
    parkGroup.add(fountainBase);

    const fountainRim = new THREE.Mesh(
      new THREE.TorusGeometry(4.6, 0.25, 8, 16),
      new THREE.MeshLambertMaterial({ color: 0x64748b })
    );
    fountainRim.rotation.x = Math.PI / 2;
    fountainRim.position.set(0, 0.6, -60);
    parkGroup.add(fountainRim);

    const waterGeo = new THREE.CircleGeometry(4.4, 16);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.7,
      transparent: true,
      opacity: 0.85
    });
    this.fountainWater = new THREE.Mesh(waterGeo, waterMat);
    this.fountainWater.rotation.x = -Math.PI / 2;
    this.fountainWater.position.set(0, 0.55, -60);
    parkGroup.add(this.fountainWater);

    // Center Spout Pillar
    const spout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 1.8, 8),
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    spout.position.set(0, 0.9, -60);
    parkGroup.add(spout);

    // 2. Park Benches around the Plaza
    const benchPositions: [number, number, number][] = [
      [-8.5, -60, Math.PI / 2],
      [8.5, -60, -Math.PI / 2],
      [0, -68.5, 0],
      [0, -51.5, Math.PI]
    ];

    const benchWoodMat = new THREE.MeshLambertMaterial({ color: 0x9a3412 });
    const benchLegMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

    benchPositions.forEach(([bx, bz, rotY]) => {
      const bench = new THREE.Group();
      bench.position.set(bx, 0.03, bz);
      bench.rotation.y = rotY;

      // Wooden seat slats
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.6), benchWoodMat);
      seat.position.y = 0.5;
      bench.add(seat);

      // Backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.1), benchWoodMat);
      back.position.set(0, 0.8, -0.28);
      bench.add(back);

      // Metal legs
      [-0.9, 0.9].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.55), benchLegMat);
        leg.position.set(lx, 0.25, -0.05);
        bench.add(leg);
      });

      parkGroup.add(bench);
    });

    // 3. Diverse Natural Trees & Vegetation (Pines, Oaks, Lime Bushes)
    const treePositions = [
      // Park Plaza perimeter
      { x: -11, z: -48, type: 'oak', scale: 1.1 },
      { x: 11, z: -48, type: 'pine', scale: 1.2 },
      { x: -11, z: -72, type: 'pine', scale: 1.0 },
      { x: 11, z: -72, type: 'oak', scale: 1.15 },
      // Boulevard sidewalk trees
      { x: -17, z: -20, type: 'oak', scale: 1.0 },
      { x: -17, z: -40, type: 'pine', scale: 1.2 },
      { x: -17, z: 20, type: 'oak', scale: 1.0 },
      { x: -17, z: 40, type: 'pine', scale: 1.1 },
      { x: -17, z: 60, type: 'oak', scale: 1.0 },
      { x: 17, z: -20, type: 'pine', scale: 1.1 },
      { x: 17, z: -40, type: 'oak', scale: 1.0 },
      { x: 17, z: 20, type: 'pine', scale: 1.2 },
      { x: 17, z: 40, type: 'oak', scale: 1.0 },
      { x: 17, z: 60, type: 'pine', scale: 1.1 },
      // Outskirts & Green Belt
      { x: -45, z: 10, type: 'oak', scale: 1.3 },
      { x: -45, z: -50, type: 'pine', scale: 1.4 },
      { x: 45, z: 10, type: 'pine', scale: 1.2 },
      { x: 45, z: -50, type: 'oak', scale: 1.3 },
      { x: -25, z: 75, type: 'pine', scale: 1.2 },
      { x: 25, z: 75, type: 'oak', scale: 1.25 }
    ];

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const oakLeafMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    const pineLeafMat = new THREE.MeshLambertMaterial({ color: 0x15803d });

    treePositions.forEach(cfg => {
      const tree = new THREE.Group();
      tree.position.set(cfg.x, 0, cfg.z);
      tree.scale.set(cfg.scale, cfg.scale, cfg.scale);

      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 2.5, 8), trunkMat);
      trunk.position.y = 1.25;
      trunk.castShadow = true;
      tree.add(trunk);

      if (cfg.type === 'pine') {
        // Multi-tier conical pine
        [
          { r: 2.4, h: 2.8, y: 2.8 },
          { r: 1.9, h: 2.4, y: 4.2 },
          { r: 1.3, h: 2.0, y: 5.4 }
        ].forEach(tier => {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(tier.r, tier.h, 7), pineLeafMat);
          cone.position.y = tier.y;
          cone.castShadow = true;
          tree.add(cone);
        });
      } else {
        // Round leafy oak (spherical clusters)
        [
          { r: 2.2, x: 0, y: 3.5, z: 0 },
          { r: 1.5, x: 0.9, y: 4.2, z: 0.3 },
          { r: 1.4, x: -0.8, y: 4.0, z: -0.4 },
          { r: 1.3, x: 0.2, y: 4.8, z: 0 }
        ].forEach(c => {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(c.r, 8, 8), oakLeafMat);
          sphere.position.set(c.x, c.y, c.z);
          sphere.castShadow = true;
          tree.add(sphere);
        });
      }

      parkGroup.add(tree);
    });

    this.scene.add(parkGroup);
  }

  private buildHotAirBalloons() {
    this.hotAirBalloons = [];

    const balloonConfigs = [
      {
        x: -60,
        y: 48,
        z: -75,
        radius: 5.2,
        colors: [0xef4444, 0xf97316, 0xfacc15, 0x10b981, 0x06b6d4, 0x8b5cf6], // Rainbow gore stripes
        speed: 0.6,
        phase: 0.0
      },
      {
        x: 68,
        y: 54,
        z: -45,
        radius: 5.6,
        colors: [0xd97706, 0xdc2626, 0xffffff, 0x1e3a8a], // Golden Sunset Classic
        speed: 0.45,
        phase: 2.1
      },
      {
        x: -35,
        y: 60,
        z: 70,
        radius: 4.8,
        colors: [0x0d9488, 0x38bdf8, 0xffffff, 0x84cc16], // Aero Teal Sky
        speed: 0.55,
        phase: 4.2
      }
    ];

    balloonConfigs.forEach(cfg => {
      const bGroup = new THREE.Group();
      bGroup.position.set(cfg.x, cfg.y, cfg.z);

      const numGores = 12;
      const goreAngle = (Math.PI * 2) / numGores;

      // 1. Balloon Envelope (Slices with distinct colors forming vertical gore stripes)
      for (let i = 0; i < numGores; i++) {
        const color = cfg.colors[i % cfg.colors.length];
        const goreMat = new THREE.MeshLambertMaterial({ color });

        // Upper Dome Sphere slice
        const sphereGeo = new THREE.SphereGeometry(
          cfg.radius,
          8,
          16,
          i * goreAngle,
          goreAngle,
          0,
          Math.PI * 0.65
        );
        const sphereMesh = new THREE.Mesh(sphereGeo, goreMat);
        bGroup.add(sphereMesh);

        // Lower Tapering Cone slice
        const coneHeight = cfg.radius * 1.3;
        const coneGeo = new THREE.CylinderGeometry(
          cfg.radius * 0.95,
          cfg.radius * 0.32,
          coneHeight,
          4,
          1,
          false,
          i * goreAngle,
          goreAngle
        );
        const coneMesh = new THREE.Mesh(coneGeo, goreMat);
        coneMesh.position.y = -coneHeight * 0.65;
        bGroup.add(coneMesh);
      }

      // 2. Burner Ring & Flame Glow
      const burnerRim = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.radius * 0.34, 0.08, 8, 16),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
      );
      burnerRim.rotation.x = Math.PI / 2;
      burnerRim.position.y = -cfg.radius * 1.3;
      bGroup.add(burnerRim);

      const flameMesh = new THREE.Mesh(
        new THREE.ConeGeometry(cfg.radius * 0.18, cfg.radius * 0.45, 6),
        new THREE.MeshBasicMaterial({ color: 0xff7700 })
      );
      flameMesh.position.y = -cfg.radius * 1.2;
      bGroup.add(flameMesh);

      // 3. Four Suspension Rigging Cables
      const cableMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
      const basketY = -cfg.radius * 1.8;
      [-0.6, 0.6].forEach(cx => {
        [-0.6, 0.6].forEach(cz => {
          const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, cfg.radius * 0.65, 4);
          const cable = new THREE.Mesh(cableGeo, cableMat);
          cable.position.set(cx, (burnerRim.position.y + basketY) / 2, cz);
          bGroup.add(cable);
        });
      });

      // 4. Wicker Basket with Rim
      const basketMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Warm wicker brown
      const basket = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), basketMat);
      basket.position.y = basketY;
      basket.castShadow = true;
      bGroup.add(basket);

      // Passenger low-poly silhouettes
      const passMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
      const headMat = new THREE.MeshLambertMaterial({ color: 0xfde047 });
      [-0.3, 0.3].forEach(px => {
        const pass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8), passMat);
        pass.position.set(px, basketY + 0.6, 0);
        bGroup.add(pass);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), headMat);
        head.position.set(px, basketY + 1.0, 0);
        bGroup.add(head);
      });

      this.scene.add(bGroup);
      this.hotAirBalloons.push({
        group: bGroup,
        baseY: cfg.y,
        phase: cfg.phase,
        speed: cfg.speed,
        rotSpeed: (Math.random() * 0.04 + 0.02) * (Math.random() > 0.5 ? 1 : -1)
      });
    });
  }

  private buildPedestrians() {
    this.animatedPedestrians = [];

    const pedConfigs = [
      // 1. East sidewalk walking north-south
      { startX: 14.5, startZ: -25, minVal: -35, maxVal: 25, isX: false, speed: 2.2, color: 0x2563eb, hairColor: 0x1e293b },
      // 2. West sidewalk walking south-north
      { startX: -14.5, startZ: 20, minVal: -30, maxVal: 30, isX: false, speed: 1.8, color: 0xdb2777, hairColor: 0x78350f },
      // 3. Crossing zebra crosswalk at Z = 30
      { startX: -11, startZ: 30, minVal: -12, maxVal: 12, isX: true, speed: 1.6, color: 0x16a34a, hairColor: 0x0f172a },
      // 4. Hospital Avenue sidewalk walking east-west
      { startX: 25, startZ: -21, minVal: 18, maxVal: 62, isX: true, speed: 2.0, color: 0xea580c, hairColor: 0x475569 },
      // 5. Park Plaza stroll
      { startX: -15, startZ: -55, minVal: -25, maxVal: -5, isX: true, speed: 1.4, color: 0x9333ea, hairColor: 0xfacc15 },
      // 6. Park jogger
      { startX: 15, startZ: -55, minVal: -70, maxVal: -40, isX: false, speed: 3.5, color: 0x0284c7, hairColor: 0x1e293b }
    ];

    pedConfigs.forEach(cfg => {
      const pGroup = new THREE.Group();
      pGroup.position.set(cfg.startX, 0.15, cfg.startZ);

      const shirtMat = new THREE.MeshLambertMaterial({ color: cfg.color });
      const skinMat = new THREE.MeshLambertMaterial({ color: 0xfcd34d });
      const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const hairMat = new THREE.MeshLambertMaterial({ color: cfg.hairColor });

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), shirtMat);
      torso.position.y = 1.05;
      torso.castShadow = true;
      pGroup.add(torso);

      // Head & Hair
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), skinMat);
      head.position.y = 1.6;
      pGroup.add(head);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.38), hairMat);
      hair.position.y = 1.72;
      pGroup.add(hair);

      // Left Arm
      const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
      armGeo.translate(0, -0.22, 0); // Pivot at shoulder
      const leftArm = new THREE.Mesh(armGeo, shirtMat);
      leftArm.position.set(-0.36, 1.35, 0);
      pGroup.add(leftArm);

      // Right Arm
      const rightArm = new THREE.Mesh(armGeo, shirtMat);
      rightArm.position.set(0.36, 1.35, 0);
      pGroup.add(rightArm);

      // Left Leg
      const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
      legGeo.translate(0, -0.32, 0); // Pivot at hip
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.16, 0.7, 0);
      leftLeg.castShadow = true;
      pGroup.add(leftLeg);

      // Right Leg
      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.16, 0.7, 0);
      rightLeg.castShadow = true;
      pGroup.add(rightLeg);

      this.scene.add(pGroup);

      this.animatedPedestrians.push({
        group: pGroup,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        minVal: cfg.minVal,
        maxVal: cfg.maxVal,
        speed: cfg.speed,
        dir: 1,
        isX: cfg.isX,
        walkPhase: Math.random() * Math.PI * 2
      });
    });
  }

  private buildAnimalsAndBirds() {
    this.birdFlock = [];

    // 1. High-Sky Birds Flock (6 Doves/Hawks circling over park & buildings)
    const birdMats = [
      new THREE.MeshLambertMaterial({ color: 0xffffff }), // White dove
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 }), // Gray hawk
      new THREE.MeshLambertMaterial({ color: 0x334155 })  // Dark swallow
    ];

    for (let i = 0; i < 6; i++) {
      const bGroup = new THREE.Group();
      const mat = birdMats[i % birdMats.length];

      // Bird Body (Fuselage + Beak)
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.8, 6), mat);
      body.rotation.x = Math.PI / 2;
      bGroup.add(body);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      beak.rotation.x = Math.PI / 2;
      beak.position.z = 0.45;
      bGroup.add(beak);

      // Left Wing (Pivot at root)
      const wingGeo = new THREE.PlaneGeometry(0.65, 0.35);
      wingGeo.translate(-0.32, 0, 0);
      const leftWing = new THREE.Mesh(wingGeo, mat);
      leftWing.rotation.x = Math.PI / 2;
      bGroup.add(leftWing);

      // Right Wing (Pivot at root)
      const rWingGeo = new THREE.PlaneGeometry(0.65, 0.35);
      rWingGeo.translate(0.32, 0, 0);
      const rightWing = new THREE.Mesh(rWingGeo, mat);
      rightWing.rotation.x = Math.PI / 2;
      bGroup.add(rightWing);

      this.scene.add(bGroup);

      this.birdFlock.push({
        group: bGroup,
        leftWing,
        rightWing,
        center: new THREE.Vector3(0, 0, -20),
        radius: 38 + i * 4.5,
        height: 28 + (i % 3) * 4.5,
        angle: (i / 6) * Math.PI * 2,
        speed: 0.35 + (i % 2) * 0.08,
        flapSpeed: 9.0 + (i % 3) * 1.5,
        flapPhase: i * 1.2
      });
    }

    // 2. Cute Park Dog trotting in the green park plaza
    const dogGroup = new THREE.Group();
    dogGroup.position.set(-6, 0.15, -48);

    const dogMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Golden amber coat
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });

    // Body
    const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.7), dogMat);
    dBody.position.y = 0.35;
    dogGroup.add(dBody);

    // Head & Snout
    const dHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.35), dogMat);
    dHead.position.set(0, 0.58, 0.38);
    dogGroup.add(dHead);

    const dSnout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.2), darkMat);
    dSnout.position.set(0, 0.52, 0.58);
    dogGroup.add(dSnout);

    // Ears
    [-0.14, 0.14].forEach(ex => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.1), darkMat);
      ear.position.set(ex, 0.7, 0.32);
      dogGroup.add(ear);
    });

    // Wagging Tail
    const tailGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.35, 6);
    tailGeo.translate(0, 0.16, 0);
    const tail = new THREE.Mesh(tailGeo, dogMat);
    tail.position.set(0, 0.45, -0.35);
    tail.rotation.x = -Math.PI / 4;
    dogGroup.add(tail);

    // 4 Legs
    const dLegs: THREE.Mesh[] = [];
    const legGeo = new THREE.BoxGeometry(0.1, 0.28, 0.1);
    legGeo.translate(0, -0.12, 0);

    [
      [-0.14, 0.28, 0.22], [0.14, 0.28, 0.22],
      [-0.14, 0.28, -0.22], [0.14, 0.28, -0.22]
    ].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, dogMat);
      leg.position.set(lx, ly, lz);
      dogGroup.add(leg);
      dLegs.push(leg);
    });

    this.scene.add(dogGroup);

    this.parkDog = {
      group: dogGroup,
      tail,
      head: dHead,
      legs: dLegs,
      minX: -14,
      maxX: 2,
      speed: 1.5,
      dir: 1,
      walkPhase: 0
    };
  }

  private updateEnvironment(dt: number) {
    const time = performance.now() * 0.001;

    // 1. Hot Air Balloons Floating and Swaying
    this.hotAirBalloons.forEach(b => {
      b.group.position.y = b.baseY + Math.sin(time * b.speed + b.phase) * 1.8;
      b.group.rotation.y += b.rotSpeed * dt;
      b.group.rotation.z = Math.sin(time * 0.5 + b.phase) * 0.03;
    });

    // 2. Pedestrians Walking Animation
    this.animatedPedestrians.forEach(p => {
      p.walkPhase += dt * p.speed * 3.5;
      const swing = Math.sin(p.walkPhase) * 0.45;

      p.leftLeg.rotation.x = swing;
      p.rightLeg.rotation.x = -swing;
      p.leftArm.rotation.x = -swing * 0.8;
      p.rightArm.rotation.x = swing * 0.8;

      if (p.isX) {
        p.group.position.x += p.dir * p.speed * dt;
        if (p.group.position.x > p.maxVal) {
          p.group.position.x = p.maxVal;
          p.dir = -1;
          p.group.rotation.y = -Math.PI / 2;
        } else if (p.group.position.x < p.minVal) {
          p.group.position.x = p.minVal;
          p.dir = 1;
          p.group.rotation.y = Math.PI / 2;
        }
      } else {
        p.group.position.z += p.dir * p.speed * dt;
        if (p.group.position.z > p.maxVal) {
          p.group.position.z = p.maxVal;
          p.dir = -1;
          p.group.rotation.y = Math.PI;
        } else if (p.group.position.z < p.minVal) {
          p.group.position.z = p.minVal;
          p.dir = 1;
          p.group.rotation.y = 0;
        }
      }
    });

    // 3. Birds Flock Circling and Wing Flapping
    this.birdFlock.forEach(bird => {
      bird.angle += bird.speed * dt;
      const x = bird.center.x + Math.cos(bird.angle) * bird.radius;
      const z = bird.center.z + Math.sin(bird.angle) * bird.radius;
      const y = bird.height + Math.sin(time * 1.5 + bird.flapPhase) * 1.2;

      bird.group.position.set(x, y, z);
      bird.group.rotation.y = -bird.angle + Math.PI / 2;
      bird.group.rotation.z = -0.22; // Banking roll into curve

      const wingFlap = Math.sin(time * bird.flapSpeed + bird.flapPhase) * 0.45;
      bird.leftWing.rotation.y = wingFlap;
      bird.rightWing.rotation.y = -wingFlap;
    });

    // 4. Park Dog Trotting and Wagging Tail
    if (this.parkDog) {
      const dog = this.parkDog;
      dog.walkPhase += dt * dog.speed * 5.0;
      dog.tail.rotation.y = Math.sin(time * 12) * 0.6; // Energetic tail wag
      dog.head.rotation.y = Math.sin(time * 3) * 0.15;

      const legSwing = Math.sin(dog.walkPhase) * 0.4;
      dog.legs[0].rotation.x = legSwing;
      dog.legs[1].rotation.x = -legSwing;
      dog.legs[2].rotation.x = -legSwing;
      dog.legs[3].rotation.x = legSwing;

      dog.group.position.x += dog.dir * dog.speed * dt;
      if (dog.group.position.x > dog.maxX) {
        dog.group.position.x = dog.maxX;
        dog.dir = -1;
        dog.group.rotation.y = -Math.PI / 2;
      } else if (dog.group.position.x < dog.minX) {
        dog.group.position.x = dog.minX;
        dog.dir = 1;
        dog.group.rotation.y = Math.PI / 2;
      }
    }

    // 5. Red Aviation Warning Lights Blinking
    const beaconBlink = Math.sin(time * 3.5) > 0.1;
    this.redWarningLights.forEach(light => {
      light.visible = beaconBlink;
    });

    // 6. Fountain Water Shimmer Rotation
    if (this.fountainWater) {
      this.fountainWater.rotation.z += dt * 0.5;
    }

    // 7. Cyber Moon Orbital Rings & Satellite Revolution
    if (this.cyberMoonRings.length > 0) {
      this.cyberMoonRings[0].rotation.z += dt * 0.25;
      if (this.cyberMoonRings[1]) {
        this.cyberMoonRings[1].rotation.z -= dt * 0.20;
      }
    }

    // 8. Towering Sky Beacon Laser Searchlights Pulsing & Beam Sway
    this.skyBeacons.forEach((beacon) => {
      const pulse = Math.sin(time * beacon.pulseSpeed);
      const targetOpacity = beacon.baseOpacity * (0.8 + 0.3 * pulse);
      (beacon.mesh.material as THREE.MeshBasicMaterial).opacity = targetOpacity;
      if (beacon.light) {
        beacon.light.intensity = 1.4 + 0.6 * pulse;
      }
    });

    // 9. Heavy Sci-Fi Cargo Skycruisers Cruising with Banking Roll & Strobe Blinks
    const strobeBlink = Math.sin(time * 6.0) > 0.3;
    this.skyCruisers.forEach((cruiser) => {
      cruiser.angle += cruiser.speed * dt;
      const cx = Math.cos(cruiser.angle) * cruiser.radius;
      const cz = Math.sin(cruiser.angle) * cruiser.radius;
      const cy = cruiser.height + Math.sin(time * 0.8 + cruiser.radius) * 1.5;

      cruiser.group.position.set(cx, cy, cz);
      
      // Face flight direction and bank realistically into turns
      if (cruiser.speed > 0) {
        cruiser.group.rotation.y = -cruiser.angle + Math.PI / 2;
        cruiser.group.rotation.z = -0.15; // Inward bank
      } else {
        cruiser.group.rotation.y = -cruiser.angle - Math.PI / 2;
        cruiser.group.rotation.z = 0.15; // Inward bank
      }

      // Blink navigation strobes
      cruiser.strobes.forEach((strobe) => {
        strobe.visible = strobeBlink;
      });
    });

    // 10. Floating Holographic Data Relays (Gentle Levitating Bob and Double Ring Counter-Rotation)
    this.floatingDataRelays.forEach((relay) => {
      relay.group.position.y = relay.baseY + Math.sin(time * relay.floatSpeed) * 1.8;
      relay.innerRing.rotation.x += dt * relay.rotSpeed;
      relay.innerRing.rotation.y += dt * relay.rotSpeed * 0.7;
      relay.outerRing.rotation.y -= dt * relay.rotSpeed * 0.8;
      relay.outerRing.rotation.z += dt * relay.rotSpeed * 0.5;
    });
  }

  private buildDustRing() {
    const geo = new THREE.RingGeometry(0.8, 1.4, 24);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.0, 
      side: THREE.DoubleSide 
    });
    this.dustRing = new THREE.Mesh(geo, mat);
    this.dustRing.rotation.x = -Math.PI / 2;
    this.dustRing.position.y = 0.05;
    this.scene.add(this.dustRing);
  }

  public updateSkin(skin: DroneSkin) {
    this.currentSkin = skin;
    this.buildDroneModel();
  }

  private buildDroneModel() {
    // Remove old
    if (this.droneGroup) {
      this.scene.remove(this.droneGroup);
    }

    this.droneGroup = new THREE.Group();
    this.droneModelHolder = new THREE.Group();
    // Invert 180° so the nose/canopy/headlights face forward (-Z in flight coordinates)
    this.droneModelHolder.rotation.y = Math.PI;
    this.droneGroup.add(this.droneModelHolder);

    this.propMeshes = [];
    this.ledLights = [];
    this.jetFlameMeshes = [];

    const primaryColor = new THREE.Color(this.currentSkin.primaryColor);
    const secondaryColor = new THREE.Color(this.currentSkin.secondaryColor);
    const propColor = new THREE.Color(this.currentSkin.propColor);
    const ledColor = new THREE.Color(this.currentSkin.ledColor);

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: primaryColor, 
      metalness: 0.35, 
      roughness: 0.35 
    });
    const accentMat = new THREE.MeshStandardMaterial({ 
      color: secondaryColor, 
      metalness: 0.6, 
      roughness: 0.25 
    });
    const carbonMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.85 
    });
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85
    });

    switch (this.currentSkin.modelType) {
      case 'HEXA_RESCUE':
        this.buildHexaRescueModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'TWIN_RACER':
        this.buildTwinRacerModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'OCTA_EXPLORER':
        this.buildOctaExplorerModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'CYBER_JET':
        this.buildCyberJetModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'STEALTH_ACE':
        this.buildStealthAceModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'QUAD_PROBE':
      default:
        this.buildQuadProbeModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
    }

    // Magnetic Rescue Tractor Beam (Invisible by default, glows when active)
    const beamGeo = new THREE.ConeGeometry(0.6, 2.2, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ 
      color: 0x38bdf8, 
      transparent: true, 
      opacity: 0.0, 
      side: THREE.DoubleSide 
    });
    this.tractorBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.tractorBeamMesh.rotation.x = Math.PI;
    this.tractorBeamMesh.position.y = -1.1;
    this.droneGroup.add(this.tractorBeamMesh);

    this.droneGroup.position.copy(this.position);
    this.scene.add(this.droneGroup);
  }

  // 1. Classic Quad Probe X-4 (X-Quad with Safety Ring Duct Guards & Front Camera Eye)
  private buildQuadProbeModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    const coreGeo = new THREE.SphereGeometry(0.42, 24, 18);
    coreGeo.scale(1.2, 0.75, 1.3);
    this.droneBodyMesh = new THREE.Mesh(coreGeo, bodyMat);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    const visorGeo = new THREE.SphereGeometry(0.28, 16, 16);
    visorGeo.scale(1.0, 0.6, 1.1);
    const visor = new THREE.Mesh(visorGeo, canopyMat);
    visor.position.set(0, 0.1, 0.22);
    this.droneModelHolder.add(visor);

    const eyeGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.08, 0.45);
    this.droneModelHolder.add(eye);

    const armDistance = 0.68;
    const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    armAngles.forEach((angle, idx) => {
      const armLength = armDistance;
      const x = Math.cos(angle) * armLength;
      const z = Math.sin(angle) * armLength;

      const armGeo = new THREE.CylinderGeometry(0.045, 0.045, armLength, 8);
      const arm = new THREE.Mesh(armGeo, carbonMat);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -angle;
      arm.position.set(x / 2, 0, z / 2);
      this.droneModelHolder.add(arm);

      const motorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16);
      const motor = new THREE.Mesh(motorGeo, accentMat);
      motor.position.set(x, 0.05, z);
      motor.castShadow = true;
      this.droneModelHolder.add(motor);

      const ringGeo = new THREE.TorusGeometry(0.32, 0.025, 8, 24);
      const guard = new THREE.Mesh(ringGeo, accentMat);
      guard.rotation.x = Math.PI / 2;
      guard.position.set(x, 0.14, z);
      this.droneModelHolder.add(guard);

      const propGroup = new THREE.Group();
      propGroup.position.set(x, 0.16, z);

      const bladeGeo = new THREE.BoxGeometry(0.56, 0.012, 0.06);
      const bladeMat = new THREE.MeshStandardMaterial({ color: propColor, metalness: 0.1, roughness: 0.5 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      propGroup.add(blade);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), accentMat);
      propGroup.add(hub);

      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);

      const ledColorHex = (idx === 0 || idx === 3) ? 0x22c55e : 0xef4444;
      const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: ledColorHex }));
      ledMesh.position.set(x, -0.06, z);
      this.droneModelHolder.add(ledMesh);

      const light = new THREE.PointLight(ledColorHex, 0.6, 4);
      light.position.set(x, -0.06, z);
      this.droneModelHolder.add(light);
      this.ledLights.push(light);
    });

    // Landing skids
    const skidMat = carbonMat;
    const skidLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.7), skidMat);
    skidLeft.position.set(-0.32, -0.22, 0);
    this.droneModelHolder.add(skidLeft);

    const skidRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.7), skidMat);
    skidRight.position.set(0.32, -0.22, 0);
    this.droneModelHolder.add(skidRight);

    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8);
    [-0.32, 0.32].forEach(lx => {
      [-0.2, 0.2].forEach(lz => {
        const leg = new THREE.Mesh(legGeo, skidMat);
        leg.position.set(lx, -0.11, lz);
        this.droneModelHolder.add(leg);
      });
    });
  }

  // 2. Heavy Hexacopter Rescue Frame (6 Motors, Flashing Emergency Siren Lightbar, Dual Searchlights)
  private buildHexaRescueModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Rugged Hexagonal Core Fuselage
    const hexaGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.35, 6);
    this.droneBodyMesh = new THREE.Mesh(hexaGeo, bodyMat);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // High-visibility Emergency Hazard Stripes on Roof
    const stripeGeo = new THREE.BoxGeometry(0.8, 0.02, 0.12);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe1.position.set(0, 0.18, 0.15);
    this.droneModelHolder.add(stripe1);

    const stripe2 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe2.position.set(0, 0.18, -0.15);
    this.droneModelHolder.add(stripe2);

    // Rooftop Flashing Emergency Lightbar (Red + Blue)
    const lightbarBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.08, 0.16),
      new THREE.MeshLambertMaterial({ color: 0x0f172a })
    );
    lightbarBase.position.set(0, 0.22, 0);
    this.droneModelHolder.add(lightbarBase);

    const redSiren = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    redSiren.position.set(-0.12, 0.28, 0);
    this.droneModelHolder.add(redSiren);

    const blueSiren = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
    );
    blueSiren.position.set(0.12, 0.28, 0);
    this.droneModelHolder.add(blueSiren);

    // Dual Forward High-Beam LED Searchlights
    [-0.22, 0.22].forEach(hx => {
      const searchLightGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 12);
      const searchLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const slMesh = new THREE.Mesh(searchLightGeo, searchLightMat);
      slMesh.rotation.x = Math.PI / 2;
      slMesh.position.set(hx, 0.02, 0.45);
      this.droneModelHolder.add(slMesh);
    });

    // 6 Hexacopter Carbon Motor Arms (Every 60 degrees!)
    const armDistance = 0.78;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = Math.cos(angle) * armDistance;
      const z = Math.sin(angle) * armDistance;

      // Heavy dual truss arm
      const armGeo = new THREE.CylinderGeometry(0.04, 0.04, armDistance, 8);
      const arm = new THREE.Mesh(armGeo, carbonMat);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -angle;
      arm.position.set(x / 2, 0, z / 2);
      this.droneModelHolder.add(arm);

      // Heavy motor mount
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 16), accentMat);
      motor.position.set(x, 0.08, z);
      this.droneModelHolder.add(motor);

      // Hexa Propeller
      const propGroup = new THREE.Group();
      propGroup.position.set(x, 0.19, z);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.012, 0.065),
        new THREE.MeshStandardMaterial({ color: propColor, roughness: 0.4 })
      );
      propGroup.add(blade);
      propGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), accentMat));
      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);

      // Arm navigation LEDs
      const isFront = (i === 0 || i === 5 || i === 1);
      const ledColorHex = isFront ? 0xef4444 : 0xfbbf24;
      const light = new THREE.PointLight(ledColorHex, 0.6, 4);
      light.position.set(x, -0.08, z);
      this.droneModelHolder.add(light);
      this.ledLights.push(light);
    }

    // Heavy Rescue Triangular Base Skids
    const heavySkidGeo = new THREE.BoxGeometry(0.06, 0.04, 0.85);
    const s1 = new THREE.Mesh(heavySkidGeo, carbonMat);
    s1.position.set(-0.38, -0.24, 0);
    this.droneModelHolder.add(s1);

    const s2 = new THREE.Mesh(heavySkidGeo, carbonMat);
    s2.position.set(0.38, -0.24, 0);
    this.droneModelHolder.add(s2);
  }

  // 3. Twin-Boom Racing Speedster (Aerodynamic Canard Wings, Twin Longitudinal Carbon Booms, Racing Spoiler)
  private buildTwinRacerModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Ultra-low Wedge Racing Fuselage
    const fuselageGeo = new THREE.BoxGeometry(0.36, 0.18, 1.1);
    this.droneBodyMesh = new THREE.Mesh(fuselageGeo, bodyMat);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // Aerodynamic Cockpit Bubble
    const canopyGeo = new THREE.SphereGeometry(0.2, 16, 12);
    canopyGeo.scale(0.8, 0.5, 2.2);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.1, -0.05);
    this.droneModelHolder.add(canopy);

    // Front Canard Downforce Wings
    const canardGeo = new THREE.BoxGeometry(0.9, 0.02, 0.2);
    const canard = new THREE.Mesh(canardGeo, accentMat);
    canard.position.set(0, 0.02, 0.25);
    this.droneModelHolder.add(canard);

    // Twin Longitudinal Carbon Booms (Left & Right Spars)
    const boomGeo = new THREE.BoxGeometry(0.06, 0.06, 1.3);
    const boomL = new THREE.Mesh(boomGeo, carbonMat);
    boomL.position.set(-0.42, 0, 0);
    this.droneModelHolder.add(boomL);

    const boomR = new THREE.Mesh(boomGeo, carbonMat);
    boomR.position.set(0.42, 0, 0);
    this.droneModelHolder.add(boomR);

    // Rear Aerodynamic Racing Downforce Spoiler
    const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.22), accentMat);
    spoilerWing.position.set(0, 0.22, -0.48);
    this.droneModelHolder.add(spoilerWing);

    // Spoiler Endplates
    const endplateGeo = new THREE.BoxGeometry(0.02, 0.18, 0.24);
    const endplateL = new THREE.Mesh(endplateGeo, bodyMat);
    endplateL.position.set(-0.5, 0.22, -0.48);
    this.droneModelHolder.add(endplateL);

    const endplateR = new THREE.Mesh(endplateGeo, bodyMat);
    endplateR.position.set(0.5, 0.22, -0.48);
    this.droneModelHolder.add(endplateR);

    // 4 High-Pitch Racing Motors at Boom Ends
    const motorPositions = [
      { x: -0.42, z: 0.52 },
      { x: 0.42, z: 0.52 },
      { x: -0.42, z: -0.52 },
      { x: 0.42, z: -0.52 }
    ];

    motorPositions.forEach((mp, idx) => {
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 16), accentMat);
      motor.position.set(mp.x, 0.08, mp.z);
      this.droneModelHolder.add(motor);

      // Oversized 3-Blade Racing Propellers
      const propGroup = new THREE.Group();
      propGroup.position.set(mp.x, 0.18, mp.z);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.012, 0.08),
        new THREE.MeshStandardMaterial({ color: propColor, roughness: 0.3, metalness: 0.3 })
      );
      propGroup.add(blade);
      propGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), bodyMat));
      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);

      const ledColorHex = mp.z > 0 ? 0xfacc15 : 0xef4444;
      const light = new THREE.PointLight(ledColorHex, 0.7, 4);
      light.position.set(mp.x, -0.06, mp.z);
      this.droneModelHolder.add(light);
      this.ledLights.push(light);
    });

    // Low-profile racing skids
    const rskidL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.6), carbonMat);
    rskidL.position.set(-0.25, -0.16, 0);
    this.droneModelHolder.add(rskidL);

    const rskidR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.6), carbonMat);
    rskidR.position.set(0.25, -0.16, 0);
    this.droneModelHolder.add(rskidR);
  }

  // 4. Heavy Octa Explorer (8 Coaxial Counter-Rotating Rotors, 3-Axis 4K Camera Gimbal, Expedition Base)
  private buildOctaExplorerModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Octagonal Expedition Body
    const octGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 8);
    this.droneBodyMesh = new THREE.Mesh(octGeo, bodyMat);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // Top Satellite GPS Antenna Mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8), carbonMat);
    mast.position.set(0, 0.3, -0.1);
    this.droneModelHolder.add(mast);

    const gpsDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), accentMat);
    gpsDisc.position.set(0, 0.44, -0.1);
    this.droneModelHolder.add(gpsDisc);

    // Bottom 3-Axis Gyro Gimbal 4K Optical Sphere Camera
    const gimbalArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), carbonMat);
    gimbalArm.position.set(0, -0.22, 0.18);
    this.droneModelHolder.add(gimbalArm);

    const cameraSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 })
    );
    cameraSphere.position.set(0, -0.32, 0.22);
    this.droneModelHolder.add(cameraSphere);

    // Glowing Optical Camera Lens
    const lens = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.1, 16),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
    );
    lens.position.set(0, -0.32, 0.38);
    this.droneModelHolder.add(lens);

    // 4 Heavy Coaxial Motor Arms carrying 8 counter-rotating propellers!
    const armDistance = 0.72;
    const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    armAngles.forEach((angle, idx) => {
      const x = Math.cos(angle) * armDistance;
      const z = Math.sin(angle) * armDistance;

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, armDistance, 8), carbonMat);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -angle;
      arm.position.set(x / 2, 0, z / 2);
      this.droneModelHolder.add(arm);

      // Dual Coaxial Motor Mount (Upper & Lower)
      const motorHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 16), accentMat);
      motorHousing.position.set(x, 0.02, z);
      this.droneModelHolder.add(motorHousing);

      // Upper Propeller (Clockwise)
      const topPropGroup = new THREE.Group();
      topPropGroup.position.set(x, 0.20, z);
      const topBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.012, 0.06),
        new THREE.MeshStandardMaterial({ color: propColor, roughness: 0.4 })
      );
      topPropGroup.add(topBlade);
      this.droneModelHolder.add(topPropGroup);
      this.propMeshes.push(topBlade);

      // Lower Propeller (Counter-Clockwise)
      const btmPropGroup = new THREE.Group();
      btmPropGroup.position.set(x, -0.16, z);
      const btmBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.012, 0.06),
        new THREE.MeshStandardMaterial({ color: propColor, roughness: 0.4 })
      );
      btmPropGroup.add(btmBlade);
      this.droneModelHolder.add(btmPropGroup);
      this.propMeshes.push(btmBlade);

      const light = new THREE.PointLight(0x10b981, 0.6, 4);
      light.position.set(x, 0, z);
      this.droneModelHolder.add(light);
      this.ledLights.push(light);
    });

    // 4 Wide Expedition Shock-Absorbing Landing Feet
    armAngles.forEach(angle => {
      const fx = Math.cos(angle) * 0.48;
      const fz = Math.sin(angle) * 0.48;

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 8), carbonMat);
      leg.position.set(fx, -0.22, fz);
      this.droneModelHolder.add(leg);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), accentMat);
      foot.position.set(fx, -0.34, fz);
      this.droneModelHolder.add(foot);
    });
  }

  // 5. Cyber Jet Quad (Futuristic Delta-Wing Aero Fuselage, Neon Light Strips, Plasma Jet Nozzles)
  private buildCyberJetModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Sharp Futuristic Delta Wing Body
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.65);       // Nose
    wingShape.lineTo(0.62, -0.45);   // Right wingtip
    wingShape.lineTo(0.35, -0.55);   // Right engine notch
    wingShape.lineTo(0, -0.42);      // Rear center
    wingShape.lineTo(-0.35, -0.55);  // Left engine notch
    wingShape.lineTo(-0.62, -0.45);  // Left wingtip
    wingShape.closePath();

    const extrudeSettings = { depth: 0.14, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.center();
    this.droneBodyMesh = new THREE.Mesh(wingGeo, bodyMat);
    this.droneBodyMesh.rotation.x = Math.PI / 2;
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // Glowing Neon Edge Piping along Delta Wings (Cyan & Magenta Cyberpunk Glow)
    const neonEdgeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.2), neonEdgeMat);
    edgeL.rotation.y = -Math.PI / 6;
    edgeL.position.set(-0.32, 0.06, 0.05);
    this.droneModelHolder.add(edgeL);

    const edgeR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.2), neonEdgeMat);
    edgeR.rotation.y = Math.PI / 6;
    edgeR.position.set(0.32, 0.06, 0.05);
    this.droneModelHolder.add(edgeR);

    // Streamlined Stealth Canopy
    const jetCanopyGeo = new THREE.SphereGeometry(0.18, 16, 12);
    jetCanopyGeo.scale(0.7, 0.45, 2.4);
    const jetCanopy = new THREE.Mesh(jetCanopyGeo, canopyMat);
    jetCanopy.position.set(0, 0.12, 0.08);
    this.droneModelHolder.add(jetCanopy);

    // Twin Rear Cylindrical Plasma Jet Exhaust Thrusters
    [-0.22, 0.22].forEach(jx => {
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.28, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 })
      );
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(jx, 0.02, -0.48);
      this.droneModelHolder.add(nozzle);

      // Glowing Blue/Purple Plasma Core Disc
      const plasmaDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.09, 16),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
      );
      plasmaDisc.position.set(jx, 0.02, -0.63);
      this.droneModelHolder.add(plasmaDisc);
      this.jetFlameMeshes.push(plasmaDisc);

      const jetLight = new THREE.PointLight(0x00f0ff, 1.2, 5);
      jetLight.position.set(jx, 0.02, -0.7);
      this.droneModelHolder.add(jetLight);
      this.ledLights.push(jetLight);
    });

    // 4 Enclosed Turbine Ducts & Propellers
    const ductPositions = [
      { x: -0.44, z: 0.28 },
      { x: 0.44, z: 0.28 },
      { x: -0.44, z: -0.28 },
      { x: 0.44, z: -0.28 }
    ];

    ductPositions.forEach(dp => {
      // Carbon turbine duct
      const duct = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 20), carbonMat);
      duct.rotation.x = Math.PI / 2;
      duct.position.set(dp.x, 0.08, dp.z);
      this.droneModelHolder.add(duct);

      const propGroup = new THREE.Group();
      propGroup.position.set(dp.x, 0.08, dp.z);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.50, 0.012, 0.06),
        new THREE.MeshStandardMaterial({ color: propColor, roughness: 0.3 })
      );
      propGroup.add(blade);
      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);
    });
  }

  // 6. Stealth Phantom Night Wing (Radar-Evading Diamond Fuselage, Twin Canted Tailfins, Stealth Laser Sensor)
  private buildStealthAceModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Faceted Diamond Stealth Body
    const stealthGeo = new THREE.ConeGeometry(0.55, 1.2, 4);
    this.droneBodyMesh = new THREE.Mesh(stealthGeo, bodyMat);
    this.droneBodyMesh.rotation.x = Math.PI / 2;
    this.droneBodyMesh.scale.set(1.2, 1.0, 0.4);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // Twin Canted Vertical Stabilizer Tailfins (Stealth Angle)
    const finGeo = new THREE.BoxGeometry(0.03, 0.35, 0.4);
    const finL = new THREE.Mesh(finGeo, accentMat);
    finL.position.set(-0.28, 0.18, -0.38);
    finL.rotation.z = -Math.PI / 8;
    this.droneModelHolder.add(finL);

    const finR = new THREE.Mesh(finGeo, accentMat);
    finR.position.set(0.28, 0.18, -0.38);
    finR.rotation.z = Math.PI / 8;
    this.droneModelHolder.add(finR);

    // Glowing Cyan Pulsating Stealth Eye Slit
    const sensorSlit = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.03, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    sensorSlit.position.set(0, 0.04, 0.52);
    this.droneModelHolder.add(sensorSlit);

    // 4 Low-Noise Stealth Motor Arms
    const armDistance = 0.65;
    const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    armAngles.forEach((angle, idx) => {
      const x = Math.cos(angle) * armDistance;
      const z = Math.sin(angle) * armDistance;

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, armDistance), carbonMat);
      arm.rotation.y = -angle;
      arm.position.set(x / 2, 0, z / 2);
      this.droneModelHolder.add(arm);

      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.14, 16), carbonMat);
      motor.position.set(x, 0.06, z);
      this.droneModelHolder.add(motor);

      // Stealth Matte Propellers with Glowing Tip Trim
      const propGroup = new THREE.Group();
      propGroup.position.set(x, 0.14, z);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.01, 0.055),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
      );
      propGroup.add(blade);

      // Cyan blade tips
      const tip1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.056), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
      tip1.position.x = 0.25;
      propGroup.add(tip1);

      const tip2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.056), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
      tip2.position.x = -0.25;
      propGroup.add(tip2);

      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);

      const light = new THREE.PointLight(0x06b6d4, 0.5, 3.5);
      light.position.set(x, -0.05, z);
      this.droneModelHolder.add(light);
      this.ledLights.push(light);
    });

    // Integrated low drag stealth skids
    const skidGeo = new THREE.BoxGeometry(0.04, 0.02, 0.5);
    const skL = new THREE.Mesh(skidGeo, carbonMat);
    skL.position.set(-0.28, -0.15, 0);
    this.droneModelHolder.add(skL);

    const skR = new THREE.Mesh(skidGeo, carbonMat);
    skR.position.set(0.28, -0.15, 0);
    this.droneModelHolder.add(skR);
  }

  // AI Drone Setup
  public setupAiDrone() {
    if (this.aiDroneGroup) {
      this.scene.remove(this.aiDroneGroup);
    }

    this.aiDroneGroup = new THREE.Group();
    this.aiProps = [];

    // High-performance cyber racing drone aesthetics
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x6d28d9, // Royal AI Violet
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.4
    });
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xec4899 }); // Neon Magenta
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });

    // Sleek Aerodynamic Core Fuselage
    const coreGeo = new THREE.CylinderGeometry(0.32, 0.42, 0.22, 16);
    const core = new THREE.Mesh(coreGeo, bodyMat);
    core.castShadow = true;
    this.aiDroneGroup.add(core);

    // Glowing Cyber Sensor Eyes (Front Twin Sensors)
    [-0.12, 0.12].forEach(ox => {
      const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ox, 0.05, 0.38);
      this.aiDroneGroup!.add(eye);
    });

    // Top Aerodynamic Fin
    const finGeo = new THREE.BoxGeometry(0.06, 0.18, 0.5);
    const fin = new THREE.Mesh(finGeo, neonMat);
    fin.position.set(0, 0.18, -0.05);
    this.aiDroneGroup.add(fin);

    // 4 Carbon-Fiber Quad Arms & Glowing Racing Rotors
    const armDistance = 0.55;
    const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    angles.forEach((angle, idx) => {
      const x = Math.cos(angle) * armDistance;
      const z = Math.sin(angle) * armDistance;

      // Arm Spar
      const armGeo = new THREE.BoxGeometry(0.12, 0.06, armDistance);
      const arm = new THREE.Mesh(armGeo, goldMat);
      arm.position.set(x * 0.5, 0, z * 0.5);
      arm.rotation.y = -angle + Math.PI / 2;
      this.aiDroneGroup!.add(arm);

      // Motor Pod
      const podGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12);
      const pod = new THREE.Mesh(podGeo, bodyMat);
      pod.position.set(x, 0.04, z);
      this.aiDroneGroup!.add(pod);

      // Motor LED Ring
      const ringGeo = new THREE.RingGeometry(0.1, 0.14, 12);
      const motorRing = new THREE.Mesh(ringGeo, neonMat);
      motorRing.rotation.x = -Math.PI / 2;
      motorRing.position.set(x, 0.12, z);
      this.aiDroneGroup!.add(motorRing);

      // Propellers
      const propGeo = new THREE.BoxGeometry(0.46, 0.015, 0.06);
      const propMat = new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0xf43f5e : 0xec4899 });
      const prop = new THREE.Mesh(propGeo, propMat);
      prop.position.set(x, 0.14, z);
      this.aiDroneGroup!.add(prop);
      this.aiProps.push(prop);
    });

    // AI Drone floating position at start line (Right grid slot beside player)
    this.aiDroneGroup.position.set(2.5, 0.4, 0);
    this.scene.add(this.aiDroneGroup);

    this.aiRacerState = {
      position: { x: 2.5, y: 0.4, z: 0 },
      currentWaypointIdx: 1, // Start aiming immediately at Central Park Arch (Waypoint 1)
      speed: 0,
      lap: 1,
      finished: false,
      finishTimeSec: null
    };
  }

  // Mission Loading
  public loadMission(stage: MissionStage) {
    this.currentStage = stage;
    this.isRaceReady = false;
    this.clearMissionObjects();
    this.resetDronePosition();

    // Stage 6: Strictly lock speed gear to 2 (Sport Mode) for both AI and Player
    // Also remove the yellow landing pad specifically for Stage 6 race grid
    const isStage6 = stage.type === 'AI_RACING';
    if (isStage6) {
      this.speedGear = 2;
    }
    if (this.baseHelipadMesh) {
      this.baseHelipadMesh.visible = !isStage6;
    }

    if (stage.type === 'COIN_HUNT') {
      this.spawnCoins();
    } else if (stage.type === 'RING_RACE') {
      this.spawnRings();
    } else if (stage.type === 'RESCUE') {
      this.spawnRescueMission();
    } else if (stage.type === 'AI_RACING') {
      this.spawnAiRacingTrack();
    } else if (stage.type === 'TUTORIAL') {
      this.spawnTutorialObjects();
    }
  }

  private clearMissionObjects() {
    this.ringMeshes.forEach(mesh => this.scene.remove(mesh));
    this.ringMeshes = [];
    this.rings = [];

    if (this.missionGuidanceGroup) {
      this.missionGuidanceGroup.visible = false;
    }
    if (this.guidanceBeaconGroup) {
      this.guidanceBeaconGroup.visible = false;
    }

    this.coinMeshes.forEach(mesh => {
      if (mesh.parent) {
        this.scene.remove(mesh.parent);
      } else {
        this.scene.remove(mesh);
      }
    });
    this.coinMeshes = [];
    this.coins = [];

    if (this.rescuePatientMesh) {
      this.scene.remove(this.rescuePatientMesh);
      this.rescuePatientMesh = null;
    }
    this.rescueTarget = null;
    this.rescueDelivered = false;
    this.patientAttached = false;
    this.isTransferringPatientToOR = false;
    this.transferORProgress = 0;

    // Reset OR doors if present
    if (this.hospitalORDoorLeft && this.hospitalORDoorRight) {
      this.hospitalORDoorLeft.position.x = -0.8;
      this.hospitalORDoorRight.position.x = 0.8;
    }

    if (this.raceTrackGroup) {
      this.scene.remove(this.raceTrackGroup);
      this.raceTrackGroup = null;
    }

    if (this.aiDroneGroup) {
      this.scene.remove(this.aiDroneGroup);
      this.aiDroneGroup = null;
    }
    this.aiProps = [];
    this.aiRacerState = null;
    this.raceActive = false;
    this.raceFinished = false;

    // Clear Stage 2 Dynamic Obstacles
    this.stage2Obstacles.forEach(obs => {
      this.scene.remove(obs.group);
    });
    this.stage2Obstacles = [];
    this.stage2LandingReady = false;
  }

  private spawnCoins() {
    // Tightly grouped, flowing central park layout (within 8~18m of takeoff pad)
    const coinPositions: [number, number, number][] = [
      [0, 2.2, -12],
      [-8, 2.6, -18],
      [-15, 3.2, -8],
      [-10, 2.5, 8],
      [0, 3.4, 16],
      [10, 2.6, 10],
      [15, 3.0, -6],
      [8, 2.2, -16]
    ];

    // Shared high-performance pure vibrant gold materials
    const coinMat = new THREE.MeshStandardMaterial({ 
      color: 0xffd700, // Vibrant Pure Gold
      metalness: 0.5, 
      roughness: 0.2,
      emissive: 0xffaa00,
      emissiveIntensity: 0.45
    });

    const coinRimMat = new THREE.MeshStandardMaterial({
      color: 0xffea00,
      metalness: 0.6,
      roughness: 0.25,
      emissive: 0xffc400,
      emissiveIntensity: 0.35
    });

    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    coinPositions.forEach((pos, idx) => {
      this.coins.push({ id: idx + 1, position: pos, collected: false });

      const coinGroup = new THREE.Group();
      coinGroup.position.set(...pos);

      // Main Gold coin cylinder
      const coinGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.14, 32);
      const coinMesh = new THREE.Mesh(coinGeo, coinMat);
      coinMesh.rotation.x = Math.PI / 2;
      coinGroup.add(coinMesh);

      // Gold Coin Embossed Outer Rim
      const rimGeo = new THREE.TorusGeometry(0.72, 0.05, 12, 32);
      const rimFront = new THREE.Mesh(rimGeo, coinRimMat);
      rimFront.position.z = 0.07;
      coinGroup.add(rimFront);

      const rimBack = new THREE.Mesh(rimGeo, coinRimMat);
      rimBack.position.z = -0.07;
      coinGroup.add(rimBack);

      // Double-sided Star Emblem inside coin
      const starMesh1 = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.45, 5), starMat);
      starMesh1.position.z = 0.08;
      coinGroup.add(starMesh1);

      const starMesh2 = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.45, 5), starMat);
      starMesh2.position.z = -0.08;
      coinGroup.add(starMesh2);

      // Outer luminous halo ring (Warm golden glow)
      const haloGeo = new THREE.RingGeometry(0.85, 1.05, 32);
      const haloMat = new THREE.MeshBasicMaterial({ 
        color: 0xffdf00, 
        transparent: true, 
        opacity: 0.65, 
        side: THREE.DoubleSide 
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      coinGroup.add(halo);

      this.scene.add(coinGroup);
      this.coinMeshes.push(coinMesh);
    });
  }

  private spawnRings() {
    const isStage4 = this.currentStage?.id === 'ring-race-1' || this.currentStage?.id === 'stage-4' || this.currentStage?.type === 'RING_RACE';

    if (isStage4) {
      // Stage 4: Strict Straight One-Way Building Penetration Tunnels & Portals (NO CIRCULAR RINGS)
      const tunnelSpecs: { 
        pos: [number, number, number]; 
        rotY: number; 
        w: number; 
        h: number; 
        radius: number;
        name: string;
      }[] = [
        { pos: [0, 5.0, -25], rotY: 0, w: 11.0, h: 7.0, radius: 4.6, name: '1번: 중앙광장 네온 아치 관통' },
        { pos: [-35, 12.0, -52], rotY: Math.PI, w: 11.0, h: 7.5, radius: 4.8, name: '2번: 알파 빌딩 후면 진입 관통 터널' },
        { pos: [-70, 20.0, -32], rotY: Math.PI, w: 12.0, h: 7.5, radius: 4.8, name: '3번: 트윈 타워 스카이브릿지 진입' },
        { pos: [35, 14.0, 52], rotY: 0, w: 11.0, h: 7.5, radius: 4.8, name: '4번: 감마 빌딩 공중 관통 터널' },
        { pos: [0, 5.0, 12], rotY: Math.PI, w: 11.0, h: 7.0, radius: 4.6, name: '5번: 피니시 네온 게이트 관통' }
      ];

      tunnelSpecs.forEach((spec, idx) => {
        const tunnelId = idx + 1;
        const isActive = idx === 0;
        const isFinish = idx === tunnelSpecs.length - 1;

        this.rings.push({
          id: tunnelId,
          position: spec.pos,
          rotationY: spec.rotY,
          radius: spec.radius,
          passed: false,
          active: isActive
        });

        // Build Rectangular Building Penetration Gate Portal Mesh
        const portalGroup = new THREE.Group();
        portalGroup.position.set(...spec.pos);
        portalGroup.rotation.y = spec.rotY;

        // 1. Heavy Rectangular Framework Beams (Top, Bottom, Left, Right)
        const frameMat = new THREE.MeshStandardMaterial({
          color: isActive ? 0xef4444 : (isFinish ? 0xfacc15 : 0x334155),
          emissive: isActive ? 0xff0000 : (isFinish ? 0xeab308 : 0x0f172a),
          emissiveIntensity: isActive ? 2.5 : (isFinish ? 1.5 : 0.2),
          roughness: 0.2,
          metalness: 0.8
        });

        const beamThickness = 0.45;
        // Top Horizontal Beam
        const beamTop = new THREE.Mesh(new THREE.BoxGeometry(spec.w, beamThickness, beamThickness), frameMat);
        beamTop.position.y = spec.h / 2;
        portalGroup.add(beamTop);

        // Bottom Horizontal Beam
        const beamBtm = new THREE.Mesh(new THREE.BoxGeometry(spec.w, beamThickness, beamThickness), frameMat);
        beamBtm.position.y = -spec.h / 2;
        portalGroup.add(beamBtm);

        // Left Vertical Pillar
        const beamLeft = new THREE.Mesh(new THREE.BoxGeometry(beamThickness, spec.h, beamThickness), frameMat);
        beamLeft.position.x = -spec.w / 2;
        portalGroup.add(beamLeft);

        // Right Vertical Pillar
        const beamRight = new THREE.Mesh(new THREE.BoxGeometry(beamThickness, spec.h, beamThickness), frameMat);
        beamRight.position.x = spec.w / 2;
        portalGroup.add(beamRight);

        // 2. High-Tech Corner L-Brackets with Pulsing Glow
        const cornerMat = new THREE.MeshBasicMaterial({ color: isActive ? 0xff0033 : 0x00f0ff });
        const corners = [
          [-spec.w / 2, spec.h / 2],
          [spec.w / 2, spec.h / 2],
          [-spec.w / 2, -spec.h / 2],
          [spec.w / 2, -spec.h / 2]
        ];
        corners.forEach(([cx, cy]) => {
          const cBox = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, beamThickness + 0.1), cornerMat);
          cBox.position.set(cx, cy, 0);
          portalGroup.add(cBox);
        });

        // 3. Directional Runway Chevron Arrows (Inside tunnel border pointing forward)
        const chevronMat = new THREE.MeshBasicMaterial({ color: isActive ? 0xff0033 : 0x00f0ff });
        [-spec.w / 3, 0, spec.w / 3].forEach(cx => {
          const arrowMesh = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 4), chevronMat);
          arrowMesh.position.set(cx, spec.h / 2 + 0.7, 0);
          arrowMesh.rotation.x = Math.PI; // Pointing downward into the opening
          portalGroup.add(arrowMesh);
        });

        // 3D Entrance Signboard above portal frame (Front face)
        const inGateSign = createSignBoardMesh(
          isFinish ? '[ GOAL ▶ 피니시 게이트 ]' : `[ IN ▶ ${idx + 1}번 입구 진입 ]`,
          !isFinish,
          spec.w - 1.0,
          1.2
        );
        inGateSign.position.set(0, spec.h / 2 + 1.25, 0.1);
        portalGroup.add(inGateSign);

        // 3D Signboard (Rear face)
        const inGateSignBack = inGateSign.clone();
        inGateSignBack.position.set(0, spec.h / 2 + 1.25, -0.1);
        inGateSignBack.rotation.y = Math.PI;
        portalGroup.add(inGateSignBack);

        // 4. Semi-transparent Holographic Entrance Curtain
        const curtainGeo = new THREE.PlaneGeometry(spec.w - 0.2, spec.h - 0.2);
        const curtainMat = new THREE.MeshBasicMaterial({
          color: isActive ? 0xef4444 : (isFinish ? 0xfef08a : 0x0284c7),
          transparent: true,
          opacity: isActive ? 0.28 : 0.06,
          side: THREE.DoubleSide
        });
        const curtain = new THREE.Mesh(curtainGeo, curtainMat);
        portalGroup.add(curtain);

        // 5. Vertical Sky Beacon Laser Pillar
        const beaconGeo = new THREE.CylinderGeometry(0.18, 0.18, 45, 12);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: isActive ? 0xff0033 : (isFinish ? 0xfacc15 : 0x00f0ff),
          transparent: true,
          opacity: isActive ? 0.6 : 0.05
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 23;
        portalGroup.add(beacon);

        // 6. Tunnel Entrance Point Light for local environment illumination
        const pLight = new THREE.PointLight(isActive ? 0xff0033 : 0x00f0ff, isActive ? 3.0 : 0.3, 15);
        pLight.position.set(0, 0, 1.0);
        portalGroup.add(pLight);

        this.scene.add(portalGroup);
        this.ringMeshes.push(portalGroup);
      });
      return;
    }

    // Default open race track (if not stage 4)
    const ringPositions: { pos: [number, number, number]; rotY: number }[] = [
      { pos: [0, 3.5, -20], rotY: 0 },
      { pos: [-15, 5.5, -48], rotY: Math.PI / 6 },
      { pos: [-38, 7.0, -42], rotY: Math.PI / 2 },
      { pos: [-48, 6.0, -5], rotY: (2 * Math.PI) / 3 },
      { pos: [-32, 4.5, 30], rotY: Math.PI },
      { pos: [-10, 5.0, 42], rotY: -Math.PI / 3 },
      { pos: [0, 3.2, 16], rotY: 0 }
    ];

    ringPositions.forEach((item, idx) => {
      const ringId = idx + 1;
      const isActive = idx === 0;
      const isFinish = idx === ringPositions.length - 1;

      this.rings.push({
        id: ringId,
        position: item.pos,
        rotationY: item.rotY,
        radius: 2.4,
        passed: false,
        active: isActive
      });

      const rGroup = new THREE.Group();
      rGroup.position.set(...item.pos);
      rGroup.rotation.y = item.rotY;

      const torusGeo = new THREE.TorusGeometry(2.4, 0.22, 16, 36);
      const torusMat = new THREE.MeshStandardMaterial({
        color: isFinish ? 0xfacc15 : (isActive ? 0x00f0ff : 0x475569),
        emissive: isFinish ? 0xeab308 : (isActive ? 0x00f0ff : 0x0f172a),
        emissiveIntensity: isActive || isFinish ? 1.8 : 0.2,
        roughness: 0.2
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      rGroup.add(torus);

      this.scene.add(rGroup);
      this.ringMeshes.push(rGroup);
    });
  }

  private spawnRescueMission() {
    // Rooftop coordinates for patient (Twin Tower North at -70, 38.5, 30) and hospital (70, 24.8, -20)
    const patientPos: [number, number, number] = [-70, 38.5, 30];
    const hospitalPos: [number, number, number] = [70, 24.8, -20];

    this.rescueTarget = {
      id: 'patient-rescue-1',
      patientPosition: patientPos,
      hospitalPosition: hospitalPos,
      pickedUp: false,
      delivered: false,
      name: '긴급 구조 환자'
    };

    // Build Realistic 3D Patient Character on Medical Rescue Stretcher
    this.rescuePatientMesh = new THREE.Group();
    this.rescuePatientMesh.position.set(...patientPos);

    // 1. Rescue Stretcher Frame (Orange safety metal gurney)
    const gurneyFrameGeo = new THREE.BoxGeometry(1.0, 0.25, 2.2);
    const gurneyFrameMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Emergency Orange
      metalness: 0.8,
      roughness: 0.3
    });
    const gurneyFrame = new THREE.Mesh(gurneyFrameGeo, gurneyFrameMat);
    gurneyFrame.position.y = 0.2;
    this.rescuePatientMesh.add(gurneyFrame);

    // Gurney White Medical Mattress
    const mattressGeo = new THREE.BoxGeometry(0.85, 0.18, 2.0);
    const mattressMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mattress = new THREE.Mesh(mattressGeo, mattressMat);
    mattress.position.y = 0.38;
    this.rescuePatientMesh.add(mattress);

    // 2. 3D Humanoid Patient Body Lying Down
    // Patient Gown Torso & Legs
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.26, 1.4);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 }); // Light blue hospital gown
    const patientBody = new THREE.Mesh(bodyGeo, bodyMat);
    patientBody.position.set(0, 0.52, -0.1);
    this.rescuePatientMesh.add(patientBody);

    // Patient Head with Medical Bandage Wrap
    const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xfde047 }); // Skin tone
    const patientHead = new THREE.Mesh(headGeo, headMat);
    patientHead.position.set(0, 0.58, -0.85);
    this.rescuePatientMesh.add(patientHead);

    // Head Bandage
    const bandageGeo = new THREE.TorusGeometry(0.22, 0.05, 8, 16);
    const bandageMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bandage = new THREE.Mesh(bandageGeo, bandageMat);
    bandage.position.set(0, 0.62, -0.85);
    bandage.rotation.x = Math.PI / 4;
    this.rescuePatientMesh.add(bandage);

    // Animated Waving Right Arm (Requesting emergency airlift rescue)
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 8);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
    this.patientWavingArm = new THREE.Mesh(armGeo, armMat);
    this.patientWavingArm.position.set(0.42, 0.65, -0.4);
    this.patientWavingArm.rotation.z = Math.PI / 3;
    this.rescuePatientMesh.add(this.patientWavingArm);

    // Medical Stretcher Safety Harness Straps
    const strapGeo = new THREE.BoxGeometry(0.88, 0.04, 0.1);
    const strapMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const strap1 = new THREE.Mesh(strapGeo, strapMat);
    strap1.position.set(0, 0.66, 0.1);
    this.rescuePatientMesh.add(strap1);

    const strap2 = new THREE.Mesh(strapGeo, strapMat);
    strap2.position.set(0, 0.66, -0.4);
    this.rescuePatientMesh.add(strap2);

    // High Visibility Pulsing Emergency Landing Ring at Patient Rooftop
    const ringGroundGeo = new THREE.RingGeometry(2.0, 2.3, 32);
    const ringGroundMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const ringGround = new THREE.Mesh(ringGroundGeo, ringGroundMat);
    ringGround.rotation.x = -Math.PI / 2;
    ringGround.position.y = 0.05;
    this.rescuePatientMesh.add(ringGround);

    // Emergency Flashing Beacon & Luminous Signal Beam
    const beaconGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 1.2, 0);
    this.rescuePatientMesh.add(beacon);

    // High Altitude Vertical Sky Rescue Beam (visible across entire map!)
    const skyBeamGeo = new THREE.CylinderGeometry(0.3, 0.3, 60, 12);
    const skyBeamMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.65
    });
    const skyBeam = new THREE.Mesh(skyBeamGeo, skyBeamMat);
    skyBeam.position.y = 30;
    this.rescuePatientMesh.add(skyBeam);

    this.scene.add(this.rescuePatientMesh);
  }

  private spawnAiRacingTrack() {
    this.setupAiDrone();
    this.raceActive = true;
    this.raceFinished = false;
    this.currentLap = 1;
    this.raceStartTime = performance.now();

    // High-Precision Grand Circuit Waypoints (Centered in all tunnels, clear boulevard corridors, zero building clipping)
    this.raceWaypoints = [
      new THREE.Vector3(0, 3.5, 0),         // 0: Start Gantry
      new THREE.Vector3(0, 5.0, -25.0),     // 1: Central Park Neon Arch
      new THREE.Vector3(-18.0, 8.5, -20.0), // 2: Alpha Tunnel Turn Approach
      new THREE.Vector3(-35.0, 12.0, -14.0),// 3: Alpha Tunnel South Entrance Gate
      new THREE.Vector3(-35.0, 12.0, -40.0),// 4: Alpha Skyscraper Penetration Tunnel Center
      new THREE.Vector3(-35.0, 12.0, -62.0),// 5: Alpha Skyscraper North Exit Buffer
      new THREE.Vector3(-55.0, 16.0, -58.0),// 6: Twin Towers Alignment Arc
      new THREE.Vector3(-70.0, 20.0, -46.0),// 7: Twin Towers South Approach
      new THREE.Vector3(-70.0, 20.0, -20.0),// 8: Twin Tower South Penetration Tunnel
      new THREE.Vector3(-70.0, 20.0, 5.0),  // 9: Twin Towers Skybridge Interior Center
      new THREE.Vector3(-70.0, 20.0, 30.0), // 10: Twin Tower North Penetration Tunnel
      new THREE.Vector3(-70.0, 18.0, 58.0), // 11: Twin Tower North Exit Buffer
      new THREE.Vector3(-20.0, 16.0, 64.0), // 12: North Skyline High-Speed Cross Corridor
      new THREE.Vector3(35.0, 14.0, 64.0),  // 13: Gamma Skyscraper North Entrance Approach
      new THREE.Vector3(35.0, 14.0, 40.0),  // 14: Gamma Skyscraper Tunnel Center
      new THREE.Vector3(35.0, 14.0, 16.0),  // 15: Gamma Skyscraper South Exit Buffer
      new THREE.Vector3(54.0, 10.0, 14.0),  // 16: East Boulevard North Entry Corner
      new THREE.Vector3(55.0, 7.5, -8.0),   // 17: East Boulevard Avenue Straight (Clearing Commercial Plaza & Hospital)
      new THREE.Vector3(54.0, 6.0, -24.0),  // 18: East Boulevard South Hairpin Turn
      new THREE.Vector3(28.0, 5.0, -22.0),  // 19: Grandstand Approach Straight
      new THREE.Vector3(10.0, 4.0, -8.0),   // 20: Grandstand Spectator Chicane
      new THREE.Vector3(0, 3.5, 0)          // 21: Finish Line Gantry
    ];

    // Build Grand Prix Circuit Visual Ribbon & Props
    this.raceTrackGroup = new THREE.Group();

    // 1. Continuous Asphalt Track Ribbon connecting waypoints
    for (let i = 0; i < this.raceWaypoints.length; i++) {
      const p1 = this.raceWaypoints[i];
      const p2 = this.raceWaypoints[(i + 1) % this.raceWaypoints.length];

      const dir = p2.clone().sub(p1);
      const len = dir.length();
      const mid = p1.clone().add(p2).multiplyScalar(0.5);

      // Ground Track Surface
      const roadGeo = new THREE.PlaneGeometry(8.0, len);
      const roadMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(mid.x, 0.08, mid.z);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = -Math.atan2(dir.x, dir.z);
      this.raceTrackGroup.add(road);

      // Yellow Dashed Center Line
      const lineGeo = new THREE.PlaneGeometry(0.3, len);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(mid.x, 0.09, mid.z);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = -Math.atan2(dir.x, dir.z);
      this.raceTrackGroup.add(line);
    }

    // 2. Start / Finish Massive Metal Truss Gantry Arch
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, 0);

    const pillarGeo = new THREE.BoxGeometry(0.8, 6.0, 0.8);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const pL = new THREE.Mesh(pillarGeo, pillarMat);
    pL.position.set(-5.5, 3.0, 0);
    gantry.add(pL);

    const pR = new THREE.Mesh(pillarGeo, pillarMat);
    pR.position.set(5.5, 3.0, 0);
    gantry.add(pR);

    const headTruss = new THREE.Mesh(
      new THREE.BoxGeometry(12.0, 1.4, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x0f172a })
    );
    headTruss.position.set(0, 5.8, 0);
    gantry.add(headTruss);

    const signBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(10.0, 1.0),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    signBoard.position.set(0, 5.8, 0.65);
    gantry.add(signBoard);

    const checkBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(10.0, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    checkBanner.position.set(0, 4.8, 0.65);
    gantry.add(checkBanner);

    this.raceTrackGroup.add(gantry);

    // 3. Grandstand structure (Low-poly optimized)
    const grandstand = new THREE.Group();
    grandstand.position.set(12.0, 0, -10.0);
    grandstand.rotation.y = -Math.PI / 2;

    const gsBase = new THREE.Mesh(
      new THREE.BoxGeometry(16.0, 2.5, 4.0),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    gsBase.position.y = 1.25;
    grandstand.add(gsBase);

    const crowdRow1 = new THREE.Mesh(
      new THREE.BoxGeometry(14.0, 0.6, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
    );
    crowdRow1.position.set(0, 2.8, -0.6);
    grandstand.add(crowdRow1);

    const crowdRow2 = new THREE.Mesh(
      new THREE.BoxGeometry(14.0, 0.6, 0.8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    crowdRow2.position.set(0, 3.3, 0.4);
    grandstand.add(crowdRow2);

    this.raceTrackGroup.add(grandstand);
    this.scene.add(this.raceTrackGroup);

    // 4. Register Race Ring Gates along Track Waypoints (Ultra-fast, zero multi-light lag)
    const activeTorusMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const finishTorusMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const defaultTorusMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const torusGeo = new THREE.TorusGeometry(3.2, 0.22, 8, 16);

    this.raceWaypoints.forEach((wp, idx) => {
      if (idx === 0) return;

      const ringId = idx;
      const isActive = idx === 1;
      const isFinish = idx === this.raceWaypoints.length - 1;

      const prevWp = this.raceWaypoints[idx - 1] || new THREE.Vector3(0, 3.5, 0);
      const approachVec = wp.clone().sub(prevWp).normalize();
      const rotY = Math.atan2(approachVec.x, approachVec.z);

      this.rings.push({
        id: ringId,
        position: [wp.x, wp.y, wp.z],
        rotationY: rotY,
        radius: 3.5,
        passed: false,
        active: isActive
      });

      const rGroup = new THREE.Group();
      rGroup.position.copy(wp);

      if (approachVec.lengthSq() > 0.0001) {
        rGroup.lookAt(wp.clone().add(approachVec));
      }

      const mat = isActive ? activeTorusMat : (isFinish ? finishTorusMat : defaultTorusMat);
      const torus = new THREE.Mesh(torusGeo, mat);
      rGroup.add(torus);

      this.scene.add(rGroup);
      this.ringMeshes.push(rGroup);
    });
  }

  private spawnTutorialObjects() {
    if (this.currentStage?.id === 'tutorial-2') {
      const ringPositions: { pos: [number, number, number]; rotY: number }[] = [
        { pos: [0, 3.0, -18], rotY: 0 },
        { pos: [-16, 3.5, -28], rotY: Math.PI / 4 },
        { pos: [0, 2.8, -6], rotY: Math.PI }
      ];

      ringPositions.forEach((item, idx) => {
        const ringId = idx + 1;
        const isActive = idx === 0;
        this.rings.push({
          id: ringId,
          position: item.pos,
          rotationY: item.rotY,
          radius: 2.2,
          passed: false,
          active: isActive
        });

        const rGroup = new THREE.Group();
        rGroup.position.set(...item.pos);
        rGroup.rotation.y = item.rotY;

        const torusGeo = new THREE.TorusGeometry(2.2, 0.16, 16, 32);
        const torusMat = new THREE.MeshStandardMaterial({
          color: isActive ? 0x22d3ee : 0x64748b,
          emissive: isActive ? 0x06b6d4 : 0x0f172a,
          emissiveIntensity: isActive ? 0.8 : 0.1,
          roughness: 0.3
        });
        const torus = new THREE.Mesh(torusGeo, torusMat);
        rGroup.add(torus);

        const passDiskGeo = new THREE.CircleGeometry(2.1, 24);
        const passDiskMat = new THREE.MeshBasicMaterial({
          color: isActive ? 0x38bdf8 : 0x475569,
          transparent: true,
          opacity: isActive ? 0.25 : 0.08,
          side: THREE.DoubleSide
        });
        const passDisk = new THREE.Mesh(passDiskGeo, passDiskMat);
        rGroup.add(passDisk);

        const beaconLight = new THREE.PointLight(isActive ? 0x38bdf8 : 0x475569, isActive ? 2.0 : 0.4, 10);
        rGroup.add(beaconLight);

        this.scene.add(rGroup);
        this.ringMeshes.push(rGroup);
      });

      // Spawn 2 High-Visibility Dynamic Obstacles for Stage 2
      this.stage2Obstacles = [];
      this.stage2LandingReady = false;

      // Obstacle 1: Mid-turn Cyber Laser Barricade (between Ring 1 & Ring 2 at [-7.5, 3.2, -22.5])
      const obs1Group = new THREE.Group();
      obs1Group.position.set(-7.5, 0, -22.5);

      // Warning Pillar Post
      const pillar1Geo = new THREE.CylinderGeometry(0.35, 0.45, 6.4, 16);
      const pillar1Mat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Amber Warning
        roughness: 0.3,
        metalness: 0.6
      });
      const pillar1 = new THREE.Mesh(pillar1Geo, pillar1Mat);
      pillar1.position.y = 3.2;
      obs1Group.add(pillar1);

      // Rotating Laser Cross Wings
      const rotor1Group = new THREE.Group();
      rotor1Group.position.set(0, 3.2, 0);

      const wing1Geo = new THREE.BoxGeometry(4.4, 0.22, 0.22);
      const wing1Mat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
      const wing1A = new THREE.Mesh(wing1Geo, wing1Mat);
      rotor1Group.add(wing1A);

      const wing1B = new THREE.Mesh(wing1Geo, wing1Mat);
      wing1B.rotation.y = Math.PI / 2;
      rotor1Group.add(wing1B);

      // Warning Flasher at Top of Obstacle
      const light1 = new THREE.PointLight(0xff3b30, 2.5, 8);
      light1.position.set(0, 6.5, 0);
      obs1Group.add(light1);

      obs1Group.add(rotor1Group);
      this.scene.add(obs1Group);
      this.stage2Obstacles.push({
        group: obs1Group,
        position: new THREE.Vector3(-7.5, 3.2, -22.5),
        radius: 2.3,
        rotor: rotor1Group
      });

      // Obstacle 2: Return Approach Cyber Barricade (between Ring 2 & Ring 3 at [-8.0, 3.0, -14.0])
      const obs2Group = new THREE.Group();
      obs2Group.position.set(-8.0, 0, -14.0);

      const pillar2Geo = new THREE.CylinderGeometry(0.35, 0.45, 6.0, 16);
      const pillar2Mat = new THREE.MeshStandardMaterial({
        color: 0xef4444, // Red Hazard
        roughness: 0.3,
        metalness: 0.7
      });
      const pillar2 = new THREE.Mesh(pillar2Geo, pillar2Mat);
      pillar2.position.y = 3.0;
      obs2Group.add(pillar2);

      const rotor2Group = new THREE.Group();
      rotor2Group.position.set(0, 3.0, 0);

      const wing2Geo = new THREE.BoxGeometry(4.6, 0.25, 0.25);
      const wing2Mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Neon Yellow
      const wing2 = new THREE.Mesh(wing2Geo, wing2Mat);
      rotor2Group.add(wing2);

      const light2 = new THREE.PointLight(0xfacc15, 2.5, 8);
      light2.position.set(0, 6.1, 0);
      obs2Group.add(light2);

      obs2Group.add(rotor2Group);
      this.scene.add(obs2Group);
      this.stage2Obstacles.push({
        group: obs2Group,
        position: new THREE.Vector3(-8.0, 3.0, -14.0),
        radius: 2.4,
        rotor: rotor2Group
      });

      return;
    }

    // Target hover height marker for tutorial-1
    const markerGroup = new THREE.Group();
    markerGroup.position.set(0, 3.0, 0);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = -Math.PI / 2;
    markerGroup.add(ring);

    this.scene.add(markerGroup);
    this.ringMeshes.push(markerGroup);
  }

  // Controls API
  public setControlInput(input: DroneControlInput) {
    const fixedSens = 0.7;
    this.currentInput = {
      throttle: input.throttle * fixedSens,
      yaw: input.yaw * fixedSens,
      pitch: (this.invertPitch ? -input.pitch : input.pitch) * fixedSens,
      roll: input.roll * fixedSens
    };
  }

  public setAssistLevel(level: AssistLevel) {
    this.assistLevel = level;
  }

  public setCameraView(view: CameraView) {
    this.cameraView = view;
  }

  public setSensitivity(_val: number) {
    this.sensitivity = 0.7; // Locked to 0.7
  }

  public setInvertPitch(invert: boolean) {
    this.invertPitch = invert;
  }

  public setSpeedGear(gear: SpeedGear) {
    if (this.currentStage?.type === 'AI_RACING' || this.currentStage?.id === 'ai-racing-1' || this.currentStage?.id === 'stage-6') {
      this.speedGear = 2; // Locked to Sport mode in Stage 6 Grand Prix Circuit
      return;
    }
    this.speedGear = gear;
  }

  public setRaceReady(ready: boolean) {
    this.isRaceReady = ready;
    if (ready) {
      this.raceStartTime = performance.now();
      if (this.aiRacerState) {
        this.aiRacerState.speed = 0;
      }
    } else {
      if (this.aiRacerState) {
        this.aiRacerState.speed = 0;
        this.aiRacerState.position = { x: 2.5, y: 0.4, z: 0 };
        this.aiRacerState.currentWaypointIdx = 1;
        this.aiRacerState.lap = 1;
        this.aiRacerState.finished = false;
      }
      if (this.aiDroneGroup) {
        this.aiDroneGroup.position.set(2.5, 0.4, 0);
        this.aiDroneGroup.rotation.set(0, 0, 0);
      }
    }
  }

  public triggerAutoTakeoffLanding() {
    if (this.hasCrashed) return;

    if (this.isGrounded || this.position.y <= 0.45) {
      // Initiate One-Touch Auto Takeoff to 2.8m comfortable hover altitude
      this.autoFlightState = 'TAKEOFF';
      this.isGrounded = false;
      this.armed = true;
      soundManager.playCountdownBeep(false);
    } else {
      // Initiate One-Touch Auto Landing down to ground
      this.autoFlightState = 'LANDING';
      soundManager.playCountdownBeep(false);
    }
  }

  public getAutoFlightState(): 'TAKEOFF' | 'LANDING' | 'NONE' {
    return this.autoFlightState;
  }

  public resetDronePosition() {
    this.autoFlightState = 'NONE';
    this.position.set(0, 0.35, 0);
    this.velocity.set(0, 0, 0);
    this.rotation.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.hasCrashed = false;
    this.isGrounded = true;
    this.patientAttached = false;
    this.hoverTimeTracker = 0;
    if (this.rescuePatientMesh && this.rescueTarget) {
      this.rescuePatientMesh.position.set(...this.rescueTarget.patientPosition);
    }
  }

  // Main Loop (Silky Smooth 60 FPS for Tablet Hardware)
  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const elapsed = now - this.lastTime;
    this.lastTime = now;

    // Smooth delta time capped at 50ms (20fps floor) to prevent physics leaps
    const dt = Math.min(elapsed / 1000, 0.05);

    this.updatePhysics(dt);
    this.updateMission(dt);
    this.updateAiDrone(dt);
    this.updateEnvironment(dt);
    this.updateParticles(dt);
    this.updateCamera();
    this.sendTelemetry();

    this.renderer.render(this.scene, this.camera);
  };

  private updatePhysics(dt: number) {
    if (!this.isRaceReady) {
      // Hold firmly on start pad until countdown says GO!
      this.position.set(0, 0.35, 0);
      this.velocity.set(0, 0, 0);
      this.rotation.set(0, 0, 0);
      this.droneGroup.position.copy(this.position);
      this.droneGroup.rotation.copy(this.rotation);
      this.propMeshes.forEach((prop, idx) => {
        const dir = idx % 2 === 0 ? 1 : -1;
        prop.rotation.y += dir * 12 * dt;
      });
      return;
    }

    if (this.hasCrashed) {
      // Drone tumbling on ground if crashed
      this.velocity.y -= 9.81 * dt;
      this.position.addScaledVector(this.velocity, dt);
      if (this.position.y < 0.35) {
        this.position.y = 0.35;
        this.velocity.set(0, 0, 0);
      }
      this.droneGroup.position.copy(this.position);
      return;
    }

    // Input values
    const { throttle, yaw, pitch, roll } = this.currentInput;

    // 1. Drone Skin Specific Stats (1 to 5)
    const skinTopSpeed = this.currentSkin?.stats?.topSpeed ?? 3;
    const skinAgility = this.currentSkin?.stats?.agility ?? 3;
    const skinStability = this.currentSkin?.stats?.stability ?? 3;

    // Stat multipliers
    const skinSpeedMult = 0.85 + (skinTopSpeed / 5) * 0.35; // 0.92 (spd 1) to 1.20 (spd 5)
    const skinAgilityMult = 0.85 + (skinAgility / 5) * 0.35;
    const skinStabilityMult = 0.85 + (skinStability / 5) * 0.30;

    // 2. Speed Gear Multipliers (1 = 36 km/h Cruise, 2 = 76 km/h Sport, 3 = 140 km/h Turbo)
    let targetMaxSpeedMps = 10.0; // 36 km/h (1단 순항)
    let horizontalDrag = 1.8;
    let maxTiltAngle = 0.35; // rad

    if (this.speedGear === 2) {
      targetMaxSpeedMps = 21.0; // 75.6 km/h (2단 스포츠)
      horizontalDrag = 1.4;
      maxTiltAngle = 0.58;
    } else if (this.speedGear === 3) {
      targetMaxSpeedMps = 38.0; // 136.8 km/h (3단 터보)
      horizontalDrag = 1.0;
      maxTiltAngle = 0.80;
    }

    // Apply skin stat to top speed & agility
    targetMaxSpeedMps *= skinSpeedMult;
    maxTiltAngle *= skinAgilityMult;
    const maxHorizontalAccel = targetMaxSpeedMps * horizontalDrag;

    // Motor prop spin animation
    const gearPropMult = this.speedGear === 1 ? 1.0 : this.speedGear === 2 ? 1.7 : 2.5;
    const propRpmSpeed = (this.isGrounded && Math.abs(throttle) < 0.05) ? 5 : (30 + Math.abs(throttle) * 40 + Math.hypot(pitch, roll) * 35) * gearPropMult;
    this.propMeshes.forEach((prop, idx) => {
      const dir = idx % 2 === 0 ? 1 : -1;
      prop.rotation.y += propRpmSpeed * dt * dir;
    });

    // Plasma exhaust glow for CyberJet or high speed gears
    if (this.jetFlameMeshes.length > 0) {
      const flameScale = this.speedGear === 3 ? 1.8 : (this.speedGear === 2 ? 1.2 : 0.8);
      this.jetFlameMeshes.forEach(mesh => {
        mesh.scale.setScalar(flameScale * (0.85 + Math.sin(performance.now() * 0.02) * 0.25));
      });
    }

    // Target Pitch & Roll (visual and aerodynamic orientation)
    const targetPitch = -pitch * maxTiltAngle; // Forward stick tilts nose down (-X)
    const targetRoll = -roll * maxTiltAngle;   // Right stick tilts right (+Z)

    // Smooth Euler Rotation Updates
    const levelSpeed = 12.0 * skinStabilityMult;
    this.rotation.x += (targetPitch - this.rotation.x) * levelSpeed * dt;
    this.rotation.z += (targetRoll - this.rotation.z) * levelSpeed * dt;
    
    const yawTurnRate = (this.speedGear === 1 ? 2.4 : this.speedGear === 2 ? 3.4 : 4.6) * skinAgilityMult;
    this.rotation.y += -yaw * yawTurnRate * dt;

    // Acceleration Vector Calculation
    const acceleration = this._tempVecA.set(0, 0, 0);

    // 1) Horizontal Propulsion (Mode 2 Right Stick Forward/Backward & Left/Right)
    const yawAngle = this.rotation.y;
    const forwardX = -Math.sin(yawAngle);
    const forwardZ = -Math.cos(yawAngle);
    const rightX = Math.cos(yawAngle);
    const rightZ = -Math.sin(yawAngle);

    // Forward/Backward acceleration from Pitch input
    acceleration.x += (forwardX * pitch * maxHorizontalAccel);
    acceleration.z += (forwardZ * pitch * maxHorizontalAccel);

    // Left/Right strafe acceleration from Roll input
    acceleration.x += (rightX * roll * maxHorizontalAccel);
    acceleration.z += (rightZ * roll * maxHorizontalAccel);

    // Apply horizontal aerodynamic drag with active braking when sticks are released
    const stickMagnitude = Math.hypot(pitch, roll);
    const effectiveDrag = stickMagnitude < 0.05 
      ? (horizontalDrag * 2.2 * skinStabilityMult) // Crisp automatic active braking
      : horizontalDrag;

    acceleration.x -= this.velocity.x * effectiveDrag;
    acceleration.z -= this.velocity.z * effectiveDrag;

    // 2) Vertical Altitude Control (Auto-Altitude Hold with Zero Tilt Drop & Butter-Smooth Ascent/Descent)
    let targetClimbRate = 0;
    const maxClimbMps = (this.speedGear === 1 ? 4.8 : this.speedGear === 2 ? 9.0 : 15.0) * skinSpeedMult;
    const maxDescendMps = (this.speedGear === 1 ? 3.8 : this.speedGear === 2 ? 7.0 : 11.5);

    // Cancel Auto Takeoff/Landing if user manually inputs significant stick control
    if (Math.abs(throttle) > 0.15 || stickMagnitude > 0.20) {
      this.autoFlightState = 'NONE';
    }

    if (this.autoFlightState === 'TAKEOFF') {
      if (this.position.y < 2.8) {
        targetClimbRate = 2.6;
        // Damp horizontal drift during auto takeoff
        acceleration.x -= this.velocity.x * 3.5;
        acceleration.z -= this.velocity.z * 3.5;
      } else {
        this.autoFlightState = 'NONE';
      }
    } else if (this.autoFlightState === 'LANDING') {
      if (this.position.y > 0.38 && !this.isGrounded) {
        targetClimbRate = -1.2;
        // Strong horizontal brake for safe vertical touchdown
        acceleration.x -= this.velocity.x * 4.5;
        acceleration.z -= this.velocity.z * 4.5;
      } else {
        this.position.y = 0.35;
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.autoFlightState = 'NONE';
      }
    } else {
      if (throttle > 0.04) {
        // Soft cubic easing on throttle stick to prevent abrupt vertical jerk
        const smoothThrottle = Math.pow(throttle, 1.25);
        targetClimbRate = smoothThrottle * maxClimbMps;
      } else if (throttle < -0.04) {
        const smoothThrottle = -Math.pow(-throttle, 1.25);
        targetClimbRate = smoothThrottle * maxDescendMps;
      }
    }

    // High-precision critical damping for silky vertical transitions without overshoot or oscillation
    const verticalDamper = 8.5 * skinStabilityMult;
    acceleration.y = (targetClimbRate - this.velocity.y) * verticalDamper;

    // Integrate Velocity & Position
    this.velocity.addScaledVector(acceleration, dt);
    this.position.addScaledVector(this.velocity, dt);

    // Building Solid Collision Detection & High-Impact Spark Bounce (Broadphase optimized, zero allocation)
    const droneRadius = 0.52; // Full radius covering drone frame & props
    const checkMargin = droneRadius + 0.8;
    const px = this.position.x;
    const py = this.position.y;
    const pz = this.position.z;

    for (let i = 0; i < this.buildingBoxes.length; i++) {
      const bBox = this.buildingBoxes[i];
      // Fast AABB broadphase skip: reject distant buildings with pure float comparisons
      if (px < bBox.min.x - checkMargin || px > bBox.max.x + checkMargin ||
          py < bBox.min.y - checkMargin || py > bBox.max.y + checkMargin ||
          pz < bBox.min.z - checkMargin || pz > bBox.max.z + checkMargin) {
        continue;
      }

      bBox.clampPoint(this.position, this._tempClosestPoint);
      const isInside = bBox.containsPoint(this.position);
      const dist = this.position.distanceTo(this._tempClosestPoint);

      if (isInside || dist < droneRadius) {
        const normal = this._tempNormal;
        if (isInside) {
          // Eject out of closest bounding face
          const dMinX = Math.abs(this.position.x - bBox.min.x);
          const dMaxX = Math.abs(this.position.x - bBox.max.x);
          const dMinY = Math.abs(this.position.y - bBox.min.y);
          const dMaxY = Math.abs(this.position.y - bBox.max.y);
          const dMinZ = Math.abs(this.position.z - bBox.min.z);
          const dMaxZ = Math.abs(this.position.z - bBox.max.z);

          const minD = Math.min(dMinX, dMaxX, dMinY, dMaxY, dMinZ, dMaxZ);
          if (minD === dMinX) normal.set(-1, 0, 0);
          else if (minD === dMaxX) normal.set(1, 0, 0);
          else if (minD === dMinY) normal.set(0, -1, 0);
          else if (minD === dMaxY) normal.set(0, 1, 0);
          else if (minD === dMinZ) normal.set(0, 0, -1);
          else normal.set(0, 0, 1);

          this.position.copy(this._tempClosestPoint).addScaledVector(normal, droneRadius + 0.05);
        } else {
          this._tempDiff.subVectors(this.position, this._tempClosestPoint);
          if (this._tempDiff.lengthSq() > 0.0001) {
            normal.copy(this._tempDiff.normalize());
          } else {
            normal.set(0, 1, 0);
          }
          this.position.copy(this._tempClosestPoint).addScaledVector(normal, droneRadius + 0.02);
        }

        // Relative velocity heading towards wall surface
        const vDotN = this.velocity.dot(normal);
        if (vDotN < 0) {
          const impactSpeed = Math.abs(vDotN);
          const totalSpeed = this.velocity.length();

          // Elastic bounce with realistic restitution
          this.velocity.addScaledVector(normal, -vDotN * (1 + 0.62));
          this.velocity.multiplyScalar(0.84); // Tangential friction damping

          // Angular recoil impulse
          this.rotation.x += (Math.random() - 0.5) * 0.45;
          this.rotation.z += (Math.random() - 0.5) * 0.45;

          // Vivid Sparks Particle Burst at impact contact point
          this.spawnCollisionSparks(this._tempClosestPoint, normal, Math.max(impactSpeed, totalSpeed * 0.6));

          // Camera shake trauma
          this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + Math.min(totalSpeed * 0.07 + 0.15, 0.55));

          // Sound impact effect
          const now = performance.now();
          if (now - this.lastImpactSoundTime > 90) {
            soundManager.playSparkImpact(totalSpeed);
            this.lastImpactSoundTime = now;
          }
        }
      }
    }

    // Ground Collision & Landing Check
    const minGroundY = 0.35;
    if (this.position.y <= minGroundY) {
      this.position.y = minGroundY;
      const verticalImpactSpeed = Math.abs(this.velocity.y);

      if (verticalImpactSpeed > 2.5) {
        // High energy ground bump with sparks and rebound
        this._tempVecA.set(this.position.x, 0.08, this.position.z);
        this._tempVecB.set(0, 1, 0);
        this.spawnCollisionSparks(
          this._tempVecA,
          this._tempVecB,
          verticalImpactSpeed
        );
        this.cameraShakeTrauma = Math.min(0.5, this.cameraShakeTrauma + verticalImpactSpeed * 0.06);

        const now = performance.now();
        if (now - this.lastImpactSoundTime > 90) {
          soundManager.playSparkImpact(verticalImpactSpeed);
          this.lastImpactSoundTime = now;
        }

        this.velocity.y = -this.velocity.y * 0.35;
        this.velocity.x *= 0.80;
        this.velocity.z *= 0.80;
      } else {
        // Soft touch down / landing
        this.velocity.y = 0;
        this.velocity.x *= 0.85; // Ground friction
        this.velocity.z *= 0.85;
        this.isGrounded = true;
      }
    } else {
      this.isGrounded = false;
    }

    // Update 3D drone mesh transforms
    this.droneGroup.position.copy(this.position);
    this.droneGroup.rotation.copy(this.rotation);

    // Dust ring effect under drone when hovering near ground
    if (this.dustRing) {
      if (this.position.y < 3.5 && !this.isGrounded) {
        const intensity = (1 - (this.position.y / 3.5)) * Math.min(0.8 + Math.abs(throttle) * 0.4, 1);
        (this.dustRing.material as THREE.MeshBasicMaterial).opacity = intensity * 0.4;
        this.dustRing.position.set(this.position.x, 0.05, this.position.z);
        this.dustRing.scale.setScalar(1 + (this.position.y * 0.4));
      } else {
        (this.dustRing.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  }

  private triggerCrash(impactSpeed: number) {
    if (this.hasCrashed) return;
    this.hasCrashed = true;
    this.spawnSparks(this.position.clone());
    this.callbacks.onCrash(impactSpeed);
  }

  private updateMission(dt: number) {
    if (!this.currentStage || this.hasCrashed) {
      if (this.missionGuidanceGroup) this.missionGuidanceGroup.visible = false;
      if (this.guidanceBeaconGroup) this.guidanceBeaconGroup.visible = false;
      return;
    }

    let activeTargetPos: THREE.Vector3 | null = null;
    let guidanceColor = 0xff0033; // Default red guidance

    // 1. Tutorial 1 (Hover & Landing)
    if (this.currentStage.id === 'tutorial-1') {
      const targetHoverY = 3.0;
      if (this.hoverTimeTracker < 3.0) {
        activeTargetPos = new THREE.Vector3(0, targetHoverY, 0);
      } else {
        activeTargetPos = new THREE.Vector3(0, 0.35, 0); // Landing target
        guidanceColor = 0x10b981;
      }
    }

    // 2. Coin Hunt
    if (this.currentStage.type === 'COIN_HUNT') {
      let nearestDist = Infinity;
      this.coins.forEach((coin, idx) => {
        if (!coin.collected) {
          const coinPos = new THREE.Vector3(...coin.position);
          if (this.coinMeshes[idx]) {
            this.coinMeshes[idx].rotation.z += 2.5 * dt;
          }
          const d = this.position.distanceTo(coinPos);
          if (d < nearestDist) {
            nearestDist = d;
            activeTargetPos = coinPos;
          }
          if (d < 2.0) {
            coin.collected = true;
            if (this.coinMeshes[idx].parent) {
              this.scene.remove(this.coinMeshes[idx].parent!);
            } else {
              this.scene.remove(this.coinMeshes[idx]);
            }
            this.spawnSparks(coinPos, 0xfacc15);
            const totalCollected = this.coins.filter(c => c.collected).length;
            this.callbacks.onCoinCollected(coin.id, totalCollected);
          }
        }
      });
    }

    // 3. Ring Race, Tunnel Penetration (Stage 4), AI Racing (Stage 6), and Tutorial Gates
    const isGateStage = this.currentStage.type === 'RING_RACE' ||
      this.currentStage.type === 'AI_RACING' ||
      this.currentStage.id === 'ring-race-1' ||
      this.currentStage.id === 'stage-4' ||
      this.currentStage.id === 'stage-6' ||
      this.currentStage.id === 'ai-racing-1' ||
      this.currentStage.id === 'tutorial-2';

    if (isGateStage && this.rings.length > 0) {
      const activeIdx = this.rings.findIndex(r => r.active && !r.passed);

      if (activeIdx !== -1 && this.rings[activeIdx]) {
        activeTargetPos = new THREE.Vector3(...this.rings[activeIdx].position);
        guidanceColor = activeIdx === this.rings.length - 1 ? 0xfacc15 : 0xff0033;
      }

      // High-Intensity Red Blinking Strobe on active target gate across all missions including AI Race
      const isBlinkRed = Math.sin(performance.now() * 0.015) > -0.2;
      const blinkColorHex = isBlinkRed ? 0xff0033 : 0x7f0015;
      const blinkIntensity = isBlinkRed ? 3.2 : 0.35;

      this.ringMeshes.forEach((meshGroup, idx) => {
        const ringData = this.rings[idx];
        if (!ringData) return;

        if (idx === activeIdx) {
          // Active Gate / Tunnel: Pulsing Red Strobe Alert!
          meshGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = (child as THREE.Mesh).material;
              if (m) {
                if ('emissive' in m) {
                  (m as THREE.MeshStandardMaterial).color.setHex(blinkColorHex);
                  (m as THREE.MeshStandardMaterial).emissive.setHex(isBlinkRed ? 0xff0022 : 0x660011);
                  (m as THREE.MeshStandardMaterial).emissiveIntensity = blinkIntensity;
                } else if ('color' in m) {
                  (m as THREE.MeshBasicMaterial).color.setHex(blinkColorHex);
                  if ((m as THREE.MeshBasicMaterial).transparent) {
                    (m as THREE.MeshBasicMaterial).opacity = isBlinkRed ? 0.85 : 0.3;
                  }
                }
              }
            } else if ((child as THREE.PointLight).isPointLight) {
              const pl = child as THREE.PointLight;
              pl.color.setHex(0xff0033);
              pl.intensity = isBlinkRed ? 3.5 : 0.5;
            }
          });
        } else if (ringData.passed) {
          // Passed Gate: Solid Clear Green
          meshGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = (child as THREE.Mesh).material;
              if (m && 'emissive' in m) {
                (m as THREE.MeshStandardMaterial).color.setHex(0x10b981);
                (m as THREE.MeshStandardMaterial).emissive.setHex(0x059669);
                (m as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
              } else if (m && 'color' in m) {
                (m as THREE.MeshBasicMaterial).color.setHex(0x10b981);
              }
            } else if ((child as THREE.PointLight).isPointLight) {
              (child as THREE.PointLight).color.setHex(0x10b981);
              (child as THREE.PointLight).intensity = 1.0;
            }
          });
        } else {
          // Future Gate: Dim Subtle Slate
          meshGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = (child as THREE.Mesh).material;
              if (m && 'emissive' in m) {
                (m as THREE.MeshStandardMaterial).color.setHex(0x334155);
                (m as THREE.MeshStandardMaterial).emissive.setHex(0x0f172a);
                (m as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
              } else if (m && 'color' in m) {
                (m as THREE.MeshBasicMaterial).color.setHex(0x334155);
              }
            } else if ((child as THREE.PointLight).isPointLight) {
              (child as THREE.PointLight).intensity = 0.2;
            }
          });
        }
      });

      // Check Passage through active tunnel / ring
      this.rings.forEach(ring => {
        if (ring.active && !ring.passed) {
          const ringPos = new THREE.Vector3(...ring.position);
          if (this.position.distanceTo(ringPos) < ring.radius + 1.0) {
            ring.passed = true;
            ring.active = false;
            this.spawnSparks(ringPos, 0x10b981);

            const nextIdx = this.rings.findIndex(r => !r.passed);
            if (nextIdx !== -1) {
              this.rings[nextIdx].active = true;
              this.callbacks.onRingPassed(ring.id, this.rings[nextIdx].id);
            } else {
              // All rings in the circuit passed!
              if (this.currentStage?.id === 'tutorial-2') {
                // Stage 2: Enter Final Landing Phase onto Yellow Base Pad!
                this.stage2LandingReady = true;
                this.callbacks.onRingPassed(ring.id, 4); // Notify UI that landing step is now active
              } else if (this.currentStage?.type === 'AI_RACING' || this.currentStage?.id === 'ai-racing-1' || this.currentStage?.id === 'stage-6') {
                const finishedLap = this.currentLap;
                if (this.currentLap < this.totalRaceLaps) {
                  this.currentLap++;
                  this.rings.forEach((r, idx) => {
                    r.passed = false;
                    r.active = (idx === 0);
                  });

                  // Mathematically determine whether player reached lap milestone ahead of AI
                  const aiCurrentLap = this.aiRacerState?.lap || 1;
                  const playerAhead = !this.aiRacerState?.finished && (
                    finishedLap > aiCurrentLap ||
                    (finishedLap === aiCurrentLap && (this.aiRacerState?.currentWaypointIdx || 0) < 2)
                  );

                  const nowTime = (performance.now() - this.raceStartTime) / 1000;
                  this.callbacks.onLapFinished(finishedLap, this.totalRaceLaps, nowTime, playerAhead);
                  this.callbacks.onRingPassed(ring.id, this.rings[0].id);
                } else {
                  this.raceFinished = true;
                  const nowTime = (performance.now() - this.raceStartTime) / 1000;
                  const playerWon = !this.aiRacerState?.finished || (nowTime < (this.aiRacerState?.finishTimeSec || Infinity));
                  this.callbacks.onRaceFinished(playerWon, nowTime, this.aiRacerState?.finishTimeSec || (nowTime + 4.2));
                }
              } else {
                this.callbacks.onRingPassed(ring.id, 0);
              }
            }
          }
        }
      });
    }

    // 3-B. Stage 2 Dynamic Obstacles Animation & Collision Detection
    if (this.stage2Obstacles.length > 0) {
      this.stage2Obstacles.forEach(obs => {
        obs.rotor.rotation.y += dt * 1.8;

        const dist = this.position.distanceTo(obs.position);
        if (dist < obs.radius) {
          this.spawnSparks(this.position, 0xf97316);
          const pushDir = this.position.clone().sub(obs.position).normalize();
          pushDir.y = Math.max(pushDir.y, 0.4);
          this.velocity.addScaledVector(pushDir, 5.2);
          this.cameraShakeTrauma = 0.5;
          this.callbacks.onCrash(18);
        }
      });
    }

    // 3-C. Stage 2 Final Landing Check
    if (this.currentStage?.id === 'tutorial-2' && this.stage2LandingReady) {
      activeTargetPos = new THREE.Vector3(0, 0.35, 0);
      guidanceColor = 0x10b981;

      const horizDist = Math.hypot(this.position.x, this.position.z);
      const isLowAltitude = this.position.y <= 0.55;
      const isSlowSpeed = this.velocity.length() < 2.5;

      if (horizDist < 2.0 && isLowAltitude && (this.isGrounded || isSlowSpeed)) {
        this.stage2LandingReady = false;
        this.spawnSparks(new THREE.Vector3(0, 0.35, 0), 0x10b981);
        this.callbacks.onRingPassed(3, 0); // Complete Stage 2!
      }
    }

    // 4. Rescue Mission
    if (this.currentStage.type === 'RESCUE' && this.rescueTarget) {
      const patientPos = new THREE.Vector3(...this.rescueTarget.patientPosition);
      const hospitalPos = new THREE.Vector3(...this.rescueTarget.hospitalPosition);

      // Active Target Guidance: Point to Patient (Red) before pickup; Point to Hospital Helipad (Green) when carrying!
      if (!this.rescueTarget.pickedUp) {
        activeTargetPos = patientPos;
        guidanceColor = 0xff0033;
      } else if (!this.rescueTarget.delivered) {
        activeTargetPos = hospitalPos;
        guidanceColor = 0x10b981;
      }

      // Patient waving arm animation requesting rescue
      if (this.patientWavingArm && !this.rescueTarget.pickedUp) {
        this.patientWavingArm.rotation.z = Math.PI / 3 + Math.sin(performance.now() * 0.008) * 0.4;
      }

      // Pickup phase
      if (!this.patientAttached && !this.rescueDelivered) {
        const distToPatient = this.position.distanceTo(patientPos);
        if (distToPatient < 3.5 && this.position.y > patientPos.y - 0.5) {
          if (this.tractorBeamMesh) {
            (this.tractorBeamMesh.material as THREE.MeshBasicMaterial).opacity = 0.45;
          }
          if (distToPatient < 2.2) {
            this.patientAttached = true;
            this.rescueTarget.pickedUp = true;
            if (this.tractorBeamMesh) {
              (this.tractorBeamMesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
            }
            this.callbacks.onPatientPickedUp();
          }
        } else if (this.tractorBeamMesh) {
          (this.tractorBeamMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
        }
      }

      // Carry phase
      if (this.patientAttached && this.rescuePatientMesh && !this.rescueDelivered) {
        this.rescuePatientMesh.position.set(this.position.x, this.position.y - 1.2, this.position.z);

        const distToHospital = this.position.distanceTo(hospitalPos);
        if (distToHospital < 3.2 && (this.isGrounded || this.position.y < hospitalPos.y + 1.8)) {
          this.rescueDelivered = true;
          this.patientAttached = false;
          this.rescueTarget.delivered = true;
          this.rescuePatientMesh.position.copy(hospitalPos);
          if (this.tractorBeamMesh) {
            (this.tractorBeamMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
          }
          this.spawnSparks(hospitalPos, 0xef4444);
          this.isTransferringPatientToOR = true;
          this.transferORProgress = 0;
          this.callbacks.onPatientDelivered();
        }
      }

      // Live OR Stretcher Transfer Sequence
      if (this.isTransferringPatientToOR && this.rescuePatientMesh) {
        this.transferORProgress += dt * 0.4;
        const t = Math.min(this.transferORProgress, 1.0);
        const targetORX = 66.0;
        const targetORZ = -29.0;
        this.rescuePatientMesh.position.x = THREE.MathUtils.lerp(70, targetORX, t);
        this.rescuePatientMesh.position.z = THREE.MathUtils.lerp(-20, targetORZ, t);

        this.hospitalDoctors.forEach((doc, idx) => {
          doc.position.x = this.rescuePatientMesh!.position.x + (idx === 0 ? -0.7 : 0.7);
          doc.position.z = this.rescuePatientMesh!.position.z;
          doc.rotation.y = -Math.PI / 2;
          doc.position.y = 24.8 + Math.abs(Math.sin(performance.now() * 0.015)) * 0.15;
        });

        if (t > 0.4 && this.hospitalORDoorLeft && this.hospitalORDoorRight) {
          const doorOpenAmount = Math.min((t - 0.4) * 2.5, 1.0) * 0.8;
          this.hospitalORDoorLeft.position.x = -0.8 - doorOpenAmount;
          this.hospitalORDoorRight.position.x = 0.8 + doorOpenAmount;
        }
      }
    }

    // Universal Dynamic Augmented Reality Guidance Path & 3D Holo-Beacon
    if (activeTargetPos) {
      this.missionGuidanceGroup.visible = true;
      this.guidanceBeaconGroup.visible = true;

      const now = performance.now();
      const forwardDir = this._tempVecA.set(0, 0, 1).applyEuler(this.rotation);
      const startPoint = this._tempVecB.copy(this.position).addScaledVector(forwardDir, 0.6);
      startPoint.y += 0.15;

      const targetChanged = activeTargetPos.distanceToSquared(this.lastQuestGoalPos) > 0.05;
      const droneMovedFar = startPoint.distanceToSquared(this.lastQuestStartPos) > 2.25; // > 1.5m
      const timeElapsed = now - this.lastQuestCalcTime > 120; // Throttled to ~8 Hz for smooth 60fps

      if (targetChanged || (timeElapsed && droneMovedFar) || !this.cachedQuestCurve) {
        this.lastQuestCalcTime = now;
        this.lastQuestStartPos.copy(startPoint);
        this.lastQuestGoalPos.copy(activeTargetPos);

        const questWaypoints = this.cityNavGraph.findQuestPath(startPoint, activeTargetPos, this.buildingBoxes);
        if (questWaypoints.length >= 2) {
          try {
            this.cachedQuestCurve = new THREE.CatmullRomCurve3(questWaypoints, false, 'centripetal', 0.25);
          } catch {
            this.cachedQuestCurve = null;
          }
        } else {
          this.cachedQuestCurve = null;
        }

        // Direct Buffer Update for Guidance Line without GC churn
        const numPoints = 64;
        const lineGeo = this.missionGuidanceLine!.geometry as THREE.BufferGeometry;
        const posAttr = lineGeo.attributes.position as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;

        for (let i = 0; i < numPoints; i++) {
          const t = i / (numPoints - 1);
          if (this.cachedQuestCurve) {
            this.cachedQuestCurve.getPoint(t, this._tempOrbPos);
          } else {
            const pt = getPointAlongPolyline(questWaypoints, t);
            this._tempOrbPos.copy(pt);
          }
          posArray[i * 3] = this._tempOrbPos.x;
          posArray[i * 3 + 1] = this._tempOrbPos.y;
          posArray[i * 3 + 2] = this._tempOrbPos.z;
        }
        posAttr.needsUpdate = true;
      }

      const lineMat = this.missionGuidanceLine!.material as THREE.LineBasicMaterial;
      lineMat.color.setHex(guidanceColor);
      lineMat.opacity = 0.95 + Math.sin(now * 0.008) * 0.05;

      // 2. Animate flowing holographic pulse orbs using cached curve (Zero allocations)
      const pulseTime = (now * 0.0006) % 1.0;
      this.guidancePulseOrbs.forEach((orb, idx) => {
        const t = (pulseTime + idx / 8.0) % 1.0;
        if (this.cachedQuestCurve) {
          this.cachedQuestCurve.getPoint(t, this._tempOrbPos);
          orb.position.copy(this._tempOrbPos);
        }
        (orb.material as THREE.MeshBasicMaterial).color.setHex(guidanceColor);
        const orbScale = Math.sin(t * Math.PI) * 1.3 + 0.3;
        orb.scale.setScalar(orbScale);
      });

      // 3. Update Destination Holo-Beacon
      this.guidanceBeaconGroup.position.copy(activeTargetPos);

      // Pulsing rings
      this.guidanceBeaconRings.forEach((ring, idx) => {
        const ringMat = ring.material as THREE.MeshBasicMaterial;
        ringMat.color.setHex(guidanceColor);
        const ringPulse = 1.0 + 0.25 * Math.sin(performance.now() * 0.006 + idx * 0.8);
        ring.scale.set(ringPulse, ringPulse, 1.0);
      });

      // Bobbing Cone
      if (this.guidanceBeaconCone) {
        (this.guidanceBeaconCone.material as THREE.MeshBasicMaterial).color.setHex(guidanceColor);
        this.guidanceBeaconCone.position.y = 1.8 + Math.sin(performance.now() * 0.005) * 0.35;
      }

      // Sky laser beam
      if (this.guidanceBeaconBeam) {
        (this.guidanceBeaconBeam.material as THREE.MeshBasicMaterial).color.setHex(guidanceColor);
      }

      if (this.guidanceBeaconLight) {
        this.guidanceBeaconLight.color.setHex(guidanceColor);
      }
    } else {
      this.missionGuidanceGroup.visible = false;
      this.guidanceBeaconGroup.visible = false;
    }
  }

  private updateAiDrone(dt: number) {
    if (!this.aiDroneGroup || !this.aiRacerState || !this.raceActive || this.raceFinished) return;

    // AI Propeller spin
    const propSpeed = this.isRaceReady ? 55 : 12;
    this.aiProps.forEach(prop => {
      prop.rotation.y += propSpeed * dt;
    });

    // Hold firmly on start grid while countdown (3, 2, 1) is active
    if (!this.isRaceReady) {
      this.aiDroneGroup.position.set(2.5, 0.4, 0);
      this.aiDroneGroup.rotation.set(0, 0, 0);
      this.aiRacerState.position = { x: 2.5, y: 0.4, z: 0 };
      this.aiRacerState.speed = 0;
      return;
    }

    // AI realistic reaction time & smooth launch spool-up after countdown ends
    const timeSinceStart = (performance.now() - this.raceStartTime) / 1000;
    if (timeSinceStart < 0.4) {
      this.aiDroneGroup.position.set(2.5, 0.4, 0);
      this.aiDroneGroup.rotation.set(0, 0, 0);
      this.aiRacerState.position = { x: 2.5, y: 0.4, z: 0 };
      this.aiRacerState.speed = 0;
      return;
    }

    const targetWp = this.raceWaypoints[this.aiRacerState.currentWaypointIdx];
    if (!targetWp) return;

    const currentPos = new THREE.Vector3(
      this.aiRacerState.position.x,
      this.aiRacerState.position.y,
      this.aiRacerState.position.z
    );

    const toWp = targetWp.clone().sub(currentPos);
    const dist = toWp.length();

    // Advance to next waypoint cleanly (tighter threshold in high altitude tunnel corridors)
    const isTunnelSegment = targetWp.y > 10.0;
    const waypointThreshold = isTunnelSegment ? 3.6 : 5.8;

    if (dist < waypointThreshold) {
      this.aiRacerState.currentWaypointIdx++;
      if (this.aiRacerState.currentWaypointIdx >= this.raceWaypoints.length) {
        this.aiRacerState.currentWaypointIdx = 0;
        this.aiRacerState.lap++;
        if (this.aiRacerState.lap > this.totalRaceLaps && !this.aiRacerState.finished) {
          this.aiRacerState.finished = true;
          this.aiRacerState.finishTimeSec = (performance.now() - this.raceStartTime) / 1000;
          soundManager.speakGuide('라이벌이 통과했어! 포기하지 말고 끝까지 골인하자!');
        }
      }
    }

    const dir = toWp.clone().normalize();

    // Balanced & Competitive AI Racer Dynamics based on Level 1 / Level 2 difficulty
    const isLevel1 = this.currentStage?.aiDifficulty === 'LEVEL_1';
    const distToPlayer = currentPos.distanceTo(this.position);
    
    // Level 1: Beginner-friendly rookie AI (~28 - 35 km/h, gentle cornering, generous catchup)
    // Level 2: Veteran pro rival AI (~39 - 47.5 km/h, sharp cornering and aggressive chase)
    const baseAiSpeed = isLevel1 ? 8.2 : 10.8;
    const sprintAiSpeed = isLevel1 ? 9.8 : 13.2;
    const rubberBandCatchupSpeed = isLevel1 ? 6.5 : 8.8;

    // Smooth aerodynamic cornering lookahead
    let cornerFactor = 1.0;
    const nextWpIdx = (this.aiRacerState.currentWaypointIdx + 1) % this.raceWaypoints.length;
    const nextWp = this.raceWaypoints[nextWpIdx];
    if (nextWp) {
      const nextDir = nextWp.clone().sub(targetWp).normalize();
      const dotProd = THREE.MathUtils.clamp(dir.dot(nextDir), -1, 1);
      // Smooth cosine speed curve: maintains momentum through bends (Level 1 slows down slightly more for realism)
      const minCornerLerp = isLevel1 ? 0.60 : 0.72;
      cornerFactor = THREE.MathUtils.lerp(minCornerLerp, 1.0, (dotProd + 1) * 0.5);
    }

    let targetSpeed = baseAiSpeed * cornerFactor;

    // Dynamic racing rivalry:
    const playerIsAhead = this.currentLap > this.aiRacerState.lap || 
      (this.currentLap === this.aiRacerState.lap && this.position.distanceTo(targetWp) < currentPos.distanceTo(targetWp));

    if (playerIsAhead) {
      // Player is ahead -> AI drone gives exciting chase with slight boost
      targetSpeed = sprintAiSpeed * cornerFactor;
    } else if (distToPlayer > (isLevel1 ? 16 : 22) && this.aiRacerState.lap >= this.currentLap) {
      // AI is ahead -> Gentle rubber-banding so player can catch back up
      targetSpeed = rubberBandCatchupSpeed * cornerFactor;
    }

    // Initial motor throttle spool-up curve over first seconds of flight
    const launchDuration = isLevel1 ? 1.6 : 1.2;
    const launchRamp = Math.min(1.0, Math.max(0, (timeSinceStart - 0.4) / launchDuration));
    targetSpeed *= THREE.MathUtils.lerp(0.30, 1.0, launchRamp);

    this.aiRacerState.speed = THREE.MathUtils.lerp(this.aiRacerState.speed, targetSpeed, 3.2 * dt);
    currentPos.addScaledVector(dir, this.aiRacerState.speed * dt);

    this.aiRacerState.position = { x: currentPos.x, y: currentPos.y, z: currentPos.z };
    this.aiDroneGroup.position.copy(currentPos);

    // Dynamic banking, forward pitch & yaw orientation (Ultra-lightweight)
    this.aiDroneGroup.lookAt(targetWp);
    const lateralTurn = targetWp.x - currentPos.x;
    this.aiDroneGroup.rotation.z = -Math.max(-0.55, Math.min(0.55, lateralTurn * 0.07));
    this.aiDroneGroup.rotation.x += 0.22; // Forward racing tilt
  }

  private updateCamera() {
    if (this.cameraView === 'CHASE') {
      // Dynamic chase camera following behind drone with gimbal-stabilized spring lerp (Zero heap allocation)
      this._tempCamOffset.set(0, 2.2, 5.5);
      this._tempRotMat4.makeRotationY(this.rotation.y);
      this._tempCamOffset.applyMatrix4(this._tempRotMat4);

      const targetCamPos = this._tempCamTarget.copy(this.position).add(this._tempCamOffset);
      
      // Decoupled vertical vs horizontal lerp for ultra-smooth altitude climbs
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamPos.x, 0.14);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamPos.y, 0.10);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamPos.z, 0.14);

      // Smooth look-at target with virtual gimbal damping
      this._tempVecA.copy(this.position);
      this._tempVecA.y += 0.6;
      this.currentCameraLookTarget.lerp(this._tempVecA, 0.16);
      this.camera.lookAt(this.currentCameraLookTarget);
    } else if (this.cameraView === 'FPV') {
      // First Person View from Drone Nose Camera
      this._tempCamOffset.set(0, 0.15, 0.45);
      this._tempRotMat4.makeRotationFromEuler(this.rotation);
      this._tempCamOffset.applyMatrix4(this._tempRotMat4);

      this.camera.position.copy(this.position).add(this._tempCamOffset);

      this._tempVecA.set(0, -0.05, 10);
      this._tempVecA.applyMatrix4(this._tempRotMat4);
      this._tempVecB.copy(this.position).add(this._tempVecA);
      this.camera.lookAt(this._tempVecB);
    } else if (this.cameraView === 'TOP') {
      // Birds-eye overhead tactical view
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.position.x, 0.18);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.position.y + 28, 0.14);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.position.z, 0.18);
      this.camera.lookAt(this.position.x, this.position.y, this.position.z);
    } else if (this.cameraView === 'FOLLOW_FAR') {
      // Cinematic wide angle with stabilized follow
      this._tempCamOffset.set(0, 5.0, 12.0);
      this._tempRotMat4.makeRotationY(this.rotation.y);
      this._tempCamOffset.applyMatrix4(this._tempRotMat4);
      const targetFarPos = this._tempCamTarget.copy(this.position).add(this._tempCamOffset);
      
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetFarPos.x, 0.10);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetFarPos.y, 0.08);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetFarPos.z, 0.10);
      
      this.currentCameraLookTarget.lerp(this.position, 0.12);
      this.camera.lookAt(this.currentCameraLookTarget);
    }

    // Dynamic Camera Impact Shake Trauma (strictly for high-speed wall crashes)
    if (this.cameraShakeTrauma > 0.001) {
      const shakeAmt = this.cameraShakeTrauma * 0.28;
      this.camera.position.x += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.z += (Math.random() - 0.5) * shakeAmt;
      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - 0.045);
    }
  }

  private spawnCollisionSparks(pos: THREE.Vector3, normal: THREE.Vector3, impactSpeed: number = 5) {
    if (this.particlePool.length === 0) return;
    const pSystem = this.particlePool.find(p => !p.active) || this.particlePool[0];
    const count = Math.min(32, Math.max(16, Math.floor(impactSpeed * 3)));
    const baseBurstSpeed = Math.min(16, Math.max(6, impactSpeed * 1.6));

    const positions = pSystem.positions;
    const velocities = pSystem.velocities;

    for (let i = 0; i < 32; i++) {
      if (i < count) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        const spreadX = (Math.random() - 0.5) * 1.6;
        const spreadY = (Math.random() - 0.5) * 1.6;
        const spreadZ = (Math.random() - 0.5) * 1.6;

        const nx = normal.x * 1.2 + spreadX;
        const ny = normal.y * 1.2 + spreadY;
        const nz = normal.z * 1.2 + spreadZ;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

        const pSpeed = baseBurstSpeed * (0.5 + Math.random() * 0.85);
        velocities[i * 3] = (nx / len) * pSpeed;
        velocities[i * 3 + 1] = (ny / len) * pSpeed + Math.random() * 2.5;
        velocities[i * 3 + 2] = (nz / len) * pSpeed;
      } else {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -1000;
        positions[i * 3 + 2] = 0;
        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = 0;
      }
    }

    pSystem.geometry.attributes.position.needsUpdate = true;
    pSystem.material.color.setHex(0xffaa00);
    pSystem.material.opacity = 1.0;
    pSystem.life = 0;
    pSystem.maxLife = 0.50;
    pSystem.active = true;
    pSystem.mesh.visible = true;
  }

  private spawnSparks(pos: THREE.Vector3, colorHex: number = 0xffffff) {
    if (this.particlePool.length === 0) return;
    const pSystem = this.particlePool.find(p => !p.active) || this.particlePool[0];
    const count = 16;
    const positions = pSystem.positions;
    const velocities = pSystem.velocities;

    for (let i = 0; i < 32; i++) {
      if (i < count) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        velocities[i * 3] = (Math.random() - 0.5) * 5;
        velocities[i * 3 + 1] = Math.random() * 5 + 1;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 5;
      } else {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -1000;
        positions[i * 3 + 2] = 0;
        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = 0;
      }
    }

    pSystem.geometry.attributes.position.needsUpdate = true;
    pSystem.material.color.setHex(colorHex);
    pSystem.material.opacity = 0.9;
    pSystem.life = 0;
    pSystem.maxLife = 0.45;
    pSystem.active = true;
    pSystem.mesh.visible = true;
  }

  private updateParticles(dt: number) {
    for (let i = 0; i < this.particlePool.length; i++) {
      const p = this.particlePool[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      const progress = p.life / p.maxLife;
      p.material.opacity = (1 - progress) * 0.95;

      const posArr = p.positions;
      for (let j = 0; j < 32; j++) {
        posArr[j * 3] += p.velocities[j * 3] * dt;
        posArr[j * 3 + 1] += (p.velocities[j * 3 + 1] - 9.81 * dt) * dt;
        posArr[j * 3 + 2] += p.velocities[j * 3 + 2] * dt;
      }
      p.geometry.attributes.position.needsUpdate = true;
    }
  }

  private sendTelemetry() {
    const speedKmh = this.velocity.length() * 3.6;
    const altitudeM = Math.max(0, this.position.y - 0.35);
    const pitchDeg = Math.round(THREE.MathUtils.radToDeg(this.rotation.x));
    const rollDeg = Math.round(THREE.MathUtils.radToDeg(this.rotation.z));
    const yawDeg = Math.round(THREE.MathUtils.radToDeg(this.rotation.y) % 360);

    // Compute exact real-time race rank
    let raceRank: 1 | 2 = 1;
    let aiDistanceM: number | undefined = undefined;
    let aiFinished = false;

    if (this.currentStage?.type === 'AI_RACING' || this.currentStage?.id === 'ai-racing-1' || this.currentStage?.id === 'stage-6') {
      if (this.aiRacerState && this.aiDroneGroup) {
        aiFinished = this.aiRacerState.finished;
        const aiPos = this.aiDroneGroup.position;
        aiDistanceM = Math.round(this.position.distanceTo(aiPos) * 10) / 10;

        if (this.aiRacerState.finished) {
          raceRank = 2; // AI finished first
        } else {
          const playerActiveRingIdx = this.rings.findIndex(r => r.active && !r.passed);
          const playerProgressInLap = playerActiveRingIdx >= 0 ? playerActiveRingIdx : this.rings.length;
          const playerTotalScore = (this.currentLap - 1) * this.rings.length + playerProgressInLap;

          const aiWpIdx = this.aiRacerState.currentWaypointIdx;
          const aiTotalScore = (this.aiRacerState.lap - 1) * this.raceWaypoints.length + aiWpIdx;

          if (playerTotalScore > aiTotalScore) {
            raceRank = 1;
          } else if (playerTotalScore < aiTotalScore) {
            raceRank = 2;
          } else {
            // Same gate/waypoint progress - compare distance to the next gate
            const target = this.raceWaypoints[aiWpIdx] || this.position;
            const pDist = this.position.distanceTo(target);
            const aiDist = aiPos.distanceTo(target);
            raceRank = pDist <= aiDist ? 1 : 2;
          }
        }
      }
    }

    let currentNavGuide: DroneTelemetry['currentNavGuide'] = undefined;
    if (this.rings.length > 0) {
      const activeIdx = this.rings.findIndex(r => r.active && !r.passed);
      if (activeIdx !== -1) {
        const targetRing = this.rings[activeIdx];
        this._tempVecA.set(targetRing.position[0], targetRing.position[1], targetRing.position[2]);
        const distToGate = Math.round(this.position.distanceTo(this._tempVecA) * 10) / 10;
        const isTunnelStage = this.currentStage?.id === 'ring-race-1' || this.currentStage?.id === 'stage-4' || this.currentStage?.type === 'RING_RACE';
        
        let direction: 'ENTER' | 'EXIT' | 'APPROACH' | 'CLIMB' | 'DESCEND' = 'APPROACH';
        let instruction = `[IN] ${activeIdx + 1}번 입구로 접근하세요`;

        const altDiff = this.position.y - targetRing.position[1];
        if (distToGate < 7.0) {
          direction = 'ENTER';
          instruction = `[IN] ${activeIdx + 1}번 입구 진입 완료 ▶ [OUT] 출구로 직진 관통`;
        } else if (distToGate < 15.0 && Math.abs(altDiff) < 2.0) {
          direction = 'ENTER';
          instruction = `[IN] 정면 입구 정렬 완료 ▶ 속도 유지 진입`;
        } else if (altDiff < -2.5) {
          direction = 'CLIMB';
          instruction = `[IN] ${activeIdx + 1}번 입구 높이로 상승하세요 (권장 고도: ${targetRing.position[1].toFixed(1)}m)`;
        } else if (altDiff > 3.5) {
          direction = 'DESCEND';
          instruction = `[IN] ${activeIdx + 1}번 입구 높이로 하강하세요 (권장 고도: ${targetRing.position[1].toFixed(1)}m)`;
        }

        const isFinish = activeIdx === this.rings.length - 1;
        currentNavGuide = {
          stepName: isFinish ? '최종 피니시 게이트' : (isTunnelStage ? `${activeIdx + 1}번 빌딩 관통 터널` : `${activeIdx + 1}번 게이트`),
          direction,
          instruction,
          distanceM: distToGate,
          recommendedAltM: Math.round(targetRing.position[1] * 10) / 10
        };
      }
    } else if (this.rescueTarget) {
      if (!this.rescueTarget.pickedUp) {
        this._tempVecA.set(this.rescueTarget.patientPosition[0], this.rescueTarget.patientPosition[1], this.rescueTarget.patientPosition[2]);
        const dist = Math.round(this.position.distanceTo(this._tempVecA) * 10) / 10;
        currentNavGuide = {
          stepName: '트윈타워 옥상 조난자',
          direction: this.position.y < this.rescueTarget.patientPosition[1] - 3 ? 'CLIMB' : 'APPROACH',
          instruction: '[IN] 북쪽 타워 옥상 환자에게 접근하여 호버링',
          distanceM: dist,
          recommendedAltM: Math.round(this.rescueTarget.patientPosition[1] * 10) / 10
        };
      } else if (!this.rescueTarget.delivered) {
        this._tempVecA.set(this.rescueTarget.hospitalPosition[0], this.rescueTarget.hospitalPosition[1], this.rescueTarget.hospitalPosition[2]);
        const dist = Math.round(this.position.distanceTo(this._tempVecA) * 10) / 10;
        currentNavGuide = {
          stepName: '종합병원 옥상 헬리패드',
          direction: 'APPROACH',
          instruction: '[OUT] 종합병원 헬리패드로 이송 및 착륙',
          distanceM: dist,
          recommendedAltM: Math.round(this.rescueTarget.hospitalPosition[1] * 10) / 10
        };
      }
    }

    const throttlePct = Math.round(((this.currentInput.throttle + 1) / 2) * 100);

    // Update real-time audio motor sound at full frame rate
    soundManager.updateMotorSound(
      throttlePct,
      Math.round(speedKmh * 10) / 10,
      this.isGrounded
    );

    // Throttle React state dispatch to ~20Hz (every 50ms) to eliminate React reconciliation CPU overhead
    const now = performance.now();
    if (now - this.lastTelemetryTime >= 50 || this.hasCrashed || this.isGrounded !== this.prevIsGrounded) {
      this.lastTelemetryTime = now;
      this.prevIsGrounded = this.isGrounded;

      const telemetry: DroneTelemetry = {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
        speedKmh: Math.round(speedKmh * 10) / 10,
        altitudeM: Math.round(altitudeM * 10) / 10,
        pitchDeg,
        rollDeg,
        yawDeg,
        throttlePct,
        batteryPct: this.batteryPct,
        speedGear: this.speedGear,
        isGrounded: this.isGrounded,
        hasCrashed: this.hasCrashed,
        hasPatient: this.patientAttached,
        propellerRpm: this.isGrounded ? 0 : Math.round(4000 + this.currentInput.throttle * 4000),
        armed: this.armed,
        autoFlightState: this.autoFlightState,
        raceRank,
        aiDistanceM,
        aiFinished,
        currentNavGuide
      };

      this.callbacks.onTelemetry(telemetry);
    }
  }

  public emergencyHoverStop() {
    this.velocity.set(0, 0, 0);
    this.rotation.x = 0;
    this.rotation.z = 0;
    this.currentInput = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(0.7);
  };

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
