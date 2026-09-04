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
    title: '제1단계: 기본 이착륙 & 제자리 멈추기',
    subtitle: '하늘로 슝! 멈추기 & 사뿐 착륙',
    description: '왼쪽 조이스틱을 살짝 올려 하늘로 날아오른 뒤, 공중에서 3초 동안 얌전히 멈춰 서 있다가(호버링) 노란색 착륙장에 사뿐히 내려앉아 보세요!',
    difficulty: '쉬움',
    badgeIcon: 'Sparkles',
    targetCount: 3,
    timeLimitSec: 120,
    starThresholds: [2200, 1600, 1000], // [★★★ 2,200점, ★★ 1,600점, ★ 1,000점]
    flightTheory: '날개 바람(양력)과 지구가 당기는 힘(중력)',
    educationTip: '선풍기 바람을 아래로 쏘면 손이 위로 밀려나는 것처럼, 드론 날개 4개가 쌩쌩 돌며 바람을 아래로 밀어내서 위로 떠올라요! 날개 힘과 지구가 당기는 힘이 똑같아지면 공중에 마법처럼 딱 멈춘답니다.',
    objectives: [
      '하늘로 높이 2m 이상 사뿐히 날아오르기',
      '공중에 가만히 3초 동안 멈춰 있기 (호버링)',
      '노란색 착륙장에 부드럽게 사뿐 착륙하기'
    ]
  },
  {
    id: 'tutorial-2',
    type: 'TUTORIAL',
    title: '제2단계: 코스 장애물 비행 & 안전 착륙',
    subtitle: '깜빡이는 마커 따라가기 & 빙글 장애물 피하기',
    description: '빨간색으로 깜빡이는 마커 길을 따라가며 빙글빙글 도는 장애물을 쏙 피한 뒤, 출발했던 노란색 착륙장에 얌전하게 착륙해 보세요!',
    difficulty: '쉬움',
    badgeIcon: 'Compass',
    targetCount: 3,
    timeLimitSec: 120,
    starThresholds: [2200, 1600, 1000],
    flightTheory: '몸을 앞으로 기울이면 전진해요! (피치 조종)',
    educationTip: '우리가 앞으로 달릴 때 몸을 앞으로 살짝 숙이는 것처럼, 드론도 뒷날개를 더 세게 돌려 앞을 숙이면 앞으로 슝 나아가요! 멈출 때는 뒤로 살짝 기울여 브레이크를 밟아요.',
    objectives: [
      '빨간색으로 깜빡이는 길안내 마커 통과하기',
      '빙글빙글 도는 장애물 2개 안전하게 피하기',
      '★ 출발했던 노란색 착륙장에 안전하게 착륙하기'
    ]
  },
  {
    id: 'coin-hunt-1',
    type: 'COIN_HUNT',
    title: '제3단계: 황금 동전 먹기',
    subtitle: '반짝이는 황금 동전 8개 냠냠 모으기',
    description: '공원에 흩어져 있는 눈부신 황금 동전 8개를 쏙쏙 찾아 먹어보세요! 높이를 잘 맞추고 살살 조종하면 금방 모을 수 있어요.',
    difficulty: '쉬움',
    badgeIcon: 'Coins',
    targetCount: 8,
    timeLimitSec: 150,
    starThresholds: [2600, 1900, 1100],
    flightTheory: '높이를 일정하게 맞추고 살살 조종하기',
    educationTip: '스틱을 너무 팍팍 꺾으면 드론이 휘청거려요! 높이(왼쪽 스틱)를 알맞게 맞춘 다음, 오른쪽 스틱을 톡톡 살짝 건드리듯 조종하면 훨씬 부드럽고 정확하게 동전을 먹을 수 있어요.',
    objectives: [
      '공원에 있는 반짝이는 황금 동전 8개 모두 먹기',
      '건물이나 나무에 부딪히지 않고 안전하게 비행하기',
      '빠르게 완료해서 높은 점수로 별 3개(★★★) 받기'
    ]
  },
  {
    id: 'ring-race-1',
    type: 'RING_RACE',
    title: '제4단계: 국회의사당 & 초고층 빌딩 관통 비행',
    subtitle: '국회의사당 광장 분수대와 빌딩 터널, 구름다리 쏙 꿰뚫기',
    description: '이륙 후 시원하게 펼쳐진 국회의사당 앞 잔디광장과 분수대 상공을 가로질러 날아간 뒤, 초고층 빌딩 속 비밀 터널과 높은 구름다리, 연결 회랑을 멋지게 통과해 보세요! 레이저 불빛이 통과할 길을 친절하게 안내합니다.',
    difficulty: '보통',
    badgeIcon: 'Building',
    targetCount: 9,
    timeLimitSec: 180,
    starThresholds: [2700, 2000, 1200],
    flightTheory: '드론 머리 방향을 터널 한가운데로 똑바로 정렬하기',
    educationTip: '국회의사당 분수대 앞과 좁은 빌딩 터널을 지날 때는 시선을 출구 한가운데에 딱 맞추고, 드론 머리를 똑바로 정렬해야 부딪히지 않고 쏙 빠져나갈 수 있어요!',
    objectives: [
      '국회의사당 잔디광장 및 분수대 앞 게이트 통과하기',
      '알파 빌딩 비밀 터널과 높은 구름다리, 감마 타워 관통하기',
      '연결 회랑과 수변 아치를 거쳐 마지막 피니시 골인 게이트 완주하기'
    ]
  },
  {
    id: 'rescue-mission-1',
    type: 'RESCUE',
    title: '제5단계: 63빌딩 응급 환자 구조 & 응급실 긴급 이송',
    subtitle: '63빌딩 옥상 조난 환자 구조 후 병원 헬리패드로 이송',
    description: '황금빛 63빌딩 옥상에 있는 아픈 환자의 들것에 자석 줄을 찰칵 연결한 뒤, 24시 종합병원 옥상 헬리패드로 안전하게 싣고 날아가세요! 의사 선생님들이 기다리고 있어요.',
    difficulty: '보통',
    badgeIcon: 'HeartPulse',
    targetCount: 2,
    timeLimitSec: 180,
    starThresholds: [2400, 1800, 1100],
    flightTheory: '무거운 짐을 들었을 때는 미리미리 브레이크!',
    educationTip: '가방이 무거울 때 갑자기 멈추기 힘든 것처럼, 무거운 들것을 매달면 드론이 멈추는 데 시간이 더 걸려요. 63빌딩에서 환자를 싣고 병원 착륙장에 올 때 미리 속도를 줄여야 안전하게 내릴 수 있어요!',
    objectives: [
      '63빌딩 옥상에 있는 환자 들것 위로 날아가 자석 줄 연결하기',
      '환자가 떨어지지 않게 조심조심 종합병원 옥상으로 날아가기',
      '병원 헬리패드 착륙장에 무사히 착륙하여 구조 완료하기'
    ]
  },
  {
    id: 'ai-racing-1',
    type: 'AI_RACING',
    title: '제6단계: AI 라이벌 서킷 레이스 [Level 1]',
    subtitle: '스피드 그랑프리 서킷: 8개 게이트 & 황금 보너스 코인 2바퀴 레이스',
    description: '탁 트인 도심 메인 대로와 수변 광장을 고속 질주하는 박진감 만점 서킷! 최적의 레이싱 라인에 놓인 황금 코인을 획득하며 루키 AI 드론보다 먼저 2바퀴를 완주해보세요.',
    difficulty: '쉬움',
    badgeIcon: 'Trophy',
    targetCount: 2, // 2 laps
    timeLimitSec: 150,
    starThresholds: [2600, 1900, 1200],
    flightTheory: '왼쪽/오른쪽으로 몸 돌리기 (요 회전 원리)',
    educationTip: '드론의 날개 4개는 2개씩 서로 반대 방향으로 돌아요! 한쪽 날개를 더 빠르게 돌리면 회전하는 힘이 생겨서 드론이 제자리에서 뱅글 돌 수 있답니다.',
    objectives: [
      '★ 2단 스포츠 스피드로 신나게 달리기',
      '탁 트인 8개 게이트 서킷 2바퀴 완주하기',
      '트랙 중간 황금 코인을 획득하며 AI 라이벌 제치기'
    ],
    aiDifficulty: 'LEVEL_1'
  },
  {
    id: 'ai-racing-2',
    type: 'AI_RACING',
    title: '제6단계: AI 라이벌 서킷 레이스 [Level 2]',
    subtitle: '스피드 그랑프리 서킷: 프로 에이스 로봇과 2바퀴 챔피언 대결',
    description: '도심 속을 날카롭게 파고드는 프로 에이스 로봇과의 진검승부! 코너 레이싱 라인의 황금 코인을 모두 챙기며 1등으로 우승해보세요!',
    difficulty: '보통',
    badgeIcon: 'Trophy',
    targetCount: 2, // 2 laps
    timeLimitSec: 130,
    starThresholds: [2700, 2000, 1300],
    flightTheory: '커브를 돌 때 밖으로 튕겨 나가지 않는 방법 (원심력)',
    educationTip: '자전거를 타고 코너를 돌 때 안쪽으로 몸을 기울이는 것처럼, 드론도 코너를 돌 때 몸을 살짝 기울여주면 밖으로 밀려나지 않고 훨씬 빠르게 슝 돌 수 있어요!',
    objectives: [
      '★ 2단 스포츠 스피드로 신나게 달리기',
      '탁 트인 8개 게이트 서킷 2바퀴 연속 통과하기',
      '트랙 위 황금 코인을 모으며 프로 AI 제치고 우승(1등)하기'
    ],
    aiDifficulty: 'LEVEL_2'
  },
  {
    id: 'free-flight',
    type: 'FREE_FLIGHT',
    title: '자유 비행 & 장애물 놀이터',
    subtitle: '신나는 3D 미래도시 마음껏 날아다니기',
    description: '시간제한 없이 내 마음대로 높은 빌딩 사이도 날고, 공원도 구경하고, 카메라 시점도 바꿔보며 신나게 놀아보세요!',
    difficulty: '쉬움',
    badgeIcon: 'Plane',
    targetCount: 0,
    timeLimitSec: 0,
    starThresholds: [0, 0, 0],
    flightTheory: '위험할 땐 손을 놓으면 스스로 균형을 잡아요!',
    educationTip: '비행하다가 방향을 잃거나 어지러울 때는 조이스틱에서 손을 떼세요! 드론이 스스로 수평을 잡고 안전하게 멈춘답니다.',
    objectives: [
      '미래 도시 하늘을 마음껏 날아다니며 구경하기',
      '1단, 2단, 3단 속도 버튼을 눌러 속도 조절해보기',
      '카메라 버튼을 눌러 조종석 시점(1인칭) 체험해보기'
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
  return { title: '주니어 조종사', badge: '🛸', color: 'text-cyan-400' };
}
