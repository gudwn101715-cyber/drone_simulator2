import React from 'react';
import { 
  DroneTelemetry, 
  MissionStage, 
  AssistLevel, 
  CameraView,
  SpeedGear 
} from '../types';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RotateCcw, 
  Camera, 
  Volume2, 
  VolumeX, 
  Compass, 
  Gauge, 
  ArrowUp, 
  ArrowDown,
  Coins, 
  Target, 
  HeartPulse, 
  Trophy, 
  Sparkles, 
  HelpCircle, 
  Settings, 
  LogOut,
  LogIn,
  Hand,
  Zap,
  Building2,
  Lock,
  Navigation,
  Milestone,
  Box
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
  onOpenGLTFModal: () => void;
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
  onOpenGLTFModal,
  onOpenSettings,
  onOpenHelp,
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
      case 'FPV': return '1인칭 FPV';
      case 'CHASE': return '3인칭 체이스';
      case 'TOP': return '탑뷰(위)';
      case 'FOLLOW_FAR': return '원거리 뷰';
    }
  };

  const isAiRace = stage.type === 'AI_RACING';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-3 font-sans select-none z-10">
      {/* Top Cockpit Header Bar - Comfortable & Responsive for Tablets */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Left: Mission Exit & Objective Tracker */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Back/Exit Button */}
          <button
            id="hud-exit-mission"
            onClick={onExitMission}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white font-black text-xs sm:text-sm border border-white/40 shadow-md transition-transform active:scale-95 cursor-pointer"
            title="미션 나가기"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">나가기</span>
          </button>

          {/* Stage Info & Target Pill */}
          <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white shadow-md max-w-[220px] sm:max-w-md">
            <span className="text-xs sm:text-sm font-black text-slate-800 truncate">
              {stage.title}
            </span>

            {/* Dynamic Objective Tracker */}
            <div className="text-xs sm:text-sm font-bold shrink-0">
              {stage.type === 'COIN_HUNT' && (
                <span className="text-amber-600 font-black">
                  {missionData.coinsCollected}/{missionData.totalCoins} 코인
                </span>
              )}
              {stage.type === 'RING_RACE' && (
                <span className="text-rose-600 font-black">
                  {missionData.currentRing}/{missionData.totalRings} 링
                </span>
              )}
              {stage.type === 'RESCUE' && (
                <span className="text-rose-600 font-black">
                  {missionData.patientDelivered ? '구조 완료' : missionData.patientPickedUp ? '병원 이송' : '조난자 접근'}
                </span>
              )}
              {stage.type === 'AI_RACING' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-purple-700 font-black">
                    {missionData.currentLap}/{missionData.totalLaps}랩 {telemetry.raceRank === 1 ? '(1위)' : '(2위)'}
                  </span>
                  {missionData.coinsCollected > 0 && (
                    <span className="text-amber-600 font-black bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 text-[11px] flex items-center gap-0.5">
                      🪙 {missionData.coinsCollected}
                    </span>
                  )}
                </div>
              )}
              {stage.type === 'TUTORIAL' && (
                <span className="text-emerald-700 font-black">
                  {stage.id === 'tutorial-2' 
                    ? (missionData.currentRing > 3 ? '★ 베이스 착륙!' : `${missionData.currentRing}/3 게이트`) 
                    : '훈련 중'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Stopwatch */}
        {stage.timeLimitSec > 0 && (
          <div className="pointer-events-auto bg-yellow-400 px-3 py-1 rounded-xl border border-white shadow-md flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-yellow-950 font-black">시간</span>
            <span className="text-xs sm:text-sm font-black font-mono text-slate-900">
              {formatTime(elapsedSec)}
            </span>
          </div>
        )}

        {/* Right: Flight Controls (Speed Gear Multiplier, Reset, Sound, Settings) */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-white shadow-md">
          {/* Speed Gear Multiplier (1단 / 2단 / 3단) */}
          {isAiRace ? (
            <div className="px-2.5 py-1 bg-amber-100 rounded-lg text-xs font-black text-amber-900 border border-amber-300">
              2단 SPORT 고정
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                id="hud-gear-1-btn"
                onClick={() => onChangeSpeedGear(1)}
                className={`px-2 py-1 rounded-md text-xs font-black transition-all cursor-pointer ${
                  speedGear === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
                title="1단: 순항"
              >
                1단
              </button>
              <button
                id="hud-gear-2-btn"
                onClick={() => onChangeSpeedGear(2)}
                className={`px-2 py-1 rounded-md text-xs font-black transition-all cursor-pointer ${
                  speedGear === 2 ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
                title="2단: 스포츠"
              >
                2단
              </button>
              <button
                id="hud-gear-3-btn"
                onClick={() => onChangeSpeedGear(3)}
                className={`px-2 py-1 rounded-md text-xs font-black transition-all cursor-pointer ${
                  speedGear === 3 ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
                title="3단: 터보"
              >
                3단
              </button>
            </div>
          )}

          {/* Reset Drone */}
          <button
            id="hud-reset-drone"
            onClick={onResetDrone}
            className="p-1.5 sm:px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-yellow-950 font-black text-xs border border-white shadow-xs transition-all cursor-pointer flex items-center gap-1"
            title="드론 위치 리셋"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">리셋</span>
          </button>

          {/* Camera View Switcher */}
          <button
            id="hud-camera-toggle"
            onClick={onCycleCamera}
            className="p-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-900 border border-slate-200 shadow-xs transition-all cursor-pointer"
            title="카메라 시점 전환"
          >
            <Camera className="w-4 h-4 text-blue-600" />
          </button>

          {/* 3D Graphics & GLTF Model Loader */}
          <button
            id="hud-gltf-modal-toggle"
            onClick={onOpenGLTFModal}
            className="p-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-900 border border-slate-200 shadow-xs transition-all cursor-pointer"
            title="3D 그래픽 환경 및 커스텀 GLTF 모델 관리"
          >
            <Box className="w-4 h-4 text-indigo-600" />
          </button>

          {/* Sound Toggle */}
          <button
            id="hud-sound-toggle"
            onClick={onToggleSound}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-blue-900 border border-slate-200 shadow-xs transition-all cursor-pointer"
            title="사운드"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Settings Button */}
          <button
            id="hud-open-settings"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-blue-900 border border-slate-200 shadow-xs transition-all cursor-pointer"
            title="설정"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle Alerts (Crash or Warning notification overlay) */}
      {telemetry.hasCrashed && (
        <div className="pointer-events-auto self-center bg-rose-600 border-4 border-white rounded-[28px] p-4 sm:p-5 shadow-2xl text-center max-w-sm animate-pulse text-white">
          <h3 className="text-xl sm:text-2xl font-black mb-1 drop-shadow-md">⚠️ 충돌 감지!</h3>
          <p className="text-xs text-rose-100 font-bold mb-3">
            안전을 위해 드론을 다시 시작 지점으로 복귀합니다.
          </p>
          <button
            id="hud-crash-respawn-btn"
            onClick={onResetDrone}
            className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-xs sm:text-sm rounded-xl border-2 border-white shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            즉시 다시 비행하기 (R)
          </button>
        </div>
      )}

      {/* Center Instrument Avionics Strip (Ultra Clear & Readable) */}
      <div className="self-center flex items-center gap-5 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/40 shadow-lg pointer-events-none mb-1 text-white">
        {/* Speedometer */}
        <div className="flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-yellow-300" />
          <span className="text-sm font-black font-mono">{telemetry.speedKmh} <span className="text-[10px] text-slate-300 font-normal">km/h</span></span>
        </div>

        {/* Altimeter */}
        <div className="flex items-center gap-1.5">
          <ArrowUp className="w-4 h-4 text-emerald-300" />
          <span className="text-sm font-black font-mono text-emerald-300">{telemetry.altitudeM} <span className="text-[10px] text-slate-300 font-normal">m</span></span>
        </div>
      </div>
    </div>
  );
};

export const FlightHUD = React.memo(FlightHUDComponent);
