import { MissionStage, DroneSkin, UserPilotProfile, MissionProgress } from '../types';

export const DRONE_SKINS: DroneSkin[] = [
  {
    id: 'skin-default',
    name: '스카이 프로브 X-4',
    modelType: 'QUAD_PROBE',
    modelTypeName: '정밀 4로터 쿼드콥터',
    primaryColor: '#0284c7', // Sky blue
    secondaryColor: '#38bdf8',
    propColor: '#ffffff',
    ledColor: '#38bdf8',
    glowColor: '#0ea5e9',
    unlockedByDefault: true,
    requiredStars: 0,
    description: '안정적인 비행과 360도 원형 닥트 가드를 장착한 밸런스형 정밀 쿼드콥터',
    stats: { topSpeed: 3, agility: 4, stability: 5 }
  },
  {
    id: 'skin-fire-rescue',
    name: '골든 엠버 119 헥사',
    modelType: 'HEXA_RESCUE',
    modelTypeName: '6로터 대형 구조용 헥사콥터',
    primaryColor: '#dc2626', // Red
    secondaryColor: '#f97316',
    propColor: '#fef08a',
    ledColor: '#ef4444',
    glowColor: '#f87171',
    unlockedByDefault: true,
    requiredStars: 0,
    description: '6개의 강력한 독립 모터와 상단 긴급 경광등, 야간 수색 탐조등을 갖춘 중구조 헥사 기체',
    stats: { topSpeed: 4, agility: 3, stability: 5 }
  },
  {
    id: 'skin-bumblebee',
    name: '범블비 트윈붐 레이서',
    modelType: 'TWIN_RACER',
    modelTypeName: '초경량 에어로 레이싱 드론',
    primaryColor: '#eab308', // Yellow
    secondaryColor: '#1e293b',
    propColor: '#0f172a',
    ledColor: '#facc15',
    glowColor: '#fef08a',
    unlockedByDefault: true,
    requiredStars: 0,
    description: '전방 카나드 윙과 날렵한 쐐기형 카본 섀시로 폭발적인 직선 가속도를 자랑하는 스피드 머신',
    stats: { topSpeed: 5, agility: 5, stability: 3 }
  },
  {
    id: 'skin-emerald',
    name: '에메랄드 옥타 익스플로러',
    modelType: 'OCTA_EXPLORER',
    modelTypeName: '8로터 동축 수송 옥타콥터',
    primaryColor: '#059669', // Emerald
    secondaryColor: '#34d399',
    propColor: '#ecfdf5',
    ledColor: '#10b981',
    glowColor: '#6ee7b7',
    unlockedByDefault: true,
    requiredStars: 0,
    description: '4개 암에 상하 8개의 역회전 로터를 장착해 거센 바람에도 흔들림 없는 고하중 탐험용 기체',
    stats: { topSpeed: 3, agility: 3, stability: 5 }
  },
  {
    id: 'skin-neon-cyber',
    name: '사이버 제트 퓨처 쿼드',
    modelType: 'CYBER_JET',
    modelTypeName: '플라즈마 부스터 사이버 윙',
    primaryColor: '#7c3aed', // Purple
    secondaryColor: '#ec4899',
    propColor: '#22d3ee',
    ledColor: '#a855f7',
    glowColor: '#c084fc',
    unlockedByDefault: true,
    requiredStars: 0,
    description: '델타익 사이버 윙과 후방 트윈 플라즈마 제트 노즐이 뿜어내는 환상적인 네온 궤적 기체',
    stats: { topSpeed: 5, agility: 4, stability: 4 }
  },
  {
    id: 'skin-stealth-ace',
    name: '스텔스 팬텀 나이트 윙',
    modelType: 'STEALTH_ACE',
    modelTypeName: '스텔스 다면체 전진익 쿼드',
    primaryColor: '#0f172a', // Dark Navy / Black
    secondaryColor: '#334155',
    propColor: '#38bdf8',
    ledColor: '#00f0ff',
    glowColor: '#38bdf8',
    unlockedByDefault: true,
    requiredStars: 0,
    description: '레이더 반사를 억제하는 각진 다면체 스텔스 바디와 듀얼 수직 꼬리날개를 갖춘 하이엔드 기체',
    stats: { topSpeed: 5, agility: 5, stability: 4 }
  }
];

