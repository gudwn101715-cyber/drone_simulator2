import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MissionStage } from '../types';
import { Star, Trophy, RotateCcw, ArrowRight, Home, Sparkles } from 'lucide-react';

interface MissionResultModalProps {
  stage: MissionStage;
  stars: number;
  timeSec: number;
  isNewRecord: boolean;
  racePlayerWon?: boolean;
  aiTimeSec?: number;
  onRetry: () => void;
  onNext: () => void;
  onHome: () => void;
}

export const MissionResultModal: React.FC<MissionResultModalProps> = ({
  stage,
  stars,
  timeSec,
  isNewRecord,
  racePlayerWon,
  aiTimeSec,
  onRetry,
  onNext,
  onHome
}) => {
  const isAiRace = stage.type === 'AI_RACING' || stage.id === 'ai-racing-1';
  const playerLostRace = isAiRace && racePlayerWon === false;

  useEffect(() => {
    // Fire confetti for celebration (only if won or non-race)
    if (!playerLostRace) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    }
  }, [playerLostRace]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sky-950/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/98 border-4 border-blue-300 rounded-[32px] p-5 sm:p-7 max-w-md w-full shadow-2xl text-center text-slate-800 flex flex-col items-center max-h-[92vh] overflow-y-auto">
        {/* Top Trophy Icon */}
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg mb-2 ${
          playerLostRace 
            ? 'bg-slate-300 text-slate-700 shadow-slate-400/30'
            : 'bg-yellow-400 text-yellow-950 shadow-yellow-500/30 animate-bounce'
        }`}>
          <Trophy className="w-8 h-8 sm:w-9 sm:h-9 fill-current" />
        </div>

        <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full border ${
          playerLostRace
            ? 'text-rose-700 bg-rose-50 border-rose-200'
            : 'text-blue-600 bg-blue-50 border-blue-200'
        }`}>
          {playerLostRace ? '2ND PLACE FINISH' : 'MISSION COMPLETE!'}
        </span>
        <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5 mb-0.5">
          {playerLostRace ? '2위 완주 (AI 라이벌 승리)' : isAiRace ? '1위 우승! AI 라이벌 격파! 🏆' : '미션 성공 완료!'}
        </h2>
        <p className="text-xs text-slate-600 font-medium mb-3">
          {playerLostRace ? (
            <span>AI 라이벌이 먼저 결승선을 통과했습니다. 완주 보상으로 <strong className="text-amber-600">별 1개</strong>가 지급되었습니다. 다시 도전하여 AI를 꺾고 추가 별을 획득해보세요!</span>
          ) : isAiRace ? (
            <span>AI 라이벌과의 치열한 접전 끝에 당당히 <strong className="text-blue-600">1위로 결승선</strong>을 통과했습니다!</span>
          ) : (
            <span><strong className="text-blue-600">[{stage.title}]</strong>을(를) 멋지게 완수하였습니다.</span>
          )}
        </p>

        {/* Star Rating Animation */}
        <div className="flex items-center justify-center gap-3 mb-4 bg-yellow-50/80 px-5 py-2 rounded-2xl border-2 border-yellow-200">
          {[1, 2, 3].map((starIdx) => (
            <div
              key={starIdx}
              className={`transition-all duration-500 transform ${
                starIdx <= stars ? 'scale-110' : 'scale-90 opacity-40'
              }`}
            >
              <Star
                className={`w-10 h-10 ${
                  starIdx <= stars
                    ? 'fill-yellow-400 text-yellow-500 drop-shadow-md'
                    : 'text-slate-300 fill-slate-200'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Clear Time Stats */}
        <div className="w-full bg-blue-50/90 rounded-2xl p-3 sm:p-4 border-2 border-blue-100 mb-5 flex items-center justify-around">
          <div>
            <span className="text-[11px] text-blue-900 font-black block">내 비행 완주 시간</span>
            <span className="text-2xl font-black font-mono text-blue-600">
              {timeSec.toFixed(1)}초
            </span>
          </div>
          {isAiRace && aiTimeSec !== undefined && (
            <div className="border-l border-blue-200 pl-4">
              <span className="text-[11px] text-purple-900 font-black block">AI 라이벌 기록</span>
              <span className={`text-xl font-black font-mono ${playerLostRace ? 'text-rose-600 font-bold' : 'text-purple-600'}`}>
                {aiTimeSec.toFixed(1)}초
              </span>
            </div>
          )}
          {isNewRecord && !isAiRace && (
            <div className="flex items-center gap-1 text-emerald-700 font-black text-xs bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>최고 기록 갱신!</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          <button
            id="modal-btn-retry"
            onClick={onRetry}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 text-xs font-black shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-blue-600" />
            <span>다시 도전</span>
          </button>

          <button
            id="modal-btn-home"
            onClick={onHome}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 text-xs font-black shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-500" />
            <span>미션 목록</span>
          </button>

          <button
            id="modal-btn-next"
            onClick={onNext}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md border-2 border-white transition-transform active:scale-95 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>다음 미션</span>
          </button>
        </div>
      </div>
    </div>
  );
};
