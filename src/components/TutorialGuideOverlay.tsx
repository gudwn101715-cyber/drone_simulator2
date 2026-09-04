import React, { useEffect, useState, useRef, memo } from 'react';
import { 
  Sparkles, 
  Target, 
  Trophy, 
  Coins, 
  HeartPulse, 
  ChevronUp, 
  ChevronDown,
  ArrowRight,
  MoveVertical,
  Volume2
} from 'lucide-react';
import { DroneTelemetry, MissionStage } from '../types';
import { soundManager } from '../utils/audio';

interface MissionDataState {
  coinsCollected: number;
  totalCoins: number;
  currentRing: number;
  totalRings: number;
  patientPickedUp: boolean;
  patientDelivered: boolean;
  currentLap: number;
  totalLaps: number;
}

interface TutorialGuideOverlayProps {
  stage: MissionStage;
  step?: number; // for tutorial-1
  telemetry: DroneTelemetry;
  missionData: MissionDataState;
  onStepComplete?: (step: number) => void;
  onEmergencyStop?: () => void;
}

interface PraiseNotification {
  id: number;
  emoji: string;
  title: string;
  subtitle: string;
}

export const TutorialGuideOverlay: React.FC<TutorialGuideOverlayProps> = memo(({
  stage,
  step = 1,
  telemetry,
  missionData,
  onStepComplete,
}) => {
  // Step timers for tutorial-1
  const [hoverTimer, setHoverTimer] = useState<number>(3.0);
  const [isHoveringValid, setIsHoveringValid] = useState<boolean>(false);
  const [moveTimer, setMoveTimer] = useState<number>(2.5);
  
  // UI Layout Preferences (Compact / Position: bottom vs top)
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Dynamic praise toast state
  const [praiseToast, setPraiseToast] = useState<PraiseNotification | null>(null);

  // Tracking refs to prevent unnecessary re-renders & audio spam
  const lastCoinRef = useRef<number>(missionData.coinsCollected);
  const lastRingRef = useRef<number>(missionData.currentRing);
  const lastPatientPickedRef = useRef<boolean>(missionData.patientPickedUp);
  const lastPatientDeliveredRef = useRef<boolean>(missionData.patientDelivered);
  const lastLapRef = useRef<number>(missionData.currentLap);
  const highAltNotifiedRef = useRef<boolean>(false);
  const lastPraiseTimeRef = useRef<number>(0);

  const completedStepRef = useRef<number>(0);
  const telemetryRef = useRef<DroneTelemetry>(telemetry);
  telemetryRef.current = telemetry;

  const onStepCompleteRef = useRef(onStepComplete);
  onStepCompleteRef.current = onStepComplete;

  const showPraise = (emoji: string, title: string, subtitle: string) => {
    const now = Date.now();
    // Prevent praise spam within 1.5s
    if (now - lastPraiseTimeRef.current < 1500) return;
    lastPraiseTimeRef.current = now;

    const newId = now;
    setPraiseToast({ id: newId, emoji, title, subtitle });
    soundManager.speakGuide(`${title} ${subtitle}`);

    setTimeout(() => {
      setPraiseToast(prev => (prev?.id === newId ? null : prev));
    }, 2500);
  };

  const triggerComplete = (completedStep: number) => {
    if (completedStepRef.current >= completedStep) return;
    completedStepRef.current = completedStep;

    if (completedStep === 1) {
      showPraise('🛫', '이륙 성공!', '하늘로 슝슝 올라갔어요! 멋져요!');
    } else if (completedStep === 2) {
      showPraise('✨', '호버링 성공!', '공중에 얌전히 멈춰 섰어요! 최고!');
    } else if (completedStep === 3) {
      showPraise('🎮', '조종 성공!', '앞뒤좌우 비행 감각 완벽 마스터!');
    } else if (completedStep === 4) {
      showPraise('💖', '1단계 완주!', '노란 착륙장에 사뿐히 안착했어요!');
    }

    if (onStepCompleteRef.current) {
      onStepCompleteRef.current(completedStep);
    }
  };

  // 1. Tutorial-1 Low-Overhead Physics Evaluation Loop
  useEffect(() => {
    if (stage.type !== 'TUTORIAL' || stage.id !== 'tutorial-1') return;

    completedStepRef.current = Math.max(0, step - 1);
    let hoverAcc = 0;
    let moveAcc = 0;
    let landAcc = 0;

    setHoverTimer(3.0);
    setMoveTimer(2.5);
    setIsHoveringValid(false);

    // Lightweight 100ms interval for physics check
    const interval = setInterval(() => {
      const t = telemetryRef.current;
      if (!t) return;

      if (step === 1) {
        if (t.altitudeM >= 1.5) {
          triggerComplete(1);
        }
      } else if (step === 2) {
        const inHover = t.altitudeM >= 1.2 && t.altitudeM <= 6.0 && t.speedKmh < 4.5;
        setIsHoveringValid(inHover);

        if (inHover) {
          hoverAcc += 0.1;
          const remaining = Math.max(0, Math.round((3.0 - hoverAcc) * 10) / 10);
          setHoverTimer(remaining);
          if (hoverAcc >= 2.95) {
            triggerComplete(2);
          }
        } else {
          hoverAcc = Math.max(0, hoverAcc - 0.05);
          const remaining = Math.max(0, Math.round((3.0 - hoverAcc) * 10) / 10);
          setHoverTimer(remaining);
        }
      } else if (step === 3) {
        const isMoving = t.altitudeM >= 0.8 && (
          t.speedKmh > 0.9 || 
          Math.abs(t.pitchDeg) > 1.5 || 
          Math.abs(t.rollDeg) > 1.5 || 
          Math.abs(t.yawDeg) > 1.5
        );

        if (isMoving) {
          moveAcc += 0.1;
          const remaining = Math.max(0, Math.round((2.5 - moveAcc) * 10) / 10);
          setMoveTimer(remaining);
          if (moveAcc >= 2.45) {
            triggerComplete(3);
          }
        }
      } else if (step === 4) {
        const isLanded = (t.isGrounded || t.altitudeM <= 0.35) && t.speedKmh < 4.0;
        if (isLanded) {
          landAcc += 0.1;
          if (landAcc >= 0.3) {
            triggerComplete(4);
          }
        } else {
          landAcc = 0;
        }
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [stage.id, stage.type, step]);

  // 2. Stage Milestone Praise Triggers
  useEffect(() => {
    if (stage.type === 'COIN_HUNT') {
      if (missionData.coinsCollected > lastCoinRef.current) {
        const c = missionData.coinsCollected;
        const total = missionData.totalCoins;
        if (c === 1) {
          showPraise('🌟', '첫 황금 동전 냠냠!', '아주 좋아요! 높이를 맞춰보세요!');
        } else if (c === Math.floor(total / 2)) {
          showPraise('👏', '벌써 절반 획득!', '대단한 실력이에요! 훌륭해요!');
        } else if (c >= total) {
          showPraise('🎉', '모든 동전 올 클리어!', '미션 성공! 최고예요!');
        } else {
          showPraise('✨', `동전 +1개 (${c}/${total})`, '나이스 비행! 다음 동전으로!');
        }
      }
      lastCoinRef.current = missionData.coinsCollected;
    }

    if (stage.type === 'RING_RACE' || stage.id === 'tutorial-2') {
      if (missionData.currentRing > lastRingRef.current) {
        const r = missionData.currentRing - 1;
        const total = missionData.totalRings;
        if (r === 1) {
          showPraise('🏛️', '국회의사당 진입 성공!', '멋진 출발! 잔디광장 분수대로!');
        } else if (r === 2) {
          showPraise('⛲', '국회의사당 광장 돌파!', '완벽한 관통! 알파 빌딩 터널로!');
        } else if (r === 3) {
          showPraise('🏢', '알파 빌딩 터널 돌파!', '짜릿한 비행 성공! 훌륭해요!');
        } else if (r === 4) {
          showPraise('🌉', '구름다리 통과!', '완벽한 조종 감각! 대단해요!');
        } else if (r === 5) {
          showPraise('⚡', '감마 타워 관통!', '골인 결승선으로 진입하세요!');
        } else if (r >= total) {
          showPraise('🏆', '모든 게이트 돌파 완료!', '골인 지점으로 착륙하세요!');
        } else {
          showPraise('🌟', `${r}번 게이트 쏙 통과!`, '완벽한 코너링이에요!');
        }
      }
      lastRingRef.current = missionData.currentRing;
    }

    if (stage.type === 'RESCUE') {
      if (missionData.patientPickedUp && !lastPatientPickedRef.current) {
        showPraise('💖', '63빌딩 환자 구조 연결!', '자석 줄 결착! 종합병원 헬리패드로 출발!');
      }
      if (missionData.patientDelivered && !lastPatientDeliveredRef.current) {
        showPraise('🎖️', '소중한 생명 구조 성공!', '종합병원 응급실 이송 완료! 최고!');
      }
      lastPatientPickedRef.current = missionData.patientPickedUp;
      lastPatientDeliveredRef.current = missionData.patientDelivered;
    }

    if (stage.type === 'AI_RACING') {
      if (missionData.currentLap > lastLapRef.current) {
        const isLeader = telemetry.raceRank === 1;
        showPraise(
          isLeader ? '🏆' : '🔥',
          isLeader ? '1바퀴 1등 통과!' : '1바퀴 완주! 맹추격 중!',
          isLeader ? '이 기세로 1등 우승하자!' : '조금만 더 속도를 내보세요!'
        );
      }
      lastLapRef.current = missionData.currentLap;
    }

    if (stage.type === 'FREE_FLIGHT') {
      if (telemetry.altitudeM >= 16 && !highAltNotifiedRef.current) {
        highAltNotifiedRef.current = true;
        showPraise('☁️', '구름 위 고도 16m 돌파!', '하늘 높이 날아올랐어요!');
      }
    }
  }, [
    missionData.coinsCollected,
    missionData.currentRing,
    missionData.patientPickedUp,
    missionData.patientDelivered,
    missionData.currentLap,
    stage.type,
    stage.id,
    telemetry.raceRank,
    telemetry.altitudeM
  ]);

  // Render Compact Stage-Specific Goal Text with Smooth Progress Gauge Bar
  const renderGoalContent = () => {
    if (stage.id === 'tutorial-1') {
      let progressPct = 0;
      let barColor = 'bg-gradient-to-r from-cyan-400 to-blue-500';

      if (step === 1) {
        progressPct = Math.min(100, Math.max(0, (telemetry.altitudeM / 2.0) * 100));
        barColor = 'bg-gradient-to-r from-cyan-400 to-blue-500';
      } else if (step === 2) {
        progressPct = Math.min(100, Math.max(0, ((3.0 - hoverTimer) / 3.0) * 100));
        barColor = isHoveringValid 
          ? 'bg-gradient-to-r from-emerald-400 to-teal-400' 
          : 'bg-gradient-to-r from-amber-400 to-yellow-500';
      } else if (step === 3) {
        progressPct = Math.min(100, Math.max(0, ((2.5 - moveTimer) / 2.5) * 100));
        barColor = 'bg-gradient-to-r from-emerald-400 to-sky-400';
      } else if (step === 4) {
        progressPct = Math.min(100, Math.max(0, (1 - telemetry.altitudeM / 2.0) * 100));
        barColor = 'bg-gradient-to-r from-amber-400 to-yellow-400';
      }

      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            {step === 1 && (
              <>
                <span className="font-black text-cyan-300 truncate">
                  🛫 1단계: 왼쪽 스틱을 올려 이륙하세요!
                </span>
                <span className="font-mono font-bold text-white bg-slate-800/90 px-2 py-0.5 rounded text-[11px] shrink-0 border border-slate-700">
                  {telemetry.altitudeM.toFixed(1)}m / 2.0m
                </span>
              </>
            )}
            {step === 2 && (
              <>
                <span className="font-black text-amber-300 truncate">
                  ✨ 2단계: 손을 떼고 3초간 가만히 멈추기!
                </span>
                <span className="font-mono font-bold text-amber-300 bg-slate-800/90 px-2 py-0.5 rounded text-[11px] shrink-0 border border-slate-700">
                  {hoverTimer.toFixed(1)}s 남음
                </span>
              </>
            )}
            {step === 3 && (
              <>
                <span className="font-black text-emerald-300 truncate">
                  🚀 3단계: 오른쪽 스틱으로 이동하기!
                </span>
                <span className="font-mono font-bold text-emerald-300 bg-slate-800/90 px-2 py-0.5 rounded text-[11px] shrink-0 border border-slate-700">
                  {moveTimer.toFixed(1)}s
                </span>
              </>
            )}
            {step === 4 && (
              <>
                <span className="font-black text-yellow-300 truncate">
                  🛬 4단계: 노란 착륙장에 사뿐히 앉기!
                </span>
                <span className="font-mono font-bold text-yellow-300 bg-slate-800/90 px-2 py-0.5 rounded text-[11px] shrink-0 border border-slate-700">
                  고도 {telemetry.altitudeM.toFixed(1)}m
                </span>
              </>
            )}
          </div>

          {/* Dynamic Progress Gauge */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/10">
            <div 
              className={`h-full ${barColor} transition-all duration-150`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      );
    }

    if (stage.id === 'tutorial-2') {
      const ring = missionData.currentRing;
      const progressPct = Math.min(100, Math.max(0, ((Math.min(3, ring - 1)) / 3) * 100));
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-black text-cyan-300 truncate">
              {ring === 1 && '🔴 1단계: 1번 마커로 비행하세요!'}
              {ring === 2 && '🔴 2단계: 2번 마커로 비행하세요!'}
              {ring === 3 && '🌀 3단계: 회전 장애물 게이트 통과!'}
              {ring > 3 && '🛬 4단계: 노란 출발 착륙장으로 복귀!'}
            </span>
            <span className="font-mono font-bold text-white bg-slate-800/90 px-2 py-0.5 rounded text-[11px] shrink-0 border border-slate-700">
              {Math.min(3, ring - 1)}/3
            </span>
          </div>

          {/* Dynamic Progress Gauge */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      );
    }

    if (stage.type === 'COIN_HUNT') {
      const progressPct = missionData.totalCoins > 0 
        ? Math.min(100, Math.max(0, (missionData.coinsCollected / missionData.totalCoins) * 100))
        : 0;
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-black text-amber-300 flex items-center gap-1.5 truncate">
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
              <span>황금 동전 모으기 (공원/분수대 탐색)</span>
            </span>
            <span className="font-mono font-bold text-amber-300 bg-slate-800/90 px-2 py-0.5 rounded text-[11px] shrink-0 border border-amber-500/40">
              {missionData.coinsCollected}/{missionData.totalCoins}
            </span>
          </div>

          {/* Dynamic Progress Gauge */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      );
    }

    if (stage.type === 'RING_RACE') {
      const ring = missionData.currentRing;
      const total = missionData.totalRings;
      const progressPct = total > 0 
        ? Math.min(100, Math.max(0, ((Math.min(total, ring - 1)) / total) * 100))
        : 0;
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-black text-rose-300 flex items-center gap-1.5 truncate">
              <Target className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                {ring === 1 && '1번 국회의사당 잔디광장 진입'}
                {ring === 2 && '2번 국회의사당 분수대 관통'}
                {ring === 3 && '3번 알파 빌딩 비밀 터널 관통'}
                {ring === 4 && '4번 높은 공중 구름다리'}
                {ring === 5 && '5번 감마 타워 관통 게이트'}
                {ring >= 6 && '🏁 6번 피니시 결승선 골인!'}
              </span>
            </span>
            <span className="font-mono font-bold text-rose-300 bg-slate-800/90 px-2 py-0.5 rounded text-[11px] shrink-0 border border-rose-500/40">
              {Math.min(total, ring)}/{total} 링
            </span>
          </div>

          {/* Dynamic Progress Gauge */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-rose-400 via-purple-500 to-cyan-400 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      );
    }

    if (stage.type === 'RESCUE') {
      const picked = missionData.patientPickedUp;
      const delivered = missionData.patientDelivered;
      const progressPct = delivered ? 100 : picked ? 65 : 25;
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-black text-rose-300 flex items-center gap-1.5 truncate">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
              <span>
                {!picked && '1단계: 63빌딩 옥상 환자 위로 날아가 자석 연결'}
                {picked && !delivered && '2단계: 종합병원 옥상 헬리패드로 안전 이송'}
                {delivered && '🎉 환자 이송 완료! 생명을 구했어요!'}
              </span>
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 border ${
              delivered ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' :
              picked ? 'bg-sky-500/20 text-sky-300 border-sky-400/40' :
              'bg-rose-500/20 text-rose-300 border-rose-400/40'
            }`}>
              {delivered ? '완료' : picked ? '이송 중' : '접근 필요'}
            </span>
          </div>

          {/* Dynamic Progress Gauge */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-rose-500 via-sky-400 to-emerald-400 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      );
    }

    if (stage.type === 'AI_RACING') {
      const isLeader = telemetry.raceRank === 1;
      const progressPct = missionData.totalLaps > 0 
        ? Math.min(100, Math.max(0, (missionData.currentLap / missionData.totalLaps) * 100))
        : 0;
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-black text-purple-300 flex items-center gap-1.5 truncate">
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>로봇 드론 레이스 {isLeader ? '🥇 1등 질주!' : '🥈 2등 맹추격!'}</span>
            </span>
            <span className="font-mono font-bold text-white bg-slate-800/90 px-2 py-0.5 rounded text-[11px] shrink-0 border border-slate-700">
              {missionData.currentLap}/{missionData.totalLaps} 랩
            </span>
          </div>

          {/* Dynamic Progress Gauge */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-amber-400 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      );
    }

    const altitudePct = Math.min(100, Math.max(0, (telemetry.altitudeM / 20) * 100));
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-black text-cyan-300 flex items-center gap-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>자유 비행 놀이터 (C키: 1인칭 카메라)</span>
          </span>
          <span className="font-mono font-bold text-white bg-slate-800/90 px-2 py-0.5 rounded text-[11px] shrink-0 border border-slate-700">
            고도 {telemetry.altitudeM.toFixed(1)}m
          </span>
        </div>

        {/* Dynamic Progress Gauge */}
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/10">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 transition-all duration-200"
            style={{ width: `${altitudePct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Floating Praise Badge (Zero Click Obstruction, Auto-Fade) */}
      {praiseToast && (
        <div 
          key={praiseToast.id}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all animate-bounce"
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.5)] backdrop-blur-xs text-white">
            <span className="text-base">{praiseToast.emoji}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-300">{praiseToast.title}</span>
              <span className="text-[11px] text-slate-300 font-bold hidden sm:inline">{praiseToast.subtitle}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Compact, Non-Obstructive Mission Bar (Placed at Bottom Center or Top Center) */}
      <div 
        className={`fixed z-20 pointer-events-auto transition-all ${
          position === 'bottom' 
            ? 'bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-sm sm:max-w-md' 
            : 'top-12 left-1/2 -translate-x-1/2 w-[92%] max-w-sm sm:max-w-md'
        }`}
      >
        <div className="bg-slate-950/85 hover:bg-slate-950/95 border border-cyan-400/40 hover:border-cyan-400/70 rounded-2xl px-3 py-2 shadow-lg backdrop-blur-xs transition-all text-white">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 border-b border-slate-800/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-2 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-black shrink-0">
                {stage.title}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                {position === 'bottom' ? '하단 미션창' : '상단 미션창'}
              </span>
            </div>

            {/* Controls: Skip Tutorial 1 Step + Move Up/Down + Collapse */}
            <div className="flex items-center gap-1 shrink-0">
              {stage.id === 'tutorial-1' && onStepComplete && (
                <button
                  onClick={() => onStepComplete(step)}
                  className="text-[10px] font-black text-white bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded-lg border border-white/20 cursor-pointer shadow-xs active:scale-95 transition-transform flex items-center gap-0.5"
                  title="다음 단계로 바로 이동"
                >
                  <span>{step < 4 ? '다음' : '완료'}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              )}

              {/* Position Switcher: Top <-> Bottom */}
              <button
                onClick={() => setPosition(prev => prev === 'bottom' ? 'top' : 'bottom')}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/70 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
                title={position === 'bottom' ? '화면 위로 이동' : '화면 아래로 이동'}
              >
                <MoveVertical className="w-3 h-3" />
              </button>

              {/* Collapse / Expand Toggle */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/70 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
                title={isCollapsed ? '미션 내용 펼치기' : '미션 내용 접기'}
              >
                {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Body Content */}
          {!isCollapsed && (
            <div className="pt-0.5">
              {renderGoalContent()}
            </div>
          )}
        </div>
      </div>
    </>
  );
});
