import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CountdownOverlayProps {
  count: number | null;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count }) => {
  if (count === null) return null;

  return (
    <div
      id="race-countdown-overlay"
      className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-slate-950/20 backdrop-blur-[1px]"
    >
      {/* 3-Signal Cluster (3 -> 2 -> 1) */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 bg-slate-900/80 px-4 py-2 rounded-full border border-white/20 shadow-xl backdrop-blur-xs">
        {[3, 2, 1].map((stepNumber, idx) => {
          let isLit = false;
          if (count === 3 && idx === 0) isLit = true;
          if (count === 2 && idx <= 1) isLit = true;
          if (count === 1) isLit = true;

          return (
            <div
              key={stepNumber}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border transition-all duration-150 ${
                isLit
                  ? 'bg-rose-500 border-rose-300 shadow-[0_0_16px_#f43f5e]'
                  : 'bg-slate-800 border-slate-700 opacity-40'
              }`}
            />
          );
        })}
      </div>

      {/* Animated Number (3, 2, 1) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={String(count)}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative flex items-center justify-center"
        >
          {/* Outer subtle glow ring */}
          <div className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-amber-400/40 animate-ping" />
          
          {/* Number disc */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-950/90 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.5)]">
            <span className="font-black text-5xl sm:text-7xl text-amber-400 font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {count}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