export const MISSION_STAGES: MissionStage[] = [
  {
    id: 'tutorial-1',
    type: 'TUTORIAL',
    title: '제1단계: 기본 이착륙 & 호버링',
    subtitle: '드론의 첫 비행 시작하기',
    description: '왼쪽 조이스틱을 올려 드론을 3m 고도로 이륙시키고 3초간 제자리에 멈춘 뒤(호버링), 노란색 패드에 부드럽게 착륙해보세요!',
    difficulty: '쉬움',
    badgeIcon: 'Sparkles',
    targetCount: 3,
    timeLimitSec: 90,
    starThresholds: [25, 45, 80],
    objectives: [
      '고도 2m 이상으로 안전하게 이륙하기',
      '제자리에서 3초 동안 호버링(정지비행) 유지',
      '노란색 베이스 패드에 부드럽게 착륙하기'
    ]
  },
  {
    id: 'tutorial-2',
    type: 'TUTORIAL',
    title: '제2단계: 방향 전환 & 선회 복귀',
    subtitle: '빨간색 깜빡이 링을 따라 180도 선회 복귀',
    description: '빨간색으로 깜빡이는 1번, 2번 마커를 차례로 통과한 후, 기수를 180도 돌려 출발 베이스 방향의 3번 마커로 다시 돌아오세요!',
    difficulty: '쉬움',
    badgeIcon: 'Compass',
    targetCount: 3,
    timeLimitSec: 90,
    starThresholds: [30, 50, 85],
    objectives: [
      '빨간색으로 깜빡이는 1번 직진 마커 통과하기',
      '좌측으로 선회하여 깜빡이는 2번 코너 마커 통과',
      '★ 기수를 180도 돌려 출발 게이트(3번)로 복귀 통과하기'
    ]
  },
  {
    id: 'coin-hunt-1',
    type: 'COIN_HUNT',
    title: '제3단계: 공원 황금 코인 사냥',
    subtitle: '반짝이는 진짜 황금 코인 8개 수집',
    description: '공원 광장 주변에 흩어져 있는 눈부시게 반짝이는 황금빛 코인 8개를 부드러운 코너링과 고도 조절로 신속하게 수집하세요!',
    difficulty: '쉬움',
    badgeIcon: 'Coins',
    targetCount: 8,
    timeLimitSec: 120,
    starThresholds: [40, 65, 95],
    objectives: [
      '공원 광장 주변의 반짝이는 황금 코인 8개 수집',
      '장애물 충돌 없이 안전 비행 유지',
      '빠른 랩타임으로 골드 스타 달성'
    ]
  },
  {
    id: 'ring-race-1',
    type: 'RING_RACE',
    title: '제4단계: 초고층 빌딩 관통 터널 비행',
    subtitle: '빨간색 깜빡이는 건물 통로와 스카이브릿지 관통 코스',
    description: '내가 통과해야 하는 건물 통로에 강렬한 빨간색 깜빡임 효과와 유도 빔이 표시됩니다. 링 없이 빌딩 중앙에 뚫린 관통 터널과 스카이브릿지를 멋지게 꿰뚫고 통과하세요!',
    difficulty: '보통',
    badgeIcon: 'Building',
    targetCount: 5,
    timeLimitSec: 100,
    starThresholds: [40, 65, 95],
    objectives: [
      '빨간색으로 깜빡이는 1번 중앙광장 네온 아치 관통',
      '알파/감마 빌딩 공중 관통 터널 및 스카이브릿지 통과',
      '피니시 네온 게이트를 통과하여 미션 완료'
    ]
  },
  {
    id: 'rescue-mission-1',
    type: 'RESCUE',
    title: '제5단계: 응급 환자 구조 & 병원 수술실 이송',
    subtitle: '옥상 조난 환자 구조 및 24시 병원 헬리패드 착륙',
    description: '건물 옥상에 쓰러져 있는 응급 환자 들것을 자석 견인선으로 연결한 뒤, 24시 대학병원 옥상 헬리패드로 이송하세요! 대기 중인 의료진이 환자를 신속히 수술실로 이송합니다.',
    difficulty: '보통',
    badgeIcon: 'HeartPulse',
    targetCount: 2,
    timeLimitSec: 120,
    starThresholds: [45, 75, 110],
    objectives: [
      '옥상의 응급 환자 들것 상공으로 접근하여 견인 연결',
      '환자를 안전하게 매달고 대학병원 옥상으로 비행',
      '병원 헬리패드에 착륙하여 대기 중인 의료진에게 인계'
    ]
  },
  {
    id: 'ai-racing-1',
    type: 'AI_RACING',
    title: '제6단계: AI 라이벌 그랑프리 서킷 레이스',
    subtitle: '공정 규격 스포츠 모드(2단) 고정 2바퀴 박진감 대결',
    description: '아스팔트 트랙, 연석, 관람석이 갖춰진 그랑프리 서킷에서 AI 라이벌 드론과 2바퀴 스피드 대결을 펼치세요! 공정한 대결을 위해 AI와 플레이어 드론 모두 2단 스포츠 모드로 고정됩니다.',
    difficulty: '보통',
    badgeIcon: 'Trophy',
    targetCount: 2, // 2 laps
    timeLimitSec: 120,
    starThresholds: [50, 70, 95],
    objectives: [
      '★ 2단 스포츠 모드 단일 규격 레이스 완주',
      '서킷 트랙 게이트를 따라 2바퀴 완주',
      '스마트 AI 라이벌보다 먼저 결승선 통과 (우승)'
    ]
  },
  {
    id: 'free-flight',
    type: 'FREE_FLIGHT',
    title: '자유 비행 & 장애물 놀이터',
    subtitle: '시간 제한 없는 자유 연습',
    description: '시간 제한이나 미션 부담 없이 3D 로우폴리 빌리지 전체를 자유롭게 탐험하며 비행 감각을 마음껏 훈련해보세요.',
    difficulty: '쉬움',
    badgeIcon: 'Plane',
    targetCount: 0,
    timeLimitSec: 0,
    starThresholds: [0, 0, 0],
    objectives: [
      '마음껏 3D 월드 탐험하기',
      '비행 보조 모드 On/Off 전환 시험',
      '다양한 카메라 뷰(1인칭 FPV 등) 체험'
    ]
  }
];

