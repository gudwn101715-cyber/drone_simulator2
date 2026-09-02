/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MissionStage, 
  UserPilotProfile, 
  DroneTelemetry, 
  CameraView, 
  DroneControlInput, 
  DroneSkin,
  SpeedGear 
} from './types';
import { 
  loadUserProfile, 
  saveUserProfile, 
  DRONE_SKINS, 
  MISSION_STAGES, 
  getDefaultProfile 
} from './utils/storage';
import { soundManager } from './utils/audio';
import { DroneWorld } from './engine/DroneWorld';
import { MissionSelector } from './components/MissionSelector';
import { FlightHUD } from './components/FlightHUD';
import { VirtualJoystick } from './components/VirtualJoystick';
import { TutorialGuideOverlay } from './components/TutorialGuideOverlay';
import { MissionResultModal } from './components/MissionResultModal';
import { PilotLicenseModal } from './components/PilotLicenseModal';
import { DroneSkinModal } from './components/DroneSkinModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpManualModal } from './components/HelpManualModal';
import { CountdownOverlay } from './components/CountdownOverlay';
import { StartSplashScreen } from './components/StartSplashScreen';
import { requestFullscreen } from './utils/fullscreen';

export default function App() {
  // App Title / Splash Screen State
  const [hasStartedApp, setHasStartedApp] = useState<boolean>(false);

  // Pilot Profile State
  const [profile, setProfile] = useState<UserPilotProfile>(loadUserProfile);

  // Active Stage State
  const [currentStage, setCurrentStage] = useState<MissionStage | null>(null);

  // Flight & Telemetry State
  const [telemetry, setTelemetry] = useState<DroneTelemetry>({
    position: { x: 0, y: 0.35, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    speedKmh: 0,
    altitudeM: 0,
    pitchDeg: 0,
    rollDeg: 0,
    yawDeg: 0,
    throttlePct: 0,
    batteryPct: 100,
    isGrounded: true,
    hasCrashed: false,
    hasPatient: false,
    propellerRpm: 0,
    armed: true
  });

  const [cameraView, setCameraView] = useState<CameraView>('CHASE');
  const [speedGear, setSpeedGear] = useState<SpeedGear>(1);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [tutorialStep, setTutorialStep] = useState<number>(1);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Mode 2 Virtual Stick values
  const [stickValues, setStickValues] = useState<{
    leftX: number; // yaw
    leftY: number; // throttle
    rightX: number; // roll
    rightY: number; // pitch
  }>({
    leftX: 0,
    leftY: 0,
    rightX: 0,
    rightY: 0
  });

  // Mission Real-Time Data
  const [missionData, setMissionData] = useState({
    coinsCollected: 0,
    totalCoins: 8,
    currentRing: 1,
    totalRings: 7,
    patientPickedUp: false,
    patientDelivered: false,
    currentLap: 1,
    totalLaps: 2
  });

  // Modal Views
  const [resultModal, setResultModal] = useState<{
    show: boolean;
    stage: MissionStage | null;
    stars: number;
    timeSec: number;
    isNewRecord: boolean;
    racePlayerWon?: boolean;
    aiTimeSec?: number;
  }>({
    show: false,
    stage: null,
    stars: 0,
    timeSec: 0,
    isNewRecord: false
  });

  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showSkinModal, setShowSkinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // 3D Engine World Ref & Live State Tracking Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const droneWorldRef = useRef<DroneWorld | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const elapsedSecRef = useRef<number>(0);
  const stageCompletedRef = useRef<boolean>(false);
  const currentStageRef = useRef<MissionStage | null>(currentStage);
  currentStageRef.current = currentStage;

  // Active Skin
  const activeSkin: DroneSkin = DRONE_SKINS.find(s => s.id === profile.selectedSkinId) || DRONE_SKINS[0];

  // Save profile helper
  const updateProfile = useCallback((updater: (prev: UserPilotProfile) => UserPilotProfile) => {
    setProfile(prev => {
      const next = updater(prev);
      saveUserProfile(next);
      return next;
    });
  }, []);

  // Sync sound settings & drone model to sound manager
  useEffect(() => {
    soundManager.setSoundEnabled(profile.soundEnabled);
    soundManager.setVoiceEnabled(profile.voiceGuideEnabled);
    soundManager.setDroneModel(activeSkin.modelType);
  }, [profile.soundEnabled, profile.voiceGuideEnabled, activeSkin.modelType]);

  // Manage Lobby BGM vs AI Rival Racing BGM vs In-game sound
  useEffect(() => {
    if (!profile.soundEnabled) {
      soundManager.stopBgm();
      return;
    }

    if (!currentStage) {
      // In Lobby / Main screen: Play atmospheric cyber drone Lobby BGM once app is active
      if (hasStartedApp) {
        soundManager.playLobbyBgm();
      }
    } else {
      // In Game:
      if (currentStage.id === 'ai-racing-2') {
        // AI Rival Racing Level 2 (Veteran Hard): Play 162 BPM Cyber Overdrive DnB track!
        soundManager.playRacingLevel2Bgm();
      } else if (currentStage.type === 'AI_RACING' || currentStage.id === 'ai-racing-1' || currentStage.id === 'stage-6') {
        // AI Rival Racing Level 1 (Rookie): Play 148 BPM Hot Drop Trap EDM track!
        soundManager.playRacingBgm();
      } else {
        // Other flight stages: Stop BGM to focus purely on motor acoustics and flight telemetry
        soundManager.stopBgm();
      }
    }
  }, [currentStage, profile.soundEnabled, hasStartedApp]);

  // Automatically enter fullscreen on any first user touch/interaction
  useEffect(() => {
    const handleInitialUserInteraction = () => {
      requestFullscreen().catch(() => {});
    };

    window.addEventListener('click', handleInitialUserInteraction, { once: true });
    window.addEventListener('touchstart', handleInitialUserInteraction, { once: true });
    window.addEventListener('pointerdown', handleInitialUserInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInitialUserInteraction);
      window.removeEventListener('touchstart', handleInitialUserInteraction);
      window.removeEventListener('pointerdown', handleInitialUserInteraction);
    };
  }, []);

  // Clean up sounds completely when app is closed / unmounted
  useEffect(() => {
    return () => {
      soundManager.stopAllAudioImmediately();
    };
  }, []);

  // Handle stage completion
  const handleStageComplete = useCallback((finishTimeSec?: number, raceResult?: { playerWon: boolean; aiTimeSec: number }) => {
    const stage = currentStageRef.current;
    if (!stage || stageCompletedRef.current) return;
    stageCompletedRef.current = true;

    const timeSec = finishTimeSec !== undefined ? finishTimeSec : elapsedSecRef.current;

    soundManager.stopMotorSound();
    soundManager.stopBgm();

    const isAiRace = stage.type === 'AI_RACING';
    let stars = 1;

    if (isAiRace) {
      const playerWon = raceResult ? raceResult.playerWon : false;
      if (playerWon) {
        soundManager.playVictory();
        soundManager.speakGuide('우와! 1등 우승! 멋지게 승리했어!');
        // Reward 2 or 3 stars when defeating AI based on race finish time
        if (timeSec <= stage.starThresholds[0]) stars = 3;
        else if (timeSec <= stage.starThresholds[1]) stars = 2;
        else stars = 2;
      } else {
        // Defeat against AI: Award 1 star completion reward
        stars = 1;
        soundManager.speakGuide('아깝다! 그래도 끝까지 멋지게 완주했어! 최고야!');
      }
    } else {
      soundManager.playVictory();
      soundManager.speakGuide('와아, 미션 성공! 완벽한 비행이었어!');
      if (stage.timeLimitSec > 0) {
        if (timeSec <= stage.starThresholds[0]) stars = 3;
        else if (timeSec <= stage.starThresholds[1]) stars = 2;
        else stars = 1;
      } else {
        stars = 3;
      }
    }

    let isNewRecord = false;

    setProfile(prevProfile => {
      const currentProgress = prevProfile.missionProgress[stage.id];
      const prevBest = currentProgress?.bestTimeSec;
      isNewRecord = prevBest === null || timeSec < prevBest;

      const nextProgress = { ...prevProfile.missionProgress };
      nextProgress[stage.id] = {
        unlocked: true,
        completed: true,
        bestTimeSec: isNewRecord ? timeSec : prevBest,
        highScore: Math.max(currentProgress?.highScore || 0, stars * 1000),
        stars: Math.max(currentProgress?.stars || 0, stars)
      };

      const updatedProfile = {
        ...prevProfile,
        totalMissionsCompleted: prevProfile.totalMissionsCompleted + 1,
        missionProgress: nextProgress
      };
      saveUserProfile(updatedProfile);
      return updatedProfile;
    });

    setResultModal({
      show: true,
      stage: stage,
      stars,
      timeSec,
      isNewRecord,
      racePlayerWon: isAiRace ? (raceResult?.playerWon ?? false) : undefined,
      aiTimeSec: isAiRace ? (raceResult?.aiTimeSec ?? undefined) : undefined
    });
  }, []);

  const handleTutorialStepComplete = useCallback((completedStep: number) => {
    soundManager.playRingPass();
    if (completedStep < 4) {
      setTutorialStep(prev => Math.max(prev, completedStep + 1));
      soundManager.speakGuide(`성공! 다음 ${completedStep + 1}단계로 출발해보자!`);
    } else {
      handleStageComplete(elapsedSecRef.current);
    }
  }, [handleStageComplete]);

  // Telemetry callback
  const handleTelemetry = useCallback((data: DroneTelemetry) => {
    setTelemetry(data);
    soundManager.updateMotorSound(data.throttlePct, data.speedKmh, data.isGrounded);
  }, []);

  // Stable callbacks ref for DroneWorld
  const callbacksRef = useRef({
    onTelemetry: handleTelemetry,
    onCoinCollected: (_coinId: number, total: number) => {
      soundManager.playCoin();
      setMissionData(prev => ({ ...prev, coinsCollected: total }));
      updateProfile(prev => ({ ...prev, totalCoinsCollected: prev.totalCoinsCollected + 1 }));
      const targetCoins = currentStageRef.current?.targetCount || 8;
      if (total >= targetCoins) {
        handleStageComplete(elapsedSecRef.current);
      }
    },
    onRingPassed: (ringId: number, nextRingId: number) => {
      soundManager.playRingPass();
      setMissionData(prev => ({ ...prev, currentRing: ringId + 1 }));
      updateProfile(prev => ({ ...prev, totalRingsPassed: prev.totalRingsPassed + 1 }));
      if (nextRingId === 0) {
        handleStageComplete(elapsedSecRef.current);
      }
    },
    onPatientPickedUp: () => {
      soundManager.playRescuePickup();
      soundManager.speakGuide('구조 캡슐 결착 완료! 어서 병원으로 날아가자!');
      setMissionData(prev => ({ ...prev, patientPickedUp: true }));
    },
    onPatientDelivered: () => {
      soundManager.playRescueDelivered();
      soundManager.speakGuide('환자 이송 성공! 생명을 구했어! 최고야!');
      setMissionData(prev => ({ ...prev, patientDelivered: true }));
      updateProfile(prev => ({ ...prev, totalPatientsRescued: prev.totalPatientsRescued + 1 }));
      setTimeout(() => {
        handleStageComplete(elapsedSecRef.current);
      }, 1000);
    },
    onCrash: (impactSpeed: number) => {
      soundManager.playSparkImpact(impactSpeed);
    },
    onLapFinished: (lap: number, totalLaps: number, _lapTime: number, playerAhead: boolean) => {
      soundManager.playRingPass();
      setMissionData(prev => ({ ...prev, currentLap: lap + 1 }));
      soundManager.speakGuide(`${lap}바퀴 완주! ${playerAhead ? '우와, 지금 1등이야! 계속 달려!' : '조금만 더 힘내! 따라잡을 수 있어!'}`);
    },
    onRaceFinished: (playerWon: boolean, playerTime: number, aiTime: number) => {
      if (playerWon) {
        updateProfile(prev => ({ ...prev, totalRacesWon: prev.totalRacesWon + 1 }));
      }
      handleStageComplete(playerTime, { playerWon, aiTimeSec: aiTime });
    }
  });

  // Always update latest callback handlers
  useEffect(() => {
    callbacksRef.current = {
      onTelemetry: handleTelemetry,
      onCoinCollected: (_coinId, total) => {
        soundManager.playCoin();
        setMissionData(prev => ({ ...prev, coinsCollected: total }));
        updateProfile(prev => ({ ...prev, totalCoinsCollected: prev.totalCoinsCollected + 1 }));
        const targetCoins = currentStageRef.current?.targetCount || 8;
        if (total >= targetCoins) {
          handleStageComplete(elapsedSecRef.current);
        }
      },
      onRingPassed: (ringId, nextRingId) => {
        soundManager.playRingPass();
        setMissionData(prev => ({ ...prev, currentRing: ringId + 1 }));
        updateProfile(prev => ({ ...prev, totalRingsPassed: prev.totalRingsPassed + 1 }));
        if (nextRingId === 0) {
          handleStageComplete(elapsedSecRef.current);
        }
      },
      onPatientPickedUp: () => {
        soundManager.playRescuePickup();
        soundManager.speakGuide('구조 캡슐 결착 완료! 어서 병원으로 날아가자!');
        setMissionData(prev => ({ ...prev, patientPickedUp: true }));
      },
      onPatientDelivered: () => {
        soundManager.playRescueDelivered();
        soundManager.speakGuide('환자 이송 성공! 생명을 구했어! 최고야!');
        setMissionData(prev => ({ ...prev, patientDelivered: true }));
        updateProfile(prev => ({ ...prev, totalPatientsRescued: prev.totalPatientsRescued + 1 }));
        setTimeout(() => {
          handleStageComplete(elapsedSecRef.current);
        }, 1000);
      },
      onCrash: (impactSpeed) => {
        soundManager.playSparkImpact(impactSpeed);
      },
      onLapFinished: (lap, _totalLaps, _lapTime, playerAhead) => {
        soundManager.playRingPass();
        setMissionData(prev => ({ ...prev, currentLap: lap + 1 }));
        soundManager.speakGuide(`${lap}바퀴 완주! ${playerAhead ? '우와, 지금 1등이야! 계속 달려!' : '조금만 더 힘내! 따라잡을 수 있어!'}`);
      },
      onRaceFinished: (playerWon, playerTime, aiTime) => {
        if (playerWon) {
          updateProfile(prev => ({ ...prev, totalRacesWon: prev.totalRacesWon + 1 }));
        }
        handleStageComplete(playerTime, { playerWon, aiTimeSec: aiTime });
      }
    };
  }, [handleTelemetry, handleStageComplete, updateProfile]);

  // Countdown Timer & Race Start Manager
  const startMissionCountdown = useCallback(() => {
    countdownTimeoutsRef.current.forEach(clearTimeout);
    countdownTimeoutsRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);

    setElapsedSec(0);
    elapsedSecRef.current = 0;
    droneWorldRef.current?.setRaceReady(false);

    // Initial 3 Countdown Step
    setCountdown(3);
    soundManager.playCountdownBeep(false);

    // 2 Countdown Step (1.0s)
    const t1 = setTimeout(() => {
      setCountdown(2);
      soundManager.playCountdownBeep(false);
    }, 1000);

    // 1 Countdown Step (2.0s)
    const t2 = setTimeout(() => {
      setCountdown(1);
      soundManager.playCountdownBeep(false);
    }, 2000);

    // Launch immediately upon reaching 0 (3.0s) - no green START overlay
    const t3 = setTimeout(() => {
      setCountdown(null);
      soundManager.playCountdownBeep(true);
      droneWorldRef.current?.setRaceReady(true);

      // Start elapsed timer exactly from 0.0s at launch
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedSec(prev => {
          const next = Math.round((prev + 0.1) * 10) / 10;
          elapsedSecRef.current = next;
          return next;
        });
      }, 100);
    }, 3000);

    countdownTimeoutsRef.current = [t1, t2, t3];
  }, []);

  // Initialize or reload 3D Drone World when entering / switching stages
  useEffect(() => {
    if (!currentStage) {
      if (timerRef.current) clearInterval(timerRef.current);
      countdownTimeoutsRef.current.forEach(clearTimeout);
      countdownTimeoutsRef.current = [];
      setCountdown(null);
      soundManager.stopMotorSound();
      if (droneWorldRef.current) {
        droneWorldRef.current.destroy();
        droneWorldRef.current = null;
      }
      return;
    }

    if (!canvasContainerRef.current) return;

    // Reset mission states & timers
    stageCompletedRef.current = false;
    setTutorialStep(1);
    setMissionData({
      coinsCollected: 0,
      totalCoins: currentStage.type === 'COIN_HUNT' ? (currentStage.targetCount || 8) : 8,
      currentRing: 1,
      totalRings: currentStage.targetCount || (currentStage.id === 'tutorial-2' ? 3 : 5),
      patientPickedUp: false,
      patientDelivered: false,
      currentLap: 1,
      totalLaps: currentStage.type === 'AI_RACING' ? 2 : 1
    });

    soundManager.startMotorSound();

    // Reuse existing world or create new if not existing
    const isAiRace = currentStage.type === 'AI_RACING';
    if (isAiRace) {
      setSpeedGear(2); // Strictly lock to Sport Mode (Gear 2) in Stage 6 Grand Prix
    }

    if (!droneWorldRef.current) {
      const world = new DroneWorld(canvasContainerRef.current, activeSkin, {
        onTelemetry: (data) => callbacksRef.current.onTelemetry(data),
        onCoinCollected: (id, t) => callbacksRef.current.onCoinCollected(id, t),
        onRingPassed: (id, nextId) => callbacksRef.current.onRingPassed(id, nextId),
        onPatientPickedUp: () => callbacksRef.current.onPatientPickedUp(),
        onPatientDelivered: () => callbacksRef.current.onPatientDelivered(),
        onCrash: (spd) => callbacksRef.current.onCrash(spd),
        onLapFinished: (lap, total, lapT, ahead) => callbacksRef.current.onLapFinished(lap, total, lapT, ahead),
        onRaceFinished: (won, pTime, aiTime) => callbacksRef.current.onRaceFinished(won, pTime, aiTime)
      });

      world.setAssistLevel(profile.assistLevel);
      world.setSensitivity(profile.sensitivity);
      world.setInvertPitch(profile.invertPitch);
      world.setSpeedGear(isAiRace ? 2 : speedGear);
      world.loadMission(currentStage);
      droneWorldRef.current = world;
    } else {
      if (isAiRace) {
        droneWorldRef.current.setSpeedGear(2);
      }
      droneWorldRef.current.loadMission(currentStage);
    }

    // Launch official 3, 2, 1 START countdown sequence
    startMissionCountdown();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      countdownTimeoutsRef.current.forEach(clearTimeout);
    };
  }, [currentStage?.id, activeSkin.id, profile.assistLevel, profile.sensitivity, profile.invertPitch, startMissionCountdown]);

  // Apply control inputs to DroneWorld
  useEffect(() => {
    if (droneWorldRef.current) {
      const input: DroneControlInput = {
        throttle: stickValues.leftY,
        yaw: stickValues.leftX,
        pitch: stickValues.rightY,
        roll: stickValues.rightX
      };
      droneWorldRef.current.setControlInput(input);
    }
  }, [stickValues]);

  const handleAutoTakeoffLanding = useCallback(() => {
    droneWorldRef.current?.triggerAutoTakeoffLanding();
  }, []);

  // Stage Handlers & Full Reset Logic
  const handleResetDrone = useCallback(() => {
    if (!currentStage) return;
    stageCompletedRef.current = false;
    setElapsedSec(0);
    elapsedSecRef.current = 0;
    setTutorialStep(1);
    setMissionData({
      coinsCollected: 0,
      totalCoins: currentStage.type === 'COIN_HUNT' ? (currentStage.targetCount || 8) : 8,
      currentRing: 1,
      totalRings: currentStage.targetCount || (currentStage.id === 'tutorial-2' ? 3 : 5),
      patientPickedUp: false,
      patientDelivered: false,
      currentLap: 1,
      totalLaps: currentStage.type === 'AI_RACING' ? 2 : 1
    });
    setStickValues({ leftX: 0, leftY: 0, rightX: 0, rightY: 0 });

    const isAiRace = currentStage.type === 'AI_RACING' || currentStage.id === 'ai-racing-1' || currentStage.id === 'stage-6';
    if (isAiRace) {
      setSpeedGear(2);
      droneWorldRef.current?.setSpeedGear(2);
    }

    if (droneWorldRef.current) {
      droneWorldRef.current.loadMission(currentStage);
    }
    soundManager.startMotorSound();
    startMissionCountdown();
  }, [currentStage, startMissionCountdown]);

  // Keyboard Controller handler
  useEffect(() => {
    if (!currentStage) return;

    const keyState = {
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      KeyI: false,
      KeyK: false,
      KeyJ: false,
      KeyL: false
    };

    const updateSticksFromKeys = () => {
      let ly = 0; // Throttle
      let lx = 0; // Yaw
      let ry = 0; // Pitch
      let rx = 0; // Roll

      // Left stick (Throttle / Yaw)
      if (keyState.KeyW) ly += 1;
      if (keyState.KeyS) ly -= 1;
      if (keyState.KeyA) lx -= 1;
      if (keyState.KeyD) lx += 1;

      // Right stick (Pitch / Roll)
      if (keyState.ArrowUp || keyState.KeyI) ry += 1;
      if (keyState.ArrowDown || keyState.KeyK) ry -= 1;
      if (keyState.ArrowLeft || keyState.KeyJ) rx -= 1;
      if (keyState.ArrowRight || keyState.KeyL) rx += 1;

      setStickValues({
        leftX: lx,
        leftY: ly,
        rightX: rx,
        rightY: ry
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code in keyState) {
        keyState[e.code as keyof typeof keyState] = true;
        updateSticksFromKeys();
      }
      if (e.code === 'KeyR') {
        handleResetDrone();
      }
      if (e.code === 'KeyT' || e.code === 'Space') {
        handleAutoTakeoffLanding();
      }
      if (e.code === 'KeyC') {
        setCameraView(prev => {
          const next = prev === 'CHASE' ? 'FPV' : prev === 'FPV' ? 'TOP' : 'CHASE';
          droneWorldRef.current?.setCameraView(next);
          return next;
        });
      }
      const isAiRace = currentStage.type === 'AI_RACING' || currentStage.id === 'ai-racing-1' || currentStage.id === 'stage-6';

      if (e.code === 'KeyG' || e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' || e.code === 'Numpad1' || e.code === 'Numpad2' || e.code === 'Numpad3') {
        if (isAiRace) {
          setSpeedGear(2);
          droneWorldRef.current?.setSpeedGear(2);
          soundManager.speakGuide('6단계 레이스는 스피드 스포츠 모드로 달릴게!');
          return;
        }
      }

      if (e.code === 'KeyG') {
        setSpeedGear(prev => {
          const next: SpeedGear = prev === 1 ? 2 : prev === 2 ? 3 : 1;
          droneWorldRef.current?.setSpeedGear(next);
          soundManager.speakGuide(next === 1 ? '1단 산뜻한 순항 모드!' : next === 2 ? '2단 신나는 스포츠 모드!' : '3단 초고속 터보 모드!');
          return next;
        });
      }
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        setSpeedGear(1);
        droneWorldRef.current?.setSpeedGear(1);
        soundManager.speakGuide('1단 산뜻한 순항 모드!');
      }
      if (e.code === 'Digit2' || e.code === 'Numpad2') {
        setSpeedGear(2);
        droneWorldRef.current?.setSpeedGear(2);
        soundManager.speakGuide('2단 신나는 스포츠 모드!');
      }
      if (e.code === 'Digit3' || e.code === 'Numpad3') {
        setSpeedGear(3);
        droneWorldRef.current?.setSpeedGear(3);
        soundManager.speakGuide('3단 초고속 터보 모드!');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code in keyState) {
        keyState[e.code as keyof typeof keyState] = false;
        updateSticksFromKeys();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentStage, handleResetDrone]);

  // Stage Handlers
  const handleSelectStage = (stage: MissionStage) => {
    setCurrentStage(stage);
  };

  const handleExitMission = () => {
    setCurrentStage(null);
  };

  const handleCycleCamera = () => {
    setCameraView(prev => {
      const views: CameraView[] = ['CHASE', 'FPV', 'TOP', 'FOLLOW_FAR'];
      const nextIdx = (views.indexOf(prev) + 1) % views.length;
      const next = views[nextIdx];
      droneWorldRef.current?.setCameraView(next);
      return next;
    });
  };

  const handleToggleAssist = () => {
    updateProfile(prev => {
      const nextLevel = prev.assistLevel === 'BEGINNER' 
        ? 'INTERMEDIATE' 
        : prev.assistLevel === 'INTERMEDIATE' 
        ? 'EXPERT' 
        : 'BEGINNER';
      droneWorldRef.current?.setAssistLevel(nextLevel);
      soundManager.speakGuide(nextLevel === 'BEGINNER' ? '초보자 자동 균형 보조 켰어!' : nextLevel === 'INTERMEDIATE' ? '중급 비행 모드로 변경!' : '수동 전문가 모드! 실력을 보여줘!');
      return { ...prev, assistLevel: nextLevel };
    });
  };

  const handleChangeSpeedGear = (gear?: SpeedGear) => {
    const isAiRace = currentStage?.type === 'AI_RACING' || currentStage?.id === 'ai-racing-1' || currentStage?.id === 'stage-6';
    if (isAiRace) {
      setSpeedGear(2);
      droneWorldRef.current?.setSpeedGear(2);
      soundManager.speakGuide('6단계 레이스는 스피드 스포츠 모드로 달릴게!');
      return;
    }

    setSpeedGear(prev => {
      const next: SpeedGear = gear !== undefined ? gear : (prev === 1 ? 2 : prev === 2 ? 3 : 1);
      droneWorldRef.current?.setSpeedGear(next);
      soundManager.speakGuide(next === 1 ? '1단 산뜻한 순항 모드!' : next === 2 ? '2단 신나는 스포츠 모드!' : '3단 초고속 터보 모드!');
      return next;
    });
  };

  const handleToggleSound = () => {
    updateProfile(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none font-sans">
      {/* 0. If First Launch / Splash Screen: Show Start Screen with Title and Photo */}
      {!hasStartedApp ? (
        <StartSplashScreen
          profile={profile}
          onStart={() => setHasStartedApp(true)}
        />
      ) : !currentStage ? (
        /* 1. If in Menu: Show Stage Expedition Roadmap Selector */
        <MissionSelector
          profile={profile}
          activeSkin={activeSkin}
          onSelectStage={handleSelectStage}
          onOpenLicense={() => setShowLicenseModal(true)}
          onOpenSkins={() => setShowSkinModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenHelp={() => setShowHelpModal(true)}
          onReturnHome={() => setHasStartedApp(false)}
        />
      ) : (
        /* 2. If in 3D Flight Simulation: Render Canvas & HUD & Controls */
        <div className="relative w-full h-full">
          {/* 3D WebGL Canvas Layer */}
          <div ref={canvasContainerRef} className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Flight Instruments & HUD */}
          <FlightHUD
            telemetry={telemetry}
            stage={currentStage}
            cameraView={cameraView}
            speedGear={speedGear}
            soundEnabled={profile.soundEnabled}
            elapsedSec={elapsedSec}
            missionData={missionData}
            onCycleCamera={handleCycleCamera}
            onChangeSpeedGear={handleChangeSpeedGear}
            onToggleSound={handleToggleSound}
            onResetDrone={handleResetDrone}
            onEmergencyStop={() => {
              droneWorldRef.current?.emergencyHoverStop();
              setStickValues({ leftX: 0, leftY: 0, rightX: 0, rightY: 0 });
              soundManager.speakGuide('제자리 호버링 멈춤!');
            }}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenHelp={() => setShowHelpModal(true)}
            onExitMission={handleExitMission}
          />

          {/* Tutorial Step Overlay Guide (for tutorial-1) */}
          {currentStage.type === 'TUTORIAL' && currentStage.id === 'tutorial-1' && (
            <TutorialGuideOverlay
              step={tutorialStep}
              telemetry={telemetry}
              onStepComplete={handleTutorialStepComplete}
            />
          )}

          {/* Countdown Overlay (3, 2, 1, START!) */}
          <CountdownOverlay count={countdown} />

          {/* Mode 2 Virtual Touch Joysticks (Bottom Left & Right - Ergonomic for thumbs in landscape) */}
          <div className="absolute inset-x-0 bottom-2 sm:bottom-4 md:bottom-6 px-3 sm:px-6 md:px-10 flex items-end justify-between pointer-events-none z-10">
            {/* Left Joystick Column: Auto Takeoff/Land Button on Top + Left Stick (Throttle/Yaw) */}
            <div className="pointer-events-auto flex flex-col items-center gap-1.5">
              {/* One-Touch Auto Takeoff / Landing Button (왼쪽 스틱 바로 위) */}
              <button
                id="hud-auto-takeoff-land-btn"
                onClick={handleAutoTakeoffLanding}
                className={`px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm border-2 border-white shadow-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  telemetry.autoFlightState === 'TAKEOFF'
                    ? 'bg-emerald-500 text-white animate-pulse shadow-emerald-500/50'
                    : telemetry.autoFlightState === 'LANDING'
                    ? 'bg-sky-500 text-white animate-pulse shadow-sky-500/50'
                    : (telemetry.isGrounded || telemetry.altitudeM < 0.45)
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/40'
                }`}
                title={
                  (telemetry.isGrounded || telemetry.altitudeM < 0.45)
                    ? '원터치 자동 이륙 (2.8m 호버링 고도로 자동 상승)'
                    : '원터치 자동 착륙 (제자리 감속 후 안전 착륙)'
                }
              >
                {telemetry.autoFlightState === 'TAKEOFF' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>이륙 중 (2.8m)...</span>
                  </>
                ) : telemetry.autoFlightState === 'LANDING' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>착륙 중...</span>
                  </>
                ) : (telemetry.isGrounded || telemetry.altitudeM < 0.45) ? (
                  <>
                    <span className="text-base sm:text-lg">🛫</span>
                    <span>자동 이륙</span>
                  </>
                ) : (
                  <>
                    <span className="text-base sm:text-lg">🛬</span>
                    <span>자동 착륙</span>
                  </>
                )}
              </button>

              <VirtualJoystick
                id="joystick-left"
                type="LEFT_STICK"
                title="왼쪽 스틱 (Mode 2)"
                subLabel="상승·하강 / 좌·우회전"
                valueX={stickValues.leftX}
                valueY={stickValues.leftY}
                onChange={(x, y) => setStickValues(prev => ({ ...prev, leftX: x, leftY: y }))}
                autoCenterY={true}
              />
            </div>

            {/* Right Joystick: Pitch (Forward/Back) & Roll (Left/Right) */}
            <div className="pointer-events-auto">
              <VirtualJoystick
                id="joystick-right"
                type="RIGHT_STICK"
                title="오른쪽 스틱 (Mode 2)"
                subLabel="전진·후진 / 좌·우이동"
                valueX={stickValues.rightX}
                valueY={stickValues.rightY}
                onChange={(x, y) => setStickValues(prev => ({ ...prev, rightX: x, rightY: y }))}
                autoCenterY={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mission Result Modal */}
      {resultModal.show && resultModal.stage && (
        <MissionResultModal
          stage={resultModal.stage}
          stars={resultModal.stars}
          timeSec={resultModal.timeSec}
          isNewRecord={resultModal.isNewRecord}
          racePlayerWon={resultModal.racePlayerWon}
          aiTimeSec={resultModal.aiTimeSec}
          onRetry={() => {
            setResultModal(prev => ({ ...prev, show: false }));
            handleResetDrone();
          }}
          onNext={() => {
            setResultModal(prev => ({ ...prev, show: false }));
            const currentIdx = MISSION_STAGES.findIndex(s => s.id === resultModal.stage?.id);
            if (currentIdx !== -1 && currentIdx + 1 < MISSION_STAGES.length) {
              setCurrentStage(MISSION_STAGES[currentIdx + 1]);
            } else {
              setCurrentStage(null);
            }
          }}
          onHome={() => {
            setResultModal(prev => ({ ...prev, show: false }));
            setCurrentStage(null);
          }}
        />
      )}

      {/* Pilot License Modal */}
      {showLicenseModal && (
        <PilotLicenseModal
          profile={profile}
          onUpdateName={(name, callsign) => {
            updateProfile(prev => ({ ...prev, pilotName: name, callsign }));
          }}
          onClose={() => setShowLicenseModal(false)}
        />
      )}

      {/* Drone Skin / Hangar Modal */}
      {showSkinModal && (
        <DroneSkinModal
          profile={profile}
          selectedSkinId={profile.selectedSkinId}
          onSelectSkin={(skin) => {
            updateProfile(prev => ({ ...prev, selectedSkinId: skin.id }));
            droneWorldRef.current?.updateSkin(skin);
          }}
          onClose={() => setShowSkinModal(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          profile={profile}
          onUpdateSettings={(updated) => {
            updateProfile(prev => ({ ...prev, ...updated }));
            if (updated.assistLevel && droneWorldRef.current) {
              droneWorldRef.current.setAssistLevel(updated.assistLevel);
            }
            if (updated.sensitivity && droneWorldRef.current) {
              droneWorldRef.current.setSensitivity(updated.sensitivity);
            }
          }}
          onResetSaveData={() => {
            const fresh = getDefaultProfile();
            setProfile(fresh);
            saveUserProfile(fresh);
            setShowSettingsModal(false);
          }}
          onResetProgressAndStars={() => {
            updateProfile(prev => {
              const resetProgress = { ...prev.missionProgress };
              Object.keys(resetProgress).forEach(key => {
                resetProgress[key] = {
                  ...resetProgress[key],
                  stars: 0,
                  completed: false,
                  bestTimeSec: null,
                  highScore: 0
                };
              });
              return {
                ...prev,
                missionProgress: resetProgress
              };
            });
            soundManager.playCoin();
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <HelpManualModal onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
}
