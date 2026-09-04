import React from 'react';
import { MissionStage, ScoreBreakdown } from '../types';
import { Star, Trophy, RotateCcw, ArrowRight, Home, Sparkles, Coins, Zap, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';

interface MissionResultModalProps {
  stage: MissionStage;
  stars: number;
  timeSec: number;
  scoreBreakdown: ScoreBreakdown;
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
  scoreBreakdown,
  isNewRecord,
  racePlayerWon,
  aiTimeSec,
  onRetry,
  onNext,
  onHome
}) => {
  const isAiRace = stage.type === 'AI_RACING' || stage.id === 'ai-racing-1' || stage.id === 'ai-racing-2';
  const playerLostRace = isAiRace && racePlayerWon === false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sky-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white/98 border-4 border-blue-300 rounded-[32px] p-5 sm:p-6 max-w-md w-full shadow-2xl text-center text-slate-800 flex flex-col items-center max-h-[94vh] overflow-y-auto">
        {/* Top Trophy Icon */}
        <div className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg mb-2 ${
          playerLostRace 
            ? 'bg-slate-300 text-slate-700 shadow-slate-400/30'
            : 'bg-yellow-400 text-yellow-950 shadow-yellow-500/30 animate-bounce'
        }`}>
          <Trophy className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
        </div>

        <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full border ${
          playerLostRace
            ? 'text-rose-700 bg-rose-50 border-rose-200'
            : 'text-blue-600 bg-blue-50 border-blue-200'
        }`}>
          {playerLostRace ? '🥈 2등 완주! 아쉬워요!' : '🎉 미션 대성공! 참 잘했어요!'}
        </span>
        <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1.5 mb-0.5">
          {playerLostRace ? '2등으로 골인! (로봇 드론 승리)' : isAiRace ? '🏆 1등 챔피언! 로봇 드론을 이겼어요!' : '🌟 미션을 멋지게 성공했어요!'}
        </h2>
        <p className="text-xs text-slate-600 font-medium mb-3">
          {playerLostRace ? (
            <span>로봇 친구가 조금 더 빨랐어요! 열심히 달린 보상으로 <strong className="text-amber-600">별 1개</strong>를 받았어요. 다시 도전해서 1등을 노려봐요!</span>
          ) : isAiRace ? (
            <span>로봇 드론과의 박진감 넘치는 달리기 시합에서 <strong className="text-blue-600">당당하게 1등</strong>으로 결승선을 통과했어요! 대단해요!</span>
          ) : (
            <span><strong className="text-blue-600">[{stage.title}]</strong> 미션을 완벽하게 완료했어요!</span>
          )}
        </p>

        {/* Total Score & Star Rating Hero */}
        <div className="w-full bg-gradient-to-b from-amber-500/10 via-yellow-400/15 to-amber-500/5 rounded-2xl p-3.5 border-2 border-amber-300/80 mb-3 shadow-inner">
          <div className="text-[11px] font-black text-amber-800 uppercase tracking-wider flex items-center justify-center gap-1.5 mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>최종 비행 점수 (TOTAL SCORE)</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-amber-900 tracking-tight flex items-baseline justify-center gap-1">
            <span>{scoreBreakdown.totalScore.toLocaleString()}</span>
            <span className="text-base font-bold text-amber-700">점</span>
          </div>

          {/* Star Rating Display */}
          <div className="flex items-center justify-center gap-2.5 mt-2 bg-white/80 py-1.5 px-4 rounded-xl border border-amber-200/80 mx-auto w-fit shadow-sm">
            {[1, 2, 3].map((starIdx) => (
              <div
                key={starIdx}
                className={`transition-all duration-500 transform ${
                  starIdx <= stars ? 'scale-110' : 'scale-90 opacity-30'
                }`}
              >
                <Star
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${
                    starIdx <= stars
                      ? 'fill-yellow-400 text-yellow-500 drop-shadow-sm'
                      : 'text-slate-300 fill-slate-200'
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="text-[10px] text-amber-800 font-bold mt-1.5">
            {stars === 3 ? '★★★ 최고 등급 마스터 파일럿 달성!' : stars === 2 ? `★★ 우수 비행! (★★★ 3성 기준: ${stage.starThresholds[0].toLocaleString()}점)` : `★ 완주 성공! (★★ 2성 기준: ${stage.starThresholds[1].toLocaleString()}점)`}
          </div>
        </div>

        {/* Detailed Score Breakdown List */}
        <div className="w-full bg-slate-50 rounded-2xl p-3 border border-slate-200 text-left mb-3 space-y-1.5 text-xs">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 px-1 flex items-center justify-between">
            <span>점수 획득 상세 내역</span>
            {isNewRecord && (
              <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" /> 최고 점수 갱신!
              </span>
            )}
          </div>

          <div className="flex items-center justify-between px-1 text-slate-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>미션 기본 완주 점수</span>
            </span>
            <span className="font-mono font-bold text-blue-600">+{scoreBreakdown.baseScore.toLocaleString()}점</span>
          </div>

          {scoreBreakdown.coinsCollected > 0 && (
            <div className="flex items-center justify-between px-1 text-slate-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>황금 동전 획득 ({scoreBreakdown.coinsCollected}개)</span>
              </span>
              <span className="font-mono font-bold text-amber-600">+{scoreBreakdown.coinScore.toLocaleString()}점</span>
            </div>
          )}

          {scoreBreakdown.allCoinsBonus > 0 && (
            <div className="flex items-center justify-between px-1 text-amber-800 font-bold bg-amber-100/70 p-1 rounded-lg">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>✨ 동전 올클리어 보너스!</span>
              </span>
              <span className="font-mono font-bold text-amber-700">+{scoreBreakdown.allCoinsBonus.toLocaleString()}점</span>
            </div>
          )}

          {scoreBreakdown.timeBonus > 0 && (
            <div className="flex items-center justify-between px-1 text-slate-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>쾌속 비행 타임 보너스 ({timeSec.toFixed(1)}초)</span>
              </span>
              <span className="font-mono font-bold text-indigo-600">+{scoreBreakdown.timeBonus.toLocaleString()}점</span>
            </div>
          )}

          {scoreBreakdown.noCrashBonus > 0 && (
            <div className="flex items-center justify-between px-1 text-slate-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>무충돌 클린 비행 보너스</span>
              </span>
              <span className="font-mono font-bold text-emerald-600">+{scoreBreakdown.noCrashBonus.toLocaleString()}점</span>
            </div>
          )}

          {scoreBreakdown.raceWinBonus && scoreBreakdown.raceWinBonus > 0 && (
            <div className="flex items-center justify-between px-1 text-purple-900 font-bold bg-purple-100/70 p-1 rounded-lg">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-purple-600 fill-purple-500" />
                <span>AI 라이벌 1등 우승 보너스</span>
              </span>
              <span className="font-mono font-bold text-purple-700">+{scoreBreakdown.raceWinBonus.toLocaleString()}점</span>
            </div>
          )}
        </div>

        {/* Clear Time Stats */}
        {isAiRace && aiTimeSec !== undefined && (
          <div className="w-full bg-blue-50/90 rounded-2xl p-2.5 border border-blue-100 mb-3 flex items-center justify-around text-xs">
            <div>
              <span className="text-[10px] text-blue-900 font-black block">내 완주 시간</span>
              <span className="text-lg font-black font-mono text-blue-600">{timeSec.toFixed(1)}초</span>
            </div>
            <div className="border-l border-blue-200 pl-4">
              <span className="text-[10px] text-purple-900 font-black block">AI 라이벌 기록</span>
              <span className={`text-lg font-black font-mono ${playerLostRace ? 'text-rose-600 font-bold' : 'text-purple-600'}`}>
                {aiTimeSec.toFixed(1)}초
              </span>
            </div>
          </div>
        )}

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