const STORAGE_KEY = 'probe_drone_simulator_v1';

export function getInitialProgress(): Record<string, MissionProgress> {
  const progress: Record<string, MissionProgress> = {};
  MISSION_STAGES.forEach((stage) => {
    progress[stage.id] = {
      unlocked: true, // All stages unlocked by default for immediate access
      completed: false,
      bestTimeSec: null,
      highScore: 0,
      stars: 0
    };
  });
  return progress;
}

export function getDefaultProfile(): UserPilotProfile {
  return {
    pilotName: '주니어 조종사',
    callsign: 'EAGLE-01',
    avatarSeed: 'pilot-1',
    totalFlightTimeSec: 0,
    totalMissionsCompleted: 0,
    totalCoinsCollected: 0,
    totalRingsPassed: 0,
    totalPatientsRescued: 0,
    totalRacesWon: 0,
    selectedSkinId: 'skin-default',
    assistLevel: 'BEGINNER',
    soundEnabled: true,
    voiceGuideEnabled: true,
    sensitivity: 0.7, // Fixed 0.7 flight sensitivity
    invertPitch: false,
    missionProgress: getInitialProgress(),
    achievements: ['first_boot']
  };
}

export function loadUserProfile(): UserPilotProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultProfile();
    const parsed = JSON.parse(raw);
    const def = getDefaultProfile();
    const loadedProgress = parsed.missionProgress || {};
    
    // Ensure all stages exist and are all UNLOCKED by default
    const mergedProgress: Record<string, MissionProgress> = {};
    MISSION_STAGES.forEach(stage => {
      mergedProgress[stage.id] = {
        unlocked: true, // All stages unlocked
        completed: loadedProgress[stage.id]?.completed || false,
        bestTimeSec: loadedProgress[stage.id]?.bestTimeSec ?? null,
        highScore: loadedProgress[stage.id]?.highScore || 0,
        stars: loadedProgress[stage.id]?.stars || 0
      };
    });

    return {
      ...def,
      ...parsed,
      sensitivity: 0.7, // Enforce locked 0.7 sensitivity
      missionProgress: mergedProgress
    };
  } catch {
    return getDefaultProfile();
  }
}

export function saveUserProfile(profile: UserPilotProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // quota or privacy mode fallback
  }
}

export function calculateTotalStars(profile: UserPilotProfile): number {
  return Object.values(profile.missionProgress).reduce((acc, curr) => acc + (curr.stars || 0), 0);
}

export function getPilotRank(stars: number): { title: string; badge: string; color: string } {
  if (stars >= 15) return { title: '마스터 에이스 파일럿', badge: '👑', color: 'text-amber-500' };
  if (stars >= 10) return { title: '베테랑 비행사', badge: '🎖️', color: 'text-indigo-500' };
  if (stars >= 5)  return { title: '주니어 드론 조종사', badge: '⭐', color: 'text-sky-500' };
  return { title: '비행 훈련생', badge: '🌱', color: 'text-emerald-500' };
}
