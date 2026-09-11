import React from 'react';
import { 
  DroneTelemetry, 
  MissionStage, 
  CameraView,
  SpeedGear 
} from '../types';
import { 
  RotateCcw, 
  Camera, 
  Volume2, 
  VolumeX, 
  Gauge, 
  ArrowUp, 
  Coins, 
  Target, 
  HeartPulse, 
  Trophy, 
  Sparkles, 
  Settings, 
  LogOut,
  Navigation,
  AlertTriangle
} from 'lucide-react';

interface FlightHUDProps {
  telemetry: DroneTelemetry;
  stage: MissionStage;
  cameraView: CameraView;
  speedGear: SpeedGear;
  soundEnabled: boolean;
  elapsedSec: number;
  missionData: {
    coinsCollected: number;
    totalCoins: number;
    currentRing: number;
    totalRings: number;
    patientPickedUp: boolean;
    patientDelivered: boolean;
    currentLap: number;
    totalLaps: number;
  };
  onCycleCamera: () => void;
  onChangeSpeedGear: (gear?: SpeedGear) => void;
  onToggleSound: () => void;
  onResetDrone: () => void;
  onEmergencyStop?: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onExitMission: () => void;
}

const FlightHUDComponent: React.FC<FlightHUDProps> = ({
  telemetry,
  stage,
  cameraView,
  speedGear,
  soundEnabled,
  elapsedSec,
  missionData,
  onCycleCamera,
  onChangeSpeedGear,
  onToggleSound,
  onResetDrone,
  onEmergencyStop,
  onOpenSettings,
  onExitMission
}) => {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  const getCameraLabel = (view: CameraView) => {
    switch (view) {
      case 'FPV': return 'FPV 1인칭';
      case 'CHASE': return 'CHASE 3인칭';
      case 'TOP': return 'TOP 탑뷰';
      case 'FOLLOW_FAR': return 'FAR 원거리';
    }
  };

  const isAiRace = stage.type === 'AI_RACING';

  // Calculate horizon tilt clamped for clean tactical HUD visuals
  const rollAngle = Math.max(-25, Math.min(25, Math.round(telemetry.rollDeg || 0)));
  const pitchOffset = Math.max(-20, Math.min(20, Math.round(telemetry.pitchDeg || 0)));

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-4 font-sans select-none z-10 overflow-hidden">
      
      {/* ─── 1. TOP AVIONICS GLASS HEADER BAR & UPPER GAUGES ─── */}
      <div className="w-full flex flex-col gap-2 pointer-events-none">
        <div className="flex items-start justify-between gap-2 w-full">
          
          {/* Left: Mission / Objective Flight Deck */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Mission Exit Button */}
            <button
              id="hud-exit-mission"
              onClick={onExitMission}
              className="group flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 hover:text-white font-bold text-xs sm:text-sm border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all active:scale-95 cursor-pointer"
              title="미션 나가기"
            >
              <LogOut className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              <span className="hidden sm:inline">나가기</span>
            </button>

            {/* Mission Objective Card */}
            <div className="flex items-center gap-2.5 bg-slate-950/92 px-3.5 py-1.5 rounded-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)] text-white max-w-[220px] sm:max-w-md">
              {/* Mission Type Icon */}
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
                {stage.type === 'COIN_HUNT' && <Coins className="w-4 h-4 text-amber-400" />}
                {stage.type === 'RING_RACE' && <Target className="w-4 h-4 text-rose-400" />}
                {stage.type === 'RESCUE' && <HeartPulse className="w-4 h-4 text-rose-400" />}
                {stage.type === 'AI_RACING' && <Trophy className="w-4 h-4 text-purple-400" />}
                {stage.type === 'TUTORIAL' && <Sparkles className="w-4 h-4 text-cyan-400" />}
                {stage.type === 'FREE_FLIGHT' && <Navigation className="w-4 h-4 text-emerald-400" />}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-[10px] sm:text-xs text-cyan-300 font-semibold tracking-wider uppercase truncate">
                  {stage.title}
                </span>
                
                {/* Dynamic Mission Goal Status */}
                <div className="text-xs sm:text-sm font-black tracking-tight">
                  {stage.type === 'COIN_HUNT' && (
                    <span className="text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
                      {missionData.coinsCollected} <span className="text-slate-400 font-normal">/ {missionData.totalCoins} COINS</span>
                    </span>
                  )}
                  {stage.type === 'RING_RACE' && (
                    <span className="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]">
                      {missionData.currentRing} <span className="text-slate-400 font-normal">/ {missionData.totalRings} RINGS</span>
                    </span>
                  )}
                  {stage.type === 'RESCUE' && (
                    <span className={missionData.patientDelivered ? "text-emerald-400" : missionData.patientPickedUp ? "text-cyan-300 animate-pulse" : "text-amber-400"}>
                      {missionData.patientDelivered ? '★ 구조 완료' : missionData.patientPickedUp ? '🏥 병원 이송 중' : '🚨 조난자 접근'}
                    </span>
                  )}
                  {stage.type === 'AI_RACING' && (
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300">
                        LAP {missionData.currentLap}/{missionData.totalLaps}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                        telemetry.raceRank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {telemetry.raceRank === 1 ? '1위 LEAD' : '2위 CHASE'}
                      </span>
                    </div>
                  )}
                  {stage.type === 'TUTORIAL' && (
                    <span className="text-emerald-400">
                      {stage.id === 'tutorial-2' 
                        ? (missionData.currentRing > 3 ? '★ 베이스 착륙!' : `${missionData.currentRing}/3 게이트 통과`) 
                        : '비행 훈련 중'}
                    </span>
                  )}
                  {stage.type === 'FREE_FLIGHT' && (
                    <span className="text-cyan-300 font-mono text-[11px]">
                      FREE FLIGHT MODE
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center: Mission Chronometer */}
          <div className="pointer-events-auto flex flex-col items-center gap-1">
            {/* Precision Flight Timer */}
            {stage.timeLimitSec > 0 && (
              <div className="bg-slate-950/92 px-3.5 py-1 rounded-xl border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">TIME</span>
                <span className="text-sm sm:text-base font-black font-mono text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                  {formatTime(elapsedSec)}
                </span>
              </div>
            )}
          </div>

          {/* Right: Flight Controls & Gear System */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/92 p-1.5 rounded-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            {/* Speed Gear Multiplier (1단 / 2단 / 3단) */}
            {isAiRace ? (
              <div className="px-2.5 py-1 bg-purple-500/20 rounded-lg text-xs font-black text-purple-300 border border-purple-400/40 font-mono">
                2단 SPORT 고정
              </div>
            ) : (
              <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                <button
                  id="hud-gear-1-btn"
                  onClick={() => onChangeSpeedGear(1)}
                  className={`px-2 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer font-mono ${
                    speedGear === 1 
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.6)]' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="1단: ECO 순항"
                >
                  1단
                </button>
                <button
                  id="hud-gear-2-btn"
                  onClick={() => onChangeSpeedGear(2)}
                  className={`px-2 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer font-mono ${
                    speedGear === 2 
                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.6)]' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="2단: STD 표준"
                >
                  2단
                </button>
                <button
                  id="hud-gear-3-btn"
                  onClick={() => onChangeSpeedGear(3)}
                  className={`px-2 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer font-mono ${
                    speedGear === 3 
                      ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.6)]' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="3단: TURBO 터보"
                >
                  3단
                </button>
              </div>
            )}

            {/* Quick Reset */}
            <button
              id="hud-reset-drone"
              onClick={onResetDrone}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-400/40 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 font-mono"
              title="드론 위치 리셋 (R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">리셋</span>
            </button>

            {/* Camera View Switcher */}
            <button
              id="hud-camera-toggle"
              onClick={onCycleCamera}
              className="p-1.5 sm:px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
              title="카메라 시점 전환"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline text-[11px]">{getCameraLabel(cameraView)}</span>
            </button>

            {/* Sound Toggle */}
            <button
              id="hud-sound-toggle"
              onClick={onToggleSound}
              className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="사운드 온/오프"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Settings Button */}
            <button
              id="hud-open-settings"
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="설정"
            >
              <Settings className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* ─── 2. UPPER AVIONICS GAUGES (Speedometer & Altimeter moved UP to prevent any button overlap) ─── */}
        <div className="flex items-center justify-between w-full px-1 sm:px-2 pointer-events-none mt-1">
          {/* Left: Speedometer Gauge */}
          <div className="flex items-center gap-2 bg-slate-950/92 px-3 py-1.5 rounded-xl border-l-4 border-l-cyan-400 border border-slate-800/80 shadow-[0_0_15px_rgba(0,0,0,0.4)] text-white backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] font-mono tracking-wider text-cyan-400 font-bold uppercase">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>SPD</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black font-mono text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                  {telemetry.speedKmh.toFixed(1)}
                </span>
                <span className="text-[9px] font-mono text-slate-400">KM/H</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-800 text-[10px] font-mono text-slate-400">
                <span className="text-cyan-400 font-bold">THR:</span>
                <span>{telemetry.throttlePct}%</span>
              </div>
            </div>
          </div>

          {/* Right: Altimeter Gauge */}
          <div className="flex items-center gap-2 bg-slate-950/92 px-3 py-1.5 rounded-xl border-r-4 border-r-emerald-400 border border-slate-800/80 shadow-[0_0_15px_rgba(0,0,0,0.4)] text-white backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 pr-2 border-r border-slate-800 text-[10px] font-mono">
                <span className={telemetry.isGrounded ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                  {telemetry.isGrounded ? 'GND' : 'AIR'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black font-mono text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                  {telemetry.altitudeM.toFixed(1)}
                </span>
                <span className="text-[9px] font-mono text-slate-400">M</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono tracking-wider text-emerald-400 font-bold uppercase">
                <span>ALT</span>
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. CRASH & RESPAWN WARNING OVERLAY ─── */}
      {telemetry.hasCrashed && (
        <div className="pointer-events-auto self-center bg-slate-950/95 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 shadow-[0_0_35px_rgba(244,63,94,0.5)] text-center max-w-sm animate-pulse text-white z-20">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-rose-400 animate-bounce" />
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-wider text-rose-400 uppercase drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">
            COLLISION DETECTED
          </h3>
          <p className="text-xs text-rose-200/80 font-mono mt-1 mb-3.5">
            기체 충돌 감지! 시작 지점으로 복귀합니다.
          </p>
          <button
            id="hud-crash-respawn-btn"
            onClick={onResetDrone}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm rounded-xl border border-white/40 shadow-lg transition-transform active:scale-95 cursor-pointer font-mono tracking-wider"
          >
            즉시 다시 비행하기 (R)
          </button>
        </div>
      )}

    </div>
  );
};

export const FlightHUD = React.memo(FlightHUDComponent);
