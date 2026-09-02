import React from 'react';
import { HelpCircle, X, Gamepad2, Keyboard, Compass, ShieldCheck, HeartPulse, Trophy, Smartphone } from 'lucide-react';

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
            🎮 신나는 드론 조종법 & 비행 꿀팁
          </h2>
        </div>
        <p className="text-xs text-slate-600 font-medium mb-5">
          진짜 드론을 조종하는 방식(Mode 2) 그대로! 양손으로 재미있게 조종해 보세요.
        </p>

        <div className="space-y-4 overflow-y-auto pr-1 pb-4 flex-1 text-xs">
          {/* Mode 2 Stick Diagram */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border-2 border-blue-100">
            <div className="flex items-center gap-2 mb-3 text-blue-900 font-black text-sm">
              <Gamepad2 className="w-4 h-4 text-blue-600" />
              <span>📱 화면 터치 조이스틱 조작법</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Stick */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-blue-200 shadow-sm">
                <div className="font-black text-blue-700 mb-1.5 flex items-center justify-between">
                  <span>왼쪽 스틱 (높이 & 제자리 돌기)</span>
                  <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">높이 조절</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 text-xs font-medium">
                  <li>• <strong className="text-slate-900">위로 밀기</strong>: 하늘로 슝슝 올라가요 (이륙)</li>
                  <li>• <strong className="text-slate-900">아래로 당기기</strong>: 땅으로 내려와요 (착륙)</li>
                  <li>• <strong className="text-slate-900">왼쪽 / 오른쪽</strong>: 제자리에서 뱅글뱅글 돌아요</li>
                </ul>
              </div>

              {/* Right Stick */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-blue-200 shadow-sm">
                <div className="font-black text-blue-700 mb-1.5 flex items-center justify-between">
                  <span>오른쪽 스틱 (앞/뒤/옆으로 날기)</span>
                  <span className="text-[10px] text-amber-700 font-black bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">방향 이동</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 text-xs font-medium">
                  <li>• <strong className="text-slate-900">위로 밀기</strong>: 앞으로 쌩쌩 전진해요</li>
                  <li>• <strong className="text-slate-900">아래로 당기기</strong>: 뒤로 후진해요</li>
                  <li>• <strong className="text-slate-900">왼쪽 / 오른쪽</strong>: 옆으로 샥샥 게걸음 이동해요</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Keyboard Controls */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border-2 border-blue-100">
            <div className="flex items-center gap-2 mb-3 text-emerald-800 font-black text-sm">
              <Keyboard className="w-4 h-4 text-emerald-600" />
              <span>💻 컴퓨터 키보드로 조종할 때</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-blue-100 text-blue-800 font-black rounded-lg text-xs border border-blue-200 shadow-sm inline-block">W / S</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">위로 / 아래로</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-blue-100 text-blue-800 font-black rounded-lg text-xs border border-blue-200 shadow-sm inline-block">A / D</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">좌/우 제자리 회전</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black rounded-lg text-xs border border-amber-200 shadow-sm inline-block">화살표키 (↑↓←→)</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">앞/뒤/옆으로 이동</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black rounded-lg text-xs border border-emerald-200 shadow-sm inline-block">스페이스바 / T</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">자동 이륙 / 착륙</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <kbd className="px-2.5 py-1 bg-rose-100 text-rose-800 font-black rounded-lg text-xs border border-rose-200 shadow-sm inline-block">R / C</kbd>
                <div className="text-[10px] text-slate-600 font-bold mt-1.5">제자리 리셋 / 카메라</div>
              </div>
            </div>
          </div>

          {/* Special Mission Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-200 shadow-sm">
              <div className="flex items-center gap-1.5 font-black text-emerald-700 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>손을 놓으면 멈춰요!</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                조종하기 어려울 때는 스틱에서 손을 떼세요. 드론이 스스로 공중에 얌전히 멈춰 서요!
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border-2 border-rose-200 shadow-sm">
              <div className="flex items-center gap-1.5 font-black text-rose-700 mb-1">
                <HeartPulse className="w-4 h-4" />
                <span>환자 구출 꿀팁</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                옥상 환자 들것 위로 날아가면 자석 줄이 찰칵 붙어요! 병원 옥상 헬리패드로 안전하게 배달하세요.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border-2 border-purple-200 shadow-sm">
              <div className="flex items-center gap-1.5 font-black text-purple-700 mb-1">
                <Trophy className="w-4 h-4" />
                <span>로봇 드론과 레이스</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                코너를 돌 때 살짝 안쪽으로 파고들면 로봇 친구를 제치고 멋지게 1등할 수 있어요!
              </p>
            </div>
          </div>

          {/* Tablet & Mobile Fullscreen Tip */}
          <div className="bg-cyan-50/90 p-3.5 rounded-2xl border-2 border-cyan-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-cyan-950 font-black text-xs">
              <Smartphone className="w-4 h-4 text-cyan-600" />
              <span>태블릿 몰입형 전체화면 (상단바 / 홈버튼 자동 숨김)</span>
            </div>
            <p className="text-[11px] text-cyan-900 leading-relaxed font-medium">
              화면을 터치하여 비행을 시작하면 자동으로 상단 시계/배터리 및 하단 내비게이션 바가 숨겨집니다.<br />
              브라우저 메뉴에서 <strong>[홈 화면에 추가]</strong> 또는 <strong>[앱 설치]</strong>를 선택하면 완벽한 단독 풀스크린 앱으로 즐길 수 있습니다.
            </p>
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
