import React, { useState } from 'react';
import { UserPilotProfile } from '../types';
import { calculateTotalStars, getPilotRank } from '../utils/storage';
import { Award, Star, X, Check, Edit3, Shield, Coins, HeartPulse, Trophy } from 'lucide-react';

interface PilotLicenseModalProps {
  profile: UserPilotProfile;
  onUpdateName: (name: string, callsign: string) => void;
  onClose: () => void;
}

export const PilotLicenseModal: React.FC<PilotLicenseModalProps> = ({
  profile,
  onUpdateName,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile.pilotName);
  const [callsignInput, setCallsignInput] = useState(profile.callsign);

  const totalStars = calculateTotalStars(profile);
  const rank = getPilotRank(totalStars);

  const handleSave = () => {
    onUpdateName(nameInput.trim() || '주니어 조종사', callsignInput.trim() || 'EAGLE-01');
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sky-950/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/98 border-4 border-blue-300 rounded-[32px] p-5 sm:p-7 max-w-lg w-full shadow-2xl text-slate-800 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          id="btn-close-license"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-white shadow flex items-center justify-center">
            <Award className="w-6 h-6 text-yellow-950" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            프로브 드론 조종 면허증
          </h2>
        </div>

        {/* 3D Gold ID Card */}
        <div className="relative rounded-[28px] p-6 bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-700 border-4 border-yellow-300 shadow-2xl shadow-blue-500/30 mb-6 overflow-hidden text-white">
          {/* Hologram top ribbon */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-yellow-300 via-white to-pink-400" />

          {/* Card Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/20">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-300" />
              <span className="text-[11px] font-black tracking-widest uppercase text-yellow-200">
                OFFICIAL PILOT LICENSE
              </span>
            </div>
            <span className="text-[10px] font-mono text-blue-100 font-bold">
              NO. PRB-2026-KR
            </span>
          </div>

          {/* Pilot Info Grid */}
          <div className="py-4 flex items-center gap-4">
            {/* Avatar Badge */}
            <div className="w-16 h-16 rounded-2xl bg-yellow-400 border-4 border-white flex items-center justify-center text-3xl shadow-lg shrink-0">
              {rank.badge}
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="조종사 이름"
                    className="w-full px-3 py-1 text-sm bg-white border-2 border-yellow-300 rounded-xl text-slate-900 font-black"
                  />
                  <input
                    type="text"
                    value={callsignInput}
                    onChange={(e) => setCallsignInput(e.target.value)}
                    placeholder="호출부호 (Callsign)"
                    className="w-full px-3 py-1 text-xs bg-white border-2 border-yellow-300 rounded-xl text-blue-700 font-mono font-bold"
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-white truncate">
                      {profile.pilotName}
                    </h3>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-yellow-200 hover:text-white cursor-pointer"
                      title="이름 수정"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs font-mono font-bold text-yellow-200 block">
                    CALLSIGN: {profile.callsign}
                  </span>
                </>
              )}

              <div className="mt-1.5 flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-yellow-300 text-yellow-950 border border-white">
                  {rank.title}
                </span>
                <span className="text-[11px] text-white/90 font-black">
                  ★ {totalStars} 스타 획득
                </span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-white/20 text-center">
            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-2xl border border-white/25">
              <span className="text-[10px] text-blue-100 block font-bold">획득 코인</span>
              <span className="text-sm font-black font-mono text-yellow-300 flex items-center justify-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                {profile.totalCoinsCollected}
              </span>
            </div>

            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-2xl border border-white/25">
              <span className="text-[10px] text-blue-100 block font-bold">구조 환자</span>
              <span className="text-sm font-black font-mono text-rose-200 flex items-center justify-center gap-1">
                <HeartPulse className="w-3.5 h-3.5" />
                {profile.totalPatientsRescued}
              </span>
            </div>

            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-2xl border border-white/25">
              <span className="text-[10px] text-blue-100 block font-bold">레이스 승리</span>
              <span className="text-sm font-black font-mono text-amber-200 flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {profile.totalRacesWon}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5">
          {isEditing ? (
            <button
              id="btn-save-pilot-name"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md border-2 border-white cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>저장하기</span>
            </button>
          ) : (
            <button
              id="btn-close-pilot-modal"
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black cursor-pointer border border-slate-200"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
