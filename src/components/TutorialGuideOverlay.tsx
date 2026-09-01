import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { DroneTelemetry } from '../types';

interface TutorialGuideOverlayProps {
  step: number; // 1: Takeoff, 2: Hover 3s, 3: Forward/Turn, 4: Land
  telemetry: DroneTelemetry;
  onStepComplete: (step: number) => void;
}

export const TutorialGuideOverlay: React.FC<TutorialGuideOverlayProps> = ({
  step,
  telemetry,
  onStepComplete
}) => {
  const [hoverTimer, setHoverTimer] = useState<number>(3.0);
  const [isHoveringValid, setIsHoveringValid] = useState<boolean>(false);
  const [moveTimer, setMoveTimer] = useState<number>(2.5);

  const completedStepRef = useRef<number>(0);
  const telemetryRef = useRef<DroneTelemetry>(telemetry);
  telemetryRef.current = telemetry;

  const onStepCompleteRef = useRef(onStepComplete);
  onStepCompleteRef.current = onStepComplete;

  const triggerComplete = (completedStep: number) => {
    if (completedStepRef.current >= completedStep) return;
    completedStepRef.current = completedStep;
    onStepCompleteRef.current(completedStep);
  };

  // Main active step evaluation loop (100ms ticker)
  useEffect(() => {
    completedStepRef.current = Math.max(0, step - 1);
    let hoverAcc = 0;
    let moveAcc = 0;
    let landAcc = 0;

    setHoverTimer(3.0);
    setMoveTimer(2.5);
    setIsHoveringValid(false);

    const interval = setInterval(() => {
      const t = telemetryRef.current;
      if (!t) return;

      // STEP 1: Takeoff (altitude >= 1.5m)
      if (step === 1) {
        if (t.altitudeM >= 1.5) {
          triggerComplete(1);
        }
      }

      // STEP 2: Hovering (altitude 1.2m ~ 6.0m, speed < 4.5 km/h)
      else if (step === 2) {
        const inHover = t.altitudeM >= 1.2 && t.altitudeM <= 6.0 && t.speedKmh < 4.5;
        setIsHoveringValid(inHover);

        if (inHover) {
          hoverAcc += 0.1;
          const remaining = Math.max(0, Math.round((3.0 - hoverAcc) * 10) / 10);
          setHoverTimer(remaining);
          if (hoverAcc >= 2.95) {
            triggerComplete(2);
          }
        } else {
          // Slowly decay if lost stability rather than instant reset
          hoverAcc = Math.max(0, hoverAcc - 0.05);
          const remaining = Math.max(0, Math.round((3.0 - hoverAcc) * 10) / 10);
          setHoverTimer(remaining);
        }
      }

      // STEP 3: Movement & Rotation Test (speed > 1.0 km/h or pitch/roll/yaw input)
      else if (step === 3) {
        const isMoving = t.altitudeM >= 0.8 && (
          t.speedKmh > 0.9 || 
          Math.abs(t.pitchDeg) > 1.5 || 
          Math.abs(t.rollDeg) > 1.5 || 
          Math.abs(t.yawDeg) > 1.5
        );

        if (isMoving) {
          moveAcc += 0.1;
          const remaining = Math.max(0, Math.round((2.5 - moveAcc) * 10) / 10);
          setMoveTimer(remaining);
          if (moveAcc >= 2.45) {
            triggerComplete(3);
          }
        }
      }

      // STEP 4: Landing (Grounded or altitude <= 0.35m with low speed)
      else if (step === 4) {
        const isLanded = (t.isGrounded || t.altitudeM <= 0.35) && t.speedKmh < 4.0;
        if (isLanded) {
          landAcc += 0.1;
          if (landAcc >= 0.3) {
            triggerComplete(4);
          }
        } else {
          landAcc = 0;
        }
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [step]);

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-full max-w-sm px-2">
      <div className="bg-slate-900/90 border border-blue-400/80 rounded-xl px-3 py-1.5 shadow-lg backdrop-blur-xs flex items-center justify-between gap-2 text-white">
        <div className="flex-1">
          {step === 1 && (
            <div className="text-[11px] font-black text-blue-300">
              1단계: 왼쪽 스틱을 위로 올려 이륙하세요! ({telemetry.altitudeM.toFixed(1)}m)
            </div>
          )}

          {step === 2 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-amber-300">2단계: 호버링 유지</span>
              <div className="w-16 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full ${isHoveringValid ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  style={{ width: `${((3 - hoverTimer) / 3) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-300">{hoverTimer.toFixed(1)}s</span>
            </div>
          )}

          {step === 3 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-emerald-300">3단계: 전진/후진</span>
              <div className="w-16 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-blue-400"
                  style={{ width: `${((2.5 - moveTimer) / 2.5) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-300">{moveTimer.toFixed(1)}s</span>
            </div>
          )}

          {step === 4 && (
            <div className="text-[11px] font-black text-yellow-300">
              4단계: 왼쪽 스틱을 내려 노란 베이스에 착륙하세요!
            </div>
          )}
        </div>

        <button
          onClick={() => onStepComplete(step)}
          className="text-[10px] font-black text-white bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded border border-white/40 cursor-pointer shrink-0"
        >
          {step < 4 ? '다음' : '완료'}
        </button>
      </div>
    </div>
  );
};
