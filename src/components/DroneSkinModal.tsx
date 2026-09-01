import React from 'react';
import { DroneSkin, UserPilotProfile } from '../types';
import { DRONE_SKINS, calculateTotalStars } from '../utils/storage';
import { Check, X, Zap, Wind, Shield, Plane } from 'lucide-react';

interface DroneSkinModalProps {
  profile: UserPilotProfile;
  selectedSkinId: string;
  onSelectSkin: (skin: DroneSkin) => void;
  onClose: () => void;
}

// Graphic preview renderer for each drone model type
const DroneGraphicPreview: React.FC<{ skin: DroneSkin; isSelected: boolean }> = ({ skin, isSelected }) => {
  const { modelType, primaryColor, secondaryColor, propColor, ledColor } = skin;

  switch (modelType) {
    case 'HEXA_RESCUE':
      // 6-rotor rescue hexacopter
      return (
        <svg viewBox="0 0 200 140" className="w-full h-24 sm:h-28 drop-shadow-md">
          {/* Hexa Arms */}
          <line x1="100" y1="70" x2="40" y2="35" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="100" y1="70" x2="160" y2="35" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="100" y1="70" x2="30" y2="70" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="100" y1="70" x2="170" y2="70" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="100" y1="70" x2="40" y2="105" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="100" y1="70" x2="160" y2="105" stroke="#334155" strokeWidth="6" strokeLinecap="round" />

          {/* 6 Rotors */}
          {[[40, 35], [160, 35], [30, 70], [170, 70], [40, 105], [160, 105]].map(([x, y], idx) => (
            <g key={idx} transform={`translate(${x}, ${y})`}>
              <circle cx="0" cy="0" r="18" fill="none" stroke={propColor} strokeWidth="3" opacity="0.8" strokeDasharray="3 3" />
              <ellipse cx="0" cy="0" rx="16" ry="4" fill={propColor} opacity="0.9" transform={`rotate(${idx * 30 + 15})`} />
              <circle cx="0" cy="0" r="5" fill={secondaryColor} />
              <circle cx="0" cy="0" r="2.5" fill={ledColor} />
            </g>
          ))}

          {/* Heavy Central Rescue Body */}
          <rect x="74" y="46" width="52" height="48" rx="14" fill={primaryColor} stroke={secondaryColor} strokeWidth="3" />
          <circle cx="100" cy="70" r="14" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          {/* Medical / Rescue Cross */}
          <path d="M 96 64 L 104 64 L 104 68 L 108 68 L 108 72 L 104 72 L 104 76 L 96 76 L 96 72 L 92 72 L 92 68 L 96 68 Z" fill="#ffffff" />
          {/* Top Emergency Light */}
          <circle cx="100" cy="50" r="4" fill="#ef4444" className="animate-pulse" />
        </svg>
      );

    case 'TWIN_RACER':
      // Aerodynamic canard bumblebee racer
      return (
        <svg viewBox="0 0 200 140" className="w-full h-24 sm:h-28 drop-shadow-md">
          {/* Swept carbon wings */}
          <polygon points="100,25 45,60 55,85 100,65 145,85 155,60" fill={secondaryColor} />
          <polygon points="100,35 60,65 100,55 140,65" fill={primaryColor} />

          {/* 4 Racing Rotors */}
          {[[45, 45], [155, 45], [45, 95], [155, 95]].map(([x, y], idx) => (
            <g key={idx} transform={`translate(${x}, ${y})`}>
              <circle cx="0" cy="0" r="20" fill="none" stroke={primaryColor} strokeWidth="2.5" opacity="0.7" />
              <ellipse cx="0" cy="0" rx="18" ry="4" fill={propColor} transform={`rotate(${idx * 45})`} />
              <circle cx="0" cy="0" r="5" fill="#0f172a" />
              <circle cx="0" cy="0" r="2" fill={ledColor} />
            </g>
          ))}

          {/* Sleek Cockpit Canopy */}
          <ellipse cx="100" cy="65" rx="12" ry="24" fill={primaryColor} stroke={secondaryColor} strokeWidth="2" />
          <ellipse cx="100" cy="58" rx="6" ry="12" fill="#0f172a" />
          {/* Canard Tips */}
          <circle cx="100" cy="38" r="3" fill={ledColor} />
        </svg>
      );

    case 'OCTA_EXPLORER':
      // 8-rotor coaxial explorer
      return (
        <svg viewBox="0 0 200 140" className="w-full h-24 sm:h-28 drop-shadow-md">
          {/* Heavy X-Arms */}
          <line x1="50" y1="35" x2="150" y2="105" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
          <line x1="150" y1="35" x2="50" y2="105" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />

          {/* 4 Heavy Coaxial Rotor Pods (Dual Blade effect) */}
          {[[50, 35], [150, 35], [50, 105], [150, 105]].map(([x, y], idx) => (
            <g key={idx} transform={`translate(${x}, ${y})`}>
              <circle cx="0" cy="0" r="24" fill="none" stroke={secondaryColor} strokeWidth="3" opacity="0.6" strokeDasharray="4 2" />
              <ellipse cx="0" cy="0" rx="22" ry="5" fill={propColor} opacity="0.8" transform={`rotate(${idx * 25})`} />
              <ellipse cx="0" cy="0" rx="22" ry="5" fill={secondaryColor} opacity="0.6" transform={`rotate(${idx * 25 + 90})`} />
              <circle cx="0" cy="0" r="7" fill={primaryColor} stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill={ledColor} />
            </g>
          ))}

          {/* Rugged Central Octa Hub & Dome */}
          <rect x="75" y="48" width="50" height="44" rx="12" fill={primaryColor} stroke="#ffffff" strokeWidth="2.5" />
          <circle cx="100" cy="70" r="16" fill="#0f172a" stroke={secondaryColor} strokeWidth="3" />
          <circle cx="100" cy="70" r="7" fill={ledColor} className="animate-pulse" />
        </svg>
      );

    case 'CYBER_JET':
      // Delta wing cyber jet quad
      return (
        <svg viewBox="0 0 200 140" className="w-full h-24 sm:h-28 drop-shadow-md">
          {/* Glowing Delta Wing */}
          <polygon points="100,20 30,95 65,110 100,90 135,110 170,95" fill={primaryColor} stroke={secondaryColor} strokeWidth="2.5" />
          <polygon points="100,30 45,90 100,75 155,90" fill="#0f172a" />

          {/* Cyber Thruster Exhaust Trail */}
          <polygon points="88,105 100,132 112,105" fill={secondaryColor} opacity="0.85" />
          <polygon points="94,105 100,122 106,105" fill="#22d3ee" />

          {/* 4 Inset Rotors */}
          {[[52, 60], [148, 60], [68, 92], [132, 92]].map(([x, y], idx) => (
            <g key={idx} transform={`translate(${x}, ${y})`}>
              <circle cx="0" cy="0" r="16" fill="none" stroke={secondaryColor} strokeWidth="2" opacity="0.8" />
              <ellipse cx="0" cy="0" rx="14" ry="3.5" fill={propColor} transform={`rotate(${idx * 45 + 15})`} />
              <circle cx="0" cy="0" r="4" fill={ledColor} />
            </g>
          ))}

          {/* Cyber Cockpit */}
          <ellipse cx="100" cy="55" rx="9" ry="18" fill={secondaryColor} stroke="#ffffff" strokeWidth="1.5" />
          <ellipse cx="100" cy="52" rx="4" ry="8" fill="#ffffff" />
        </svg>
      );

    case 'STEALTH_ACE':
      // Faceted stealth fighter forward-swept quad
      return (
        <svg viewBox="0 0 200 140" className="w-full h-24 sm:h-28 drop-shadow-md">
          {/* Dark Faceted Armor Shell */}
          <polygon points="100,22 40,70 60,112 100,95 140,112 160,70" fill={primaryColor} stroke={secondaryColor} strokeWidth="2" />
          <polygon points="100,35 65,75 100,68 135,75" fill="#1e293b" />

          {/* Twin Vertical Fins */}
          <polygon points="72,85 70,115 78,110 80,88" fill={secondaryColor} />
          <polygon points="128,85 130,115 122,110 120,88" fill={secondaryColor} />

          {/* 4 Stealth Rotors */}
          {[[45, 55], [155, 55], [52, 95], [148, 95]].map(([x, y], idx) => (
            <g key={idx} transform={`translate(${x}, ${y})`}>
              <circle cx="0" cy="0" r="18" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.5" strokeDasharray="6 3" />
              <ellipse cx="0" cy="0" rx="16" ry="4" fill={propColor} opacity="0.9" transform={`rotate(${idx * 40 + 20})`} />
              <circle cx="0" cy="0" r="5" fill="#334155" />
              <circle cx="0" cy="0" r="2.5" fill={ledColor} />
            </g>
          ))}

          {/* Stealth Sensor Nose */}
          <polygon points="100,25 93,48 107,48" fill="#38bdf8" opacity="0.9" />
          <line x1="100" y1="48" x2="100" y2="85" stroke={secondaryColor} strokeWidth="2" />
        </svg>
      );

    default: // 'QUAD_PROBE' (Classic Sky Blue Quad)
      return (
        <svg viewBox="0 0 200 140" className="w-full h-24 sm:h-28 drop-shadow-md">
          {/* Carbon Arms */}
          <line x1="55" y1="40" x2="145" y2="100" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
          <line x1="145" y1="40" x2="55" y2="100" stroke="#334155" strokeWidth="7" strokeLinecap="round" />

          {/* 4 Circular Duct Guards & Rotors */}
          {[[55, 40], [145, 40], [55, 100], [145, 100]].map(([x, y], idx) => (
            <g key={idx} transform={`translate(${x}, ${y})`}>
              <circle cx="0" cy="0" r="22" fill="none" stroke={secondaryColor} strokeWidth="4" opacity="0.8" />
              <ellipse cx="0" cy="0" rx="18" ry="4.5" fill={propColor} transform={`rotate(${idx * 45 + 10})`} />
              <circle cx="0" cy="0" r="6" fill={primaryColor} stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill={ledColor} />
            </g>
          ))}

          {/* Central Dome Canopy */}
          <ellipse cx="100" cy="70" rx="20" ry="24" fill={primaryColor} stroke="#ffffff" strokeWidth="3" />
          <circle cx="100" cy="62" r="10" fill="#0f172a" stroke={secondaryColor} strokeWidth="2" />
          <circle cx="100" cy="62" r="4" fill="#38bdf8" />
          {/* Front Direction Indicator */}
          <polygon points="100,42 94,50 106,50" fill="#ffffff" />
        </svg>
      );
  }
};

