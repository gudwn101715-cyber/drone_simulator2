import React from 'react';
import { DroneSkin, UserPilotProfile } from '../types';
import { DRONE_SKINS, calculateTotalStars } from '../utils/storage';
import { Palette, Check, Star, X, Zap, Wind, Shield, Plane } from 'lucide-react';

interface DroneSkinModalProps {
  profile: UserPilotProfile;
  selectedSkinId: string;
  onSelectSkin: (skin: DroneSkin) => void;
  onClose: () => void;
}

export const DroneSkinModal: React.FC<DroneSkinModalProps> = ({
  profile,
  selectedSkinId,
  onSelectSkin,
  onClose
}) => {
  const totalStars = calculateTotalStars(profile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/98 border-4 border-blue-300 rounded-[36px] p-6 sm:p-8 max-w-3xl w-full shadow-2xl text-slate-800 relative flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          id="btn-close-skins"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-white shadow flex items-center justify-center">
            <Plane className="w-6 h-6 text-yellow-950" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">
              드론 격납고 & 기체 선택
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              모든 기체가 즉시 사용 가능합니다! 고유한 3D 외형과 비행 특성을 가진 기체를 선택해보세요.
            </p>
          </div>
        </div>

        {/* Skins Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-1 pb-4 flex-1 mt-3">
          {DRONE_SKINS.map((skin) => {
            const isSelected = selectedSkinId === skin.id;

            return (
              <div
                key={skin.id}
                id={`skin-card-${skin.id}`}
                onClick={() => onSelectSkin(skin)}
                className={`p-4 rounded-2xl border-4 transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/90 shadow-lg ring-4 ring-blue-400/30 scale-[1.01]'
                    : 'border-slate-200 bg-white hover:border-yellow-400 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Bar: Model Type Badge & Palette */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-black rounded-lg bg-slate-800 text-cyan-300 flex items-center gap-1 shadow-sm">
                      {skin.modelTypeName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-md shadow-sm border border-white"
                        style={{ backgroundColor: skin.primaryColor }}
                        title="Primary Color"
                      />
                      <div
                        className="w-4 h-4 rounded-md shadow-sm border border-white"
                        style={{ backgroundColor: skin.secondaryColor }}
                        title="Secondary Color"
                      />
                      <div
                        className="w-4 h-4 rounded-md shadow-sm border border-white"
                        style={{ backgroundColor: skin.ledColor }}
                        title="LED Color"
                      />
                    </div>
                  </div>

                  {/* Name & Selected Badge */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-base font-black text-slate-900">
                      {skin.name}
                    </h3>
                    {isSelected && (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-blue-600 text-white flex items-center gap-0.5 shadow-sm shrink-0">
                        <Check className="w-3 h-3" />
                        출격 중
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">
                    {skin.description}
                  </p>

                  {/* Stats Bars */}
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" /> 최고 속도
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div
                            key={step}
                            className={`w-3.5 h-1.5 rounded-sm ${step <= skin.stats.topSpeed ? 'bg-amber-500' : 'bg-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Wind className="w-3 h-3 text-sky-500" /> 민첩성 / 선회
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div
                            key={step}
                            className={`w-3.5 h-1.5 rounded-sm ${step <= skin.stats.agility ? 'bg-sky-500' : 'bg-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-500" /> 안정성 / 호버
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div
                            key={step}
                            className={`w-3.5 h-1.5 rounded-sm ${step <= skin.stats.stability ? 'bg-emerald-500' : 'bg-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1">
                    ✓ 즉시 출격 가능
                  </span>

                  {!isSelected && (
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-black">
                      이 기체로 선택 →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-yellow-900 font-black bg-yellow-100 px-3 py-1.5 rounded-xl border border-yellow-300">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-500" />
            <span>보유 스타: {totalStars}개</span>
          </div>

          <button
            id="btn-close-skins-footer"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md border-2 border-white cursor-pointer"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
};
