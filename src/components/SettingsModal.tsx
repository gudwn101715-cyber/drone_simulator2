import React, { useState } from 'react';
import { UserPilotProfile } from '../types';
import { Settings, ShieldCheck, Volume2, Sliders, X, Trash2, Lock, Star, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  profile: UserPilotProfile;
  onUpdateSettings: (updated: Partial<UserPilotProfile>) => void;
  onResetSaveData: () => void;
  onResetProgressAndStars: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  onUpdateSettings,
  onResetSaveData,
  onResetProgressAndStars,
  onClose
}) => {
  const [showStarResetPrompt, setShowStarResetPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleVerifyAndResetStars = () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (passwordInput.trim() === '10315') {
      onResetProgressAndStars();
      setSuccessMessage('별 수집 및 스테이지 완료 기록이 모두 깨끗하게 초기화되었습니다!');
      setPasswordInput('');
      setTimeout(() => {
        setShowStarResetPrompt(false);
        setSuccessMessage('');
      }, 1500);
    } else {
      setErrorMessage('비밀번호가 올바르지 않습니다. (비밀번호 오류)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/98 border-4 border-blue-300 rounded-[36px] p-6 sm:p-8 max-w-lg w-full shadow-2xl text-slate-800 relative flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          id="btn-close-settings"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-white shadow flex items-center justify-center">
            <Settings className="w-6 h-6 text-yellow-950" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            비행 환경 및 조작 설정
          </h2>
        </div>
        <p className="text-xs text-slate-600 font-medium mb-5">
          효과음, 비행 보조 모드, 최적 조작 감도 및 데이터 설정을 관리하세요.
        </p>

        <div className="space-y-4 overflow-y-auto pr-1 pb-4 flex-1">
          {/* 1. Assist Mode Indicator */}
          <div className="bg-emerald-50/80 p-4 rounded-2xl border-2 border-emerald-200">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black text-emerald-950">스마트 비행 안전 보조 (상시 활성화)</h3>
            </div>
            <p className="text-xs text-emerald-800 font-bold leading-relaxed">
              자동 고도 유지(Auto Altitude Hold), 수평 자동 복귀(Auto-Leveling), 건물 완충 범퍼 보호막이 기본 적용되어 누구나 쉽고 안정적으로 조종할 수 있습니다.
            </p>
          </div>

          {/* 2. Audio Settings (Effects only) */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border-2 border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-black text-slate-900">비행 효과음 & 모터 사운드</span>
              </div>
              <button
                id="btn-toggle-sound-settings"
                onClick={() => onUpdateSettings({ soundEnabled: !profile.soundEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  profile.soundEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform absolute top-1 ${
                    profile.soundEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 3. Controls Sensitivity Locked to 0.7 */}
          <div className="bg-amber-50/70 p-4 rounded-2xl border-2 border-amber-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-black text-slate-900">비행 조작 감도</span>
                <span className="flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                  <Lock className="w-3 h-3 text-amber-800" />
                  0.7x 표준 고정
                </span>
              </div>
              <span className="text-xs font-mono font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                0.7x (고정)
              </span>
            </div>
            <p className="text-xs text-amber-900/80 font-bold leading-relaxed mb-2">
              흔들림 없는 정밀 호버링과 최적의 선회 기동성을 위해 모든 조작 감도가 0.7x 표준값으로 안전하게 고정되어 있습니다.
            </p>
            <div className="w-full bg-amber-200/60 rounded-full h-2 overflow-hidden">
              <div className="bg-amber-500 h-2 rounded-full w-[35%]" />
            </div>
          </div>

          {/* 4. Reset Stars & Stage Progress Menu (Password Protected: 10315) */}
          <div className="bg-yellow-50/90 p-4 rounded-2xl border-2 border-yellow-300 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-yellow-400 border border-white shadow flex items-center justify-center">
                  <Star className="w-4 h-4 fill-yellow-950 text-yellow-950" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">별점 & 스테이지 완료 기록 초기화</h4>
                  <p className="text-[11px] text-slate-600 font-bold">비밀번호 인증 후 모든 미션의 별점 및 완료 기록을 함께 초기화</p>
                </div>
              </div>
              <button
                id="btn-open-star-reset"
                onClick={() => {
                  setShowStarResetPrompt(!showStarResetPrompt);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-yellow-950 text-xs font-black border border-white shadow transition-all cursor-pointer flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{showStarResetPrompt ? '닫기' : '기록 초기화'}</span>
              </button>
            </div>

            {/* Password input drop-down form */}
            {showStarResetPrompt && (
              <div className="mt-3 pt-3 border-t border-yellow-200/80 space-y-2 animate-fadeIn">
                <p className="text-xs text-yellow-950 font-bold">
                  별점과 스테이지 완료 기록을 한 번에 초기화하려면 비밀번호를 입력하세요.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    id="input-star-reset-password"
                    type="password"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="비밀번호 5자리 입력"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyAndResetStars();
                    }}
                    className="flex-1 px-3 py-2 text-xs font-mono font-black tracking-widest bg-white border-2 border-yellow-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
                  />
                  <button
                    id="btn-confirm-star-reset"
                    onClick={handleVerifyAndResetStars}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black border border-white shadow cursor-pointer transition-transform active:scale-95 whitespace-nowrap"
                  >
                    초기화 확인
                  </button>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-black mt-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-black mt-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{successMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. General Reset Data */}
          <div className="pt-4 flex justify-between items-center text-slate-500 border-t border-slate-200">
            <button
              onClick={() => {
                if (window.confirm('모든 미션 진행 기록과 전체 데이터를 완전 초기화하시겠습니까?')) {
                  onResetSaveData();
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-black cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전체 데이터 초기화</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            id="btn-confirm-settings"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md border-2 border-white cursor-pointer"
          >
            설정 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
