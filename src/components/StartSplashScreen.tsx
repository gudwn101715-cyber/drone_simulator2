import React from 'react';
import { UserPilotProfile } from '../types';
import { calculateTotalStars, getPilotRank } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { requestFullscreen } from '../utils/fullscreen';
import { 
  Play, 
  ChevronRight,
  Star
} from 'lucide-react';

interface StartSplashScreenProps {
  profile: UserPilotProfile;
  onStart: () => void;
}

export const StartSplashScreen: React.FC<StartSplashScreenProps> = ({
  profile,
  onStart
}) => {
  const totalStars = calculateTotalStars(profile);
  const rank = getPilotRank(totalStars);

  const handleStartGame = () => {
    // Request full screen immersive mode on user tap (hides clock, battery & navigation bar)
    requestFullscreen().catch(() => {});
    soundManager.playCoin();
    soundManager.speakGuide('프로브 드론 시뮬레이터에 오신 것을 환영해! 비행을 시작하자!');
    onStart();
  };

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center font-sans select-none overflow-hidden bg-gradient-to-br from-[#1d4ed8] via-[#0284c7] to-[#0f172a]">
      {/* Dynamic Background Atmosphere Matching the Official PROBE Visual Artwork */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Diagonal Soft Ambient Light Rays */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.3)_0%,rgba(37,99,235,0.15)_45%,rgba(15,23,42,0.85)_100%)]" />
        
        {/* High-Tech Fine Diagonal Scanlines / Texture */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_40px,rgba(255,255,255,0.03)_40px,rgba(255,255,255,0.03)_41px)]" />

        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      {/* Top Profile Summary Badge */}
      <div className="absolute top-4 sm:top-6 inset-x-0 z-20 px-4 sm:px-8 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/40 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-lg">
          <span className="text-cyan-300 font-mono">🛸</span>
          <span>{profile.pilotName}</span>
          <span className="text-white/40">|</span>
          <div className="flex items-center gap-1 text-amber-300 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{totalStars}</span>
          </div>
        </div>
      </div>

      {/* Center Showcase: Official PROBE Emblem + Title + Start Button */}
      <div className="relative z-10 max-w-lg w-full mx-auto px-4 text-center flex flex-col items-center justify-center animate-fadeIn">
        {/* Official PROBE Transparent Logo - Optically centered */}
        <div className="w-full max-w-[320px] sm:max-w-[380px] mb-6 flex items-center justify-center transform hover:scale-[1.02] transition-transform duration-300">
          <img
            src="/probe-brand-logo.png"
            alt="PROBE 프로브"
            className="w-full h-auto object-contain mx-auto block filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
            draggable={false}
          />
        </div>

        {/* Simulator App Subtitle Badge */}
        <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/25 shadow-md mb-6 sm:mb-8">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs sm:text-sm font-black text-white tracking-wider">
            드론 시뮬레이터 (SIMULATOR)
          </span>
        </div>

        {/* Large Prominent START Button - Perfectly centered layout */}
        <button
          id="btn-start-simulation-game"
          onClick={handleStartGame}
          className="group relative inline-flex items-center justify-center px-10 sm:px-14 py-4 sm:py-4.5 rounded-2xl font-black text-lg sm:text-xl text-white bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 border-2 border-white/90 shadow-[0_0_35px_rgba(56,189,248,0.6)] hover:shadow-[0_0_50px_rgba(56,189,248,0.9)] transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="inline-flex items-center justify-center gap-2.5">
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-white transition-transform group-hover:scale-110" />
            <span className="tracking-wide">시작하기</span>
            <ChevronRight className="w-5 h-5 text-cyan-200 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>

        {/* Short Guide Subtitle */}
        <p className="mt-5 text-sm text-sky-100/90 font-bold tracking-wide text-center">
          3D 프로브 드론 비행
        </p>
      </div>

      {/* Bottom Footer Info */}
      <div className="absolute bottom-3 inset-x-0 text-center text-[11px] text-white/40 font-mono pointer-events-none">
        PROBE DRONE SIMULATOR • ALL RIGHTS RESERVED
      </div>
    </div>
  );
};
