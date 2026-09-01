import React from 'react';
import { 
  MissionStage, 
  UserPilotProfile, 
  DroneSkin 
} from '../types';
import { 
  MISSION_STAGES, 
  calculateTotalStars, 
  getPilotRank 
} from '../utils/storage';
import { 
  Play, 
  Star, 
  Coins, 
  Trophy, 
  HeartPulse, 
  Target, 
  Sparkles, 
  Plane, 
  Award, 
  Palette, 
  Settings as SettingsIcon, 
  HelpCircle,
  Tablet,
  CheckCircle2
} from 'lucide-react';

interface MissionSelectorProps {
  profile: UserPilotProfile;
  activeSkin: DroneSkin;
  onSelectStage: (stage: MissionStage) => void;
  onOpenLicense: () => void;
  onOpenSkins: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const MissionSelector: React.FC<MissionSelectorProps> = ({
  profile,
  activeSkin,
  onSelectStage,
  onOpenLicense,
  onOpenSkins,
  onOpenSettings,
  onOpenHelp
}) => {
  const totalStars = calculateTotalStars(profile);
  const rank = getPilotRank(totalStars);

  const getStageIcon = (type: string) => {
    switch (type) {
      case 'TUTORIAL': return <Sparkles className="w-5 h-5 text-emerald-500" />;
      case 'COIN_HUNT': return <Coins className="w-5 h-5 text-amber-500" />;
      case 'RING_RACE': return <Target className="w-5 h-5 text-sky-500" />;
      case 'RESCUE': return <HeartPulse className="w-5 h-5 text-rose-500" />;
      case 'AI_RACING': return <Trophy className="w-5 h-5 text-purple-500" />;
      default: return <Plane className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="w-full h-full min-h-screen relative flex flex-col font-sans select-none bg-sky-400 overflow-y-auto">
      {/* Vibrant Sky Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-blue-400 via-sky-300 to-green-500">
        <div className="absolute bottom-0 w-full h-[280px] bg-green-600 rounded-t-[140px] opacity-40 blur-2xl" />
        <div className="absolute top-8 left-1/4 w-32 h-32 bg-white rounded-full opacity-60 blur-xl animate-pulseGlow" />
        <div className="absolute top-1/3 right-1/4 w-52 h-24 bg-white rounded-full opacity-50 blur-lg" />
      </div>

      {/* Top Header Bar - Optimized for Tablet Landscape */}
      <header className="relative z-10 w-full bg-white/30 backdrop-blur-md border-b-2 border-white/50 shadow-sm shrink-0">
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-yellow-400 rounded-xl flex items-center justify-center border-2 border-white shadow-md">
              <span className="text-xl sm:text-2xl">🛸</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-sm leading-none">
                PROBE DRONE ACADEMY
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-950 font-black drop-shadow-sm">
                태블릿 & 모바일 가로모드 3D 비행 시뮬레이터
              </p>
            </div>
          </div>

          {/* User Pilot Summary Card & Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Star Counter */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 border border-white text-amber-900 text-xs sm:text-sm font-black shadow-sm">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-500" />
              <span>★ {totalStars} / 18</span>
            </div>

            {/* Pilot License Button */}
            <button
              id="btn-open-license"
              onClick={onOpenLicense}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black border border-white shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Award className="w-4 h-4 text-yellow-300" />
              <span className="hidden sm:inline">{profile.pilotName}</span>
              <span>({rank.title})</span>
            </button>

            {/* Drone Hangar Button */}
            <button
              id="btn-open-skins"
              onClick={onOpenSkins}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-blue-900 text-xs sm:text-sm font-black border border-white shadow-sm transition-all cursor-pointer"
            >
              <Palette className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">격납고</span>
            </button>

            {/* Help Button */}
            <button
              id="btn-open-help-main"
              onClick={onOpenHelp}
              className="p-1.5 sm:p-2 rounded-full bg-white/80 hover:bg-white text-blue-900 border border-white shadow-sm transition-all cursor-pointer"
              title="조작 가이드"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Settings Button */}
            <button
              id="btn-open-settings-main"
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 rounded-full bg-white/80 hover:bg-white text-blue-900 border border-white shadow-sm transition-all cursor-pointer"
              title="설정"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Mission Selection Grid (Landscape Friendly) */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1">
        {/* Stages Grid (2 Columns on mobile landscape / 3 Columns on Tablet Landscape) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pb-8">
          {MISSION_STAGES.map((stage) => {
            const progress = profile.missionProgress[stage.id] || {
              unlocked: true,
              completed: false,
              bestTimeSec: null,
              stars: 0
            };

            const isCompleted = progress.completed;
            const stars = progress.stars || 0;

            return (
              <div
                key={stage.id}
                id={`stage-card-${stage.id}`}
                className="group relative bg-white/95 backdrop-blur-md rounded-2xl border-2 border-white shadow-lg p-3.5 sm:p-4 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-xl"
              >
                <div>
                  {/* Top Row: Icon + Badge + Stars */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-sm">
                        {getStageIcon(stage.type)}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                        {stage.difficulty}
                      </span>
                    </div>

                    {/* Star Rating Display */}
                    <div className="flex items-center gap-0.5 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-3.5 h-3.5 ${
                            starIdx <= stars
                              ? 'fill-yellow-400 text-yellow-500'
                              : 'fill-slate-200 text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stage Title & Short Description */}
                  <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1 truncate">
                    {stage.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {stage.description}
                  </p>
                </div>

                {/* Bottom Row: Best Record & Launch Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 font-bold">
                    {progress.bestTimeSec !== null ? (
                      <span className="text-blue-600 flex items-center gap-1 font-mono font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        최고 {progress.bestTimeSec.toFixed(1)}초
                      </span>
                    ) : (
                      <span className="text-slate-400">도전 기록 없음</span>
                    )}
                  </div>

                  {/* Launch Button */}
                  <button
                    id={`btn-launch-${stage.id}`}
                    onClick={() => onSelectStage(stage)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-blue-500/30 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>출격하기</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
