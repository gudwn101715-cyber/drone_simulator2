import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, RotateCw } from 'lucide-react';

interface VirtualJoystickProps {
  id: string;
  type: 'LEFT_STICK' | 'RIGHT_STICK';
  title: string;
  subLabel: string;
  valueX: number; // -1 to 1
  valueY: number; // -1 to 1
  onChange: (x: number, y: number) => void;
  autoCenterY?: boolean;
}

const VirtualJoystickComponent: React.FC<VirtualJoystickProps> = ({
  id,
  type,
  title,
  subLabel,
  valueX,
  valueY,
  onChange,
  autoCenterY = true
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });

  // Dynamic radius based on element size
  const getRadius = () => {
    if (!baseRef.current) return 56;
    return Math.min(baseRef.current.clientWidth / 2 - 14, 64);
  };

  const handlePointer = useCallback((clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentRadius = getRadius();

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;

    const distance = Math.hypot(deltaX, deltaY);
    if (distance > currentRadius) {
      deltaX = (deltaX / distance) * currentRadius;
      deltaY = (deltaY / distance) * currentRadius;
    }

    setStickPos({ x: deltaX, y: deltaY });

    // Normalize to -1 .. +1 (up is -Y in screen coords)
    const normX = deltaX / currentRadius;
    const normY = -deltaY / currentRadius;

    onChange(normX, normY);
  }, [onChange]);

  const handleStart = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    handlePointer(e.clientX, e.clientY);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handlePointer(e.clientX, e.clientY);
  };

  const handleEnd = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
    const currentRadius = getRadius();

    if (autoCenterY) {
      setStickPos({ x: 0, y: 0 });
      onChange(0, 0);
    } else {
      setStickPos(prev => ({ x: 0, y: prev.y }));
      onChange(0, -stickPos.y / currentRadius);
    }
  };

  // Sync with keyboard/external inputs
  useEffect(() => {
    if (!isDragging) {
      const currentRadius = getRadius();
      setStickPos({
        x: valueX * currentRadius,
        y: -valueY * currentRadius
      });
    }
  }, [valueX, valueY, isDragging]);

  const isLeft = type === 'LEFT_STICK';

  return (
    <div id={id} className="flex flex-col items-center select-none touch-none pointer-events-auto">
      {/* Joystick Base Circle - Scaled for tablet & mobile landscape */}
      <div
        ref={baseRef}
        onPointerDown={handleStart}
        onPointerMove={handleMove}
        onPointerUp={handleEnd}
        onPointerCancel={handleEnd}
        className={`relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-full border-4 border-white/70 bg-white/30 backdrop-blur-lg shadow-2xl flex items-center justify-center cursor-pointer transition-all ${
          isDragging 
            ? 'border-white bg-white/45 ring-4 ring-white/50 scale-102' 
            : 'hover:border-white hover:bg-white/40 active:scale-98'
        }`}
      >
        {/* Subtle crosshair & inner guide circles */}
        <div className="absolute inset-x-0 top-1/2 h-[2px] bg-white/40 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/40 pointer-events-none" />
        <div className="absolute w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-white/40 pointer-events-none" />

        {/* Direction Guides / Korean labels */}
        {isLeft ? (
          <>
            <div className="absolute top-1.5 sm:top-2 flex flex-col items-center pointer-events-none drop-shadow">
              <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 stroke-[3]" />
              <span className="text-[8px] sm:text-[9px] font-black text-white">상승</span>
            </div>
            <div className="absolute bottom-1.5 sm:bottom-2 flex flex-col items-center pointer-events-none drop-shadow">
              <span className="text-[8px] sm:text-[9px] font-black text-white">하강</span>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300 stroke-[3]" />
            </div>
            <div className="absolute left-1.5 sm:left-2 flex items-center gap-0.5 pointer-events-none drop-shadow">
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300 stroke-[3]" />
              <span className="text-[8px] sm:text-[9px] font-black text-white">좌회전</span>
            </div>
            <div className="absolute right-1.5 sm:right-2 flex items-center gap-0.5 pointer-events-none drop-shadow">
              <span className="text-[8px] sm:text-[9px] font-black text-white">우회전</span>
              <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300 stroke-[3]" />
            </div>
          </>
        ) : (
          <>
            <div className="absolute top-1.5 sm:top-2 flex flex-col items-center pointer-events-none drop-shadow">
              <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 stroke-[3]" />
              <span className="text-[8px] sm:text-[9px] font-black text-white">전진</span>
            </div>
            <div className="absolute bottom-1.5 sm:bottom-2 flex flex-col items-center pointer-events-none drop-shadow">
              <span className="text-[8px] sm:text-[9px] font-black text-white">후진</span>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 stroke-[3]" />
            </div>
            <div className="absolute left-1.5 sm:left-2 flex items-center gap-0.5 pointer-events-none drop-shadow">
              <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300 stroke-[3]" />
              <span className="text-[8px] sm:text-[9px] font-black text-white">좌이동</span>
            </div>
            <div className="absolute right-1.5 sm:right-2 flex items-center gap-0.5 pointer-events-none drop-shadow">
              <span className="text-[8px] sm:text-[9px] font-black text-white">우이동</span>
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300 stroke-[3]" />
            </div>
          </>
        )}

        {/* Draggable Thumb Stick Knob */}
        <div
          className={`absolute w-12 h-12 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center transition-transform pointer-events-none border-4 border-white ${
            isLeft
              ? isDragging
                ? 'bg-blue-600 shadow-blue-500/70 scale-105'
                : 'bg-blue-500 shadow-lg'
              : isDragging
                ? 'bg-orange-500 shadow-orange-500/70 scale-105'
                : 'bg-orange-400 shadow-lg'
          }`}
          style={{
            transform: `translate(${stickPos.x}px, ${stickPos.y}px)`
          }}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-md flex items-center justify-center">
            <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${isLeft ? 'bg-blue-600' : 'bg-orange-500'}`} />
          </div>
        </div>
      </div>

      {/* Mode 2 Label Pill Below */}
      <div className="mt-1.5 bg-white/90 backdrop-blur-md px-2.5 sm:px-3 py-0.5 rounded-full border border-white shadow-sm flex items-center gap-1">
        <span className="text-[9px] sm:text-[10px] font-black text-blue-950 uppercase">{title}</span>
      </div>
    </div>
  );
};

export const VirtualJoystick = React.memo(VirtualJoystickComponent);