export const DroneSkinModal: React.FC<DroneSkinModalProps> = ({
  profile,
  selectedSkinId,
  onSelectSkin,
  onClose
}) => {
  const totalStars = calculateTotalStars(profile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sky-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-cyan-400/50 rounded-3xl p-4 sm:p-6 max-w-4xl w-full shadow-2xl text-white relative flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          id="btn-close-skins"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 border border-white/20 shadow-md flex items-center justify-center">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>드론 격납고 & 기체 선택</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30">
                HANGAR
              </span>
            </h2>
            <p className="text-xs text-sky-200/80 font-medium">
              모든 기체가 무료로 잠금 해제되어 있습니다. 원하는 디자인의 드론을 터치하여 즉시 출격하세요!
            </p>
          </div>
        </div>

        {/* Skins Visual Grid with Real Graphic Illustrations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto pr-1 pb-3 flex-1 mt-1">
          {DRONE_SKINS.map((skin) => {
            const isSelected = selectedSkinId === skin.id;

            return (
              <div
                key={skin.id}
                id={`skin-card-${skin.id}`}
                onClick={() => onSelectSkin(skin)}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 bg-gradient-to-b from-cyan-950/80 to-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-[1.02]'
                    : 'border-slate-700/80 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                <div>
                  {/* Top Bar: Model Type Badge & Colors */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-slate-950 text-cyan-300 border border-slate-700">
                      {skin.modelTypeName}
                    </span>

                    <div className="flex items-center gap-1">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: skin.primaryColor }}
                        title="주요 바디 색상"
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: skin.secondaryColor }}
                        title="보조 포인트 색상"
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: skin.ledColor }}
                        title="LED 색상"
                      />
                    </div>
                  </div>

                  {/* Visual Drone Illustration Preview */}
                  <div className="w-full bg-slate-950/60 rounded-xl p-2 my-1.5 border border-slate-800 flex items-center justify-center">
                    <DroneGraphicPreview skin={skin} isSelected={isSelected} />
                  </div>

                  {/* Name & Selected Status */}
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <h3 className="text-sm font-black text-white truncate">
                      {skin.name}
                    </h3>
                    {isSelected && (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-cyan-500 text-slate-950 flex items-center gap-0.5 shadow shrink-0">
                        <Check className="w-3 h-3" />
                        출격 중
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed mb-2.5 line-clamp-2">
                    {skin.description}
                  </p>

                  {/* Stats Bars */}
                  <div className="space-y-1 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" /> 최고 속도
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div
                            key={step}
                            className={`w-3 h-1.5 rounded-sm ${step <= skin.stats.topSpeed ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-slate-700'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                      <span className="flex items-center gap-1">
                        <Wind className="w-3 h-3 text-sky-400" /> 선회 민첩성
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div
                            key={step}
                            className={`w-3 h-1.5 rounded-sm ${step <= skin.stats.agility ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]' : 'bg-slate-700'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" /> 비행 안정성
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div
                            key={step}
                            className={`w-3 h-1.5 rounded-sm ${step <= skin.stats.stability ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-slate-700'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Select Action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSkin(skin);
                  }}
                  className={`mt-2.5 w-full py-1.5 rounded-xl text-xs font-black transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                      : 'bg-slate-700 hover:bg-cyan-600 hover:text-white text-slate-200'
                  }`}
                >
                  {isSelected ? '선택됨 (현재 탑승)' : '이 기체로 선택'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
