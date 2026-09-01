import React from 'react';
import { HelpCircle, X, Gamepad2, Keyboard, Compass, ShieldCheck, HeartPulse, Trophy } from 'lucide-react';

interface HelpManualModalProps {
  onClose: () => void;
}

export const HelpManualModal: React.FC<HelpManualModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/98 border-4 border-blue-300 rounded-[36px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl text-slate-800 relative flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          id="btn-close-help"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-white shadow flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-yellow-950" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            드론 조종법 & 비행 가이드
          </h2>
        </div>
        <p className="text-xs text-slate-600 font-medium mb-5">
          실제 상용 드론 규격인 Mode 2 조종법을 익히고 안전하게 비행해보세요!
        </p>

        <div className="space-y-4 overflow-y-auto pr-1 pb-4 flex-1 text-xs">
          {/* Mode 2 Stick Diagram */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border-2 border-blue-100">
            <div className="flex items-center gap-2 mb-3 text-blue-900 font-black text-sm">
              <Gamepad2 className="w-4 h-4 text-blue-600" />
              <span>터치 가상 조이스틱 (Mode 2 규격)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Stick */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-blue-200 shadow-sm">
                <div className="font-black text-blue-700 mb-1.5 flex items-center justify-between">
                  <span>왼쪽 조이스틱 (Throttle / Yaw)</span>
                  <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">고도 및 방향</span>
                </div>
                <ul className="space-y-1 text-slate-600 text-[11px] font-medium">
                  <li>• <strong className="text-slate-900">위 (Up)</strong>: 상승 (이륙 및 고도 올리기)</li>
                  <li>• <strong className="text-slate-900">아래 (Down)</strong>: 하강 (고도 내리기 및 착륙)</li>
                  <li>• <strong className="text-slate-900">좌/우 (Left/Right)</strong>: 기체 제자리 회전 (Yaw)</li>
                </ul>
              </div>

              {/* Right Stick */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-blue-200 shadow-sm">
                <div className="font-black text-blue-700 mb-1.5 flex items-center justify-between">
                  <span>오른쪽 조이스틱 (Pitch / Roll)</span>
                  <span className="text-[10px] text-amber-700 font-black bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">수평 이동</span>
                </div>
                <ul className="space-y-1 text-slate-600 text-[11px] font-medium">
                  <li>• <strong className="text-slate-900">위 (Up)</strong>: 전진 비행 (Nose Down)</li>
                  <li>• <strong className="text-slate-900">아래 (Down)</strong>: 후진 비행 (Nose Up)</li>
                  <li>• <strong className="text-slate-900">좌/우 (Left/Right)</strong>: 좌/우 슬라이드 이동 (Roll)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Keyboard Controls */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border-2 border-blue-100">
            <div className="flex items-center gap-2 mb-3 text-emerald-800 font-black text-sm">
              <Keyboard className="w-4 h-4 text-emerald-600" />
              <span>PC 키보드 단축키 안내</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-blue-100 text-blue-800 font-black rounded-lg text-xs border border-blue-200 shadow-sm inline-block">W / S</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">상승 / 하강</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-blue-100 text-blue-800 font-black rounded-lg text-xs border border-blue-200 shadow-sm inline-block">A / D</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">좌/우 회전</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black rounded-lg text-xs border border-amber-200 shadow-sm inline-block">방향키 (↑↓←→)</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">전진 / 후진 / 이동</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black rounded-lg text-xs border border-emerald-200 shadow-sm inline-block">T / Space</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">자동 이·착륙</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-rose-100 text-rose-800 font-black rounded-lg text-xs border border-rose-200 shadow-sm inline-block">R / C</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">리셋 / 시점 변경</div>
              </div>
            </div>
          </div>

          {/* Special Mission Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-200 shadow-sm">
              <div className="flex items-center gap-1.5 font-black text-emerald-700 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>호버링 (정지비행)</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                초보자 모드에서는 조이스틱에서 손을 떼면 드론이 자동으로 수평을 잡고 제자리 고도를 유지합니다.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border-2 border-rose-200 shadow-sm">
              <div className="flex items-center gap-1.5 font-black text-rose-700 mb-1">
                <HeartPulse className="w-4 h-4" />
                <span>환자 구출 미션</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                옥상 조난 캡슐 위로 천천히 접근하면 자석 빔이 캡슐을 견인합니다. 병원 헬리패드로 안전하게 이송하세요.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border-2 border-purple-200 shadow-sm">
              <div className="flex items-center gap-1.5 font-black text-purple-700 mb-1">
                <Trophy className="w-4 h-4" />
                <span>AI 레이싱 경쟁</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                코너에서 고도를 적절히 낮추고 링 게이트를 통과하며 AI 드론보다 먼저 2바퀴를 완주하세요.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            id="btn-close-help-footer"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md border-2 border-white cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
