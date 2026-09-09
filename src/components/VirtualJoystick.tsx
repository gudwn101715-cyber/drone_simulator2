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
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const centerPosRef = useRef({ x: 0, y: 0, radius: 60 });

  // Dynamic radius based on element size
  const updateMetrics = () => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const radius = Math.min(rect.width / 2 - 16, 72);
    centerPosRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius
    };
  };

  const updateKnobTransform = (dx: number, dy: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
  };

  const handlePointer = useCallback((clientX: number, clientY: number) => {
    const { x: centerX, y: centerY, radius: currentRadius } = centerPosRef.current;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;

    const distance = Math.hypot(deltaX, deltaY);
    if (distance > currentRadius) {
      deltaX = (deltaX / distance) * currentRadius;
      deltaY = (deltaY / distance) * currentRadius;
    }

    updateKnobTransform(deltaX, deltaY);

    // Normalize to -1 .. +1 (up is -Y in screen coords)
    const normX = deltaX / currentRadius;
    const normY = -deltaY / currentRadius;

    onChange(normX, normY);
  }, [onChange]);

  const handleStart = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    updateMetrics();
    handlePointer(e.clientX, e.clientY);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    handlePointer(e.clientX, e.clientY);
  };

  const handleEnd = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isDraggingRef.current = false;

    updateKnobTransform(0, 0);
    onChange(0, 0);
  };

  // Sync with keyboard/external inputs when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      updateMetrics();
      const currentRadius = centerPosRef.current.radius;
      updateKnobTransform(valueX * currentRadius, -valueY * currentRadius);
    }
  }, [valueX, valueY]);

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
        className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full border-4 border-white/80 bg-slate-900/80 shadow-2xl flex items-center justify-center cursor-pointer active:ring-4 active:ring-white/60 active:border-white"
      >
        {/* Subtle crosshair & inner guide circles */}
        <div className="absolute inset-x-0 top-1/2 h-[2px] bg-white/40 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/40 pointer-events-none" />
        <div className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-white/45 pointer-events-none" />

        {/* Direction Guides / Korean labels */}
        {isLeft ? (
          <>
            <div className="absolute top-2 sm:top-2.5 flex flex-col items-center pointer-events-none drop-shadow">
              <ChevronUp className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-300 stroke-[3]" />
              <span className="text-[9px] sm:text-[10px] font-black text-white">상승</span>
            </div>
            <div className="absolute bottom-2 sm:bottom-2.5 flex flex-col items-center pointer-events-none drop-shadow">
              <span className="text-[9px] sm:text-[10px] font-black text-white">하강</span>
              <ChevronDown className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-300 stroke-[3]" />
            </div>
            <div className="absolute left-2 sm:left-2.5 flex items-center gap-0.5 pointer-events-none drop-shadow">
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 stroke-[3]" />
              <span className="text-[9px] sm:text-[10px] font-black text-white">좌회전</span>
            </div>
            <div className="absolute right-2 sm:right-2.5 flex items-center gap-0.5 pointer-events-none drop-shadow">
              <span className="text-[9px] sm:text-[10px] font-black text-white">우회전</span>
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 stroke-[3]" />
            </div>
          </>
        ) : (
          <>
            <div className="absolute top-2 sm:top-2.5 flex flex-col items-center pointer-events-none drop-shadow">
              <ChevronUp className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-300 stroke-[3]" />
              <span className="text-[9px] sm:text-[10px] font-black text-white">전진</span>
            </div>
            <div className="absolute bottom-2 sm:bottom-2.5 flex flex-col items-center pointer-events-none drop-shadow">
              <span className="text-[9px] sm:text-[10px] font-black text-white">후진</span>
              <ChevronDown className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-300 stroke-[3]" />
            </div>
            <div className="absolute left-2 sm:left-2.5 flex items-center gap-0.5 pointer-events-none drop-shadow">
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 stroke-[3]" />
              <span className="text-[9px] sm:text-[10px] font-black text-white">좌이동</span>
            </div>
            <div className="absolute right-2 sm:right-2.5 flex items-center gap-0.5 pointer-events-none drop-shadow">
              <span className="text-[9px] sm:text-[10px] font-black text-white">우이동</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 stroke-[3]" />
            </div>
          </>
        )}

        {/* Draggable Thumb Stick Knob */}
        <div
          ref={knobRef}
          className={`absolute w-14 h-14 sm:w-18 sm:h-18 rounded-full shadow-2xl flex items-center justify-center pointer-events-none border-4 border-white will-change-transform ${
            isLeft ? 'bg-blue-600 shadow-blue-500/70' : 'bg-orange-500 shadow-orange-500/70'
          }`}
          style={{
            transform: 'translate3d(0px, 0px, 0px)'
          }}
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white shadow-md flex items-center justify-center">
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${isLeft ? 'bg-blue-600' : 'bg-orange-500'}`} />
          </div>
        </div>
      </div>

      {/* Mode 2 Label Pill Below */}
      <div className="mt-2 bg-slate-900/90 px-3 sm:px-3.5 py-0.5 sm:py-1 rounded-full border border-white/60 shadow-md flex items-center gap-1">
        <span className="text-[10px] sm:text-[11px] font-black text-cyan-300 uppercase">{title}</span>
      </div>
    </div>
  );
};

export const VirtualJoystick = React.memo(VirtualJoystickComponent);
