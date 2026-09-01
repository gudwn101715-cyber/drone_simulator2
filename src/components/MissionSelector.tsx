import React, { useState } from 'react';
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
import { soundManager } from '../utils/audio';
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
  CheckCircle2,
  ChevronRight,
  Home,
  Compass,
  Check
} from 'lucide-react';

interface MissionSelectorProps {
  profile: UserPilotProfile;
  activeSkin: DroneSkin;
  onSelectStage: (stage: MissionStage) => void;
  onOpenLicense: () => void;
  onOpenSkins: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onReturnHome: () => void;
}

export const MissionSelector: React.FC<MissionSelectorProps> = ({
  profile,
  activeSkin,
  onSelectStage,
  onOpenLicense,
  onOpenSkins,
  onOpenSettings,
  onOpenHelp,
  onReturnHome
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>(() => {
    // Default to the first uncompleted mission, or first stage
    const uncompleted = MISSION_STAGES.find(s => {
      const p = profile.missionProgress[s.id];
      return s.type !== 'FREE_FLIGHT' && (!p || !p.completed);
    });
    return uncompleted ? uncompleted.id : MISSION_STAGES[0].id;
  });

  const totalStars = calculateTotalStars(profile);
  const rank = getPilotRank(totalStars);
  const maxPossibleStars = MISSION_STAGES.filter(s => s.type !== 'FREE_FLIGHT').length * 3;

  const getStageIcon = (type: string, isCompleted: boolean) => {
    switch (type) {
      case 'TUTORIAL': 
        return <Sparkles className={`w-5 h-5 ${isCompleted ? 'text-emerald-300' : 'text-emerald-400'}`} />;
      case 'COIN_HUNT': 
        return <Coins className={`w-5 h-5 ${isCompleted ? 'text-amber-300' : 'text-amber-400'}`} />;
      case 'RING_RACE': 
        return <Target className={`w-5 h-5 ${isCompleted ? 'text-sky-300' : 'text-sky-400'}`} />;
      case 'RESCUE': 
        return <HeartPulse className={`w-5 h-5 ${isCompleted ? 'text-rose-300' : 'text-rose-400'}`} />;
      case 'AI_RACING': 
        return <Trophy className={`w-5 h-5 ${isCompleted ? 'text-purple-300' : 'text-purple-400'}`} />;
      default: 
        return <Plane className="w-5 h-5 text-blue-400" />;
    }
  };

  const activeStage = MISSION_STAGES.find(s => s.id === selectedStageId) || MISSION_STAGES[0];
  const activeProgress = profile.missionProgress[activeStage.id] || {
    unlocked: true,
    completed: false,
    bestTimeSec: null,
    stars: 0
  };

  const handleStageCardClick = (stage: MissionStage) => {
    setSelectedStageId(stage.id);
    soundManager.playCoin();
  };

  return (
    <div className="w-full h-full min-h-screen relative flex flex-col font-sans select-none bg-slate-950 overflow-y-auto">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-slate-950 via-sky-950 to-slate-900">
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-cyan-900/20 via-sky-800/10 to-transparent pointer-events-none" />
        <div className="absolute -top-40 left-1/3 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 w-full bg-slate-900/85 backdrop-blur-xl border-b border-white/10 shadow-lg shrink-0">
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Brand & Home Return */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-return-home"
              onClick={onReturnHome}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-all active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
              title="시작 화면으로 이동"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold">홈으로</span>
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src="/probe-brand-logo.png"
                alt="PROBE"
                className="h-6 sm:h-7 w-auto object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                draggable={false}
              />
              <div>
                <h1 className="text-xs sm:text-sm font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold">
                    ROADMAP
                  </span>
                </h1>
                <p className="text-[10px] sm:text-xs text-sky-300/70 font-medium">
                  {profile.pilotName} • 비행 로드맵
                </p>
              </div>
            </div>
          </div>

          {/* Right Controls: Stars + Pilot Rank + Hangar/Skins + Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Total Star Counter */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>★ {totalStars} / {maxPossibleStars}</span>
            </div>

            {/* Pilot Status Badge */}
            <button
              id="btn-open-license"
              onClick={onOpenLicense}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold border border-cyan-400/40 shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-yellow-300" />
              <span>주니어 조종사</span>
            </button>

            {/* Drone Hangar / Skin Preview Button */}
            <button
              id="btn-open-skins"
              onClick={onOpenSkins}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-200 text-xs font-bold border border-slate-700 shadow-sm transition-all cursor-pointer"
              title="드론 스킨 및 외형"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">드론 스킨</span>
            </button>

            {/* Help Manual */}
            <button
              id="btn-open-help-main"
              onClick={onOpenHelp}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="조종 매뉴얼"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              id="btn-open-settings-main"
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="설정"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Interactive Stage Container: Pure Visual Roadmap View */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col justify-start">
        <div className="w-full flex flex-col lg:flex-row gap-5 items-stretch flex-1 pb-6">
          {/* Left/Main Column: Visual Flight Roadmap Track */}
          <div className="flex-1 bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-white/10 p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Roadmap Header & Progress Summary */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Compass className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-2">
                    <span>비행 모험 탐험 로드맵</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      ALL UNLOCKED
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    원하는 단계를 자유롭게 터치하여 비행 목표를 확인하고 출격하세요!
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-emerald-400 font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  {MISSION_STAGES.filter(s => profile.missionProgress[s.id]?.completed).length} / {MISSION_STAGES.length} 완료
                </span>
              </div>
            </div>

            {/* Connected Milestone Nodes along Flight Trail */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-auto py-2">
              {MISSION_STAGES.map((stage, idx) => {
                const progress = profile.missionProgress[stage.id] || {
                  unlocked: true,
                  completed: false,
                  bestTimeSec: null,
                  stars: 0
                };
                const isSelected = selectedStageId === stage.id;
                const isCompleted = progress.completed;
                const stars = progress.stars || 0;

                // Stage Step Label (1, 2, 3, 4, 5, 6-L1, 6-L2, Free)
                const stepLabel = stage.type === 'FREE_FLIGHT' 
                  ? 'Free' 
                  : stage.id === 'ai-racing-1' 
                  ? '6-L1' 
                  : stage.id === 'ai-racing-2' 
                  ? '6-L2' 
                  : `${idx + 1}`;

                return (
                  <div
                    key={stage.id}
                    id={`roadmap-node-${stage.id}`}
                    onClick={() => handleStageCardClick(stage)}
                    className={`group relative rounded-2xl p-3.5 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-900/70 to-blue-900/80 border-2 border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.55)] scale-[1.03] ring-2 ring-cyan-400/30'
                        : isCompleted
                        /* Bold, Rich Completed Mission Styling */
                        ? 'bg-gradient-to-b from-emerald-950/90 via-slate-900 to-emerald-950/80 border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:border-emerald-300 hover:scale-[1.01]'
                        : 'bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/80 hover:border-slate-500'
                    }`}
                  >
                    {/* Active Selected Pulse */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-cyan-400 rounded-full animate-ping" />
                    )}

                    {/* Top Row: Stage Step Badge + Clear Stamp */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black font-mono border ${
                        isSelected
                          ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                          : isCompleted
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm font-black'
                          : 'bg-slate-700 text-slate-300 border-slate-600'
                      }`}>
                        STAGE {stepLabel}
                      </span>

                      {/* Prominent CLEAR Badge for Completed Stages */}
                      {isCompleted ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400 text-emerald-300 text-[10px] font-black shadow-sm">
                          <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />
                          <span>완료</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-mono">출격대기</span>
                      )}
                    </div>

                    {/* Center Icon & Stage Title */}
                    <div className="my-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-inner shrink-0 ${
                          isSelected
                            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                            : isCompleted
                            ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                            : 'bg-slate-700/50 border-slate-600 text-slate-400'
                        }`}>
                          {getStageIcon(stage.type, isCompleted)}
                        </div>
                        <span className={`text-xs font-black truncate ${
                          isSelected 
                            ? 'text-white' 
                            : isCompleted
                            ? 'text-emerald-100 font-black'
                            : 'text-slate-200 group-hover:text-white'
                        }`}>
                          {stage.title.split(':')[1]?.trim() || stage.title}
                        </span>
                      </div>
                      <p className={`text-[10px] line-clamp-1 font-medium ${
                        isCompleted ? 'text-emerald-200/70' : 'text-slate-400'
                      }`}>
                        {stage.subtitle}
                      </p>
                    </div>

                    {/* Bottom Row: Stars & Best Time */}
                    <div className={`mt-2 pt-2 border-t flex items-center justify-between ${
                      isCompleted ? 'border-emerald-500/30' : 'border-slate-700/50'
                    }`}>
                      {stage.type !== 'FREE_FLIGHT' ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((starIdx) => (
                            <Star
                              key={starIdx}
                              className={`w-3.5 h-3.5 ${
                                starIdx <= stars
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]'
                                  : isCompleted
                                  ? 'fill-emerald-900 text-emerald-700'
                                  : 'fill-slate-800 text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-sky-400 font-bold">자유 탐험</span>
                      )}

                      <span className={`text-[10px] font-mono font-black ${
                        isCompleted ? 'text-emerald-300' : 'text-slate-400'
                      }`}>
                        {progress.bestTimeSec !== null ? `${progress.bestTimeSec.toFixed(1)}s` : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Roadmap Quick Tip */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-sky-300/80 text-[11px] font-medium">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                팁: 단계를 선택한 후 우측 출격하기 버튼을 누르면 즉시 3D 비행이 시작됩니다.
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                PROBE Flight System
              </span>
            </div>
          </div>

          {/* Right Column: Mission Briefing & Launch HUD Panel */}
          <div className="w-full lg:w-[360px] bg-gradient-to-b from-slate-900/95 to-slate-950/98 backdrop-blur-2xl rounded-3xl border border-cyan-500/30 p-5 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Briefing Top Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  FLIGHT BRIEFING
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  난이도: {activeStage.difficulty}
                </span>
              </div>

              {/* Stage Title */}
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mb-1">
                {activeStage.title}
              </h3>
              <p className="text-xs text-cyan-200/90 font-bold mb-3">
                {activeStage.subtitle}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed mb-4 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                {activeStage.description}
              </p>

              {/* Mission Objectives Checklist */}
              <div className="mb-4">
                <h4 className="text-xs font-black text-slate-200 mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  <span>미션 수행 목표</span>
                </h4>
                <div className="space-y-1.5">
                  {activeStage.objectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relaxed Star Evaluation Thresholds */}
              {activeStage.type !== 'FREE_FLIGHT' && (
                <div className="mb-4 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div className="text-[11px] font-black text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>별점 기준 시간</span>
                    </span>
                    <span className="text-[10px] text-slate-400">제한시간 {activeStage.timeLimitSec}초</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-mono font-bold">
                    <div className="p-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-black">
                      ★★★ {activeStage.starThresholds[0]}초 이내
                    </div>
                    <div className="p-1 rounded bg-slate-700/40 text-slate-300 border border-slate-600">
                      ★★ {activeStage.starThresholds[1]}초 이내
                    </div>
                    <div className="p-1 rounded bg-slate-700/40 text-slate-400 border border-slate-600">
                      ★ {activeStage.starThresholds[2]}초 이내
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Launch Button & Record */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-slate-400 font-bold">내 최고 기록</span>
                <span className="font-mono font-black text-cyan-300">
                  {activeProgress.bestTimeSec !== null 
                    ? `${activeProgress.bestTimeSec.toFixed(1)} 초 (${activeProgress.stars}성)` 
                    : '도전 기록 없음'}
                </span>
              </div>

              <button
                id={`btn-launch-roadmap-${activeStage.id}`}
                onClick={() => onSelectStage(activeStage)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current text-white" />
                <span>출격하기 (START MISSION)</span>
                <ChevronRight className="w-4 h-4 text-cyan-200" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
