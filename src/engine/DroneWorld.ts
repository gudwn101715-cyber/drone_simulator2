import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { 
  DroneControlInput, 
  DroneTelemetry, 
  AssistLevel, 
  CameraView, 
  MissionStage, 
  DroneSkin, 
  RingGate, 
  CoinItem, 
  RescueTarget, 
  AiRacerState,
  SpeedGear,
  CustomGLTFModel,
  GraphicsAtmospherePreset
} from '../types';
import { soundManager } from '../utils/audio';
import { CityNavGraph } from './cityNavGraph';

function getPointAlongPolyline(points: THREE.Vector3[], progress: number): THREE.Vector3 {
  if (points.length === 0) return new THREE.Vector3();
  if (points.length === 1) return points[0].clone();
  if (progress <= 0) return points[0].clone();
  if (progress >= 1) return points[points.length - 1].clone();

  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const l = points[i].distanceTo(points[i + 1]);
    segLens.push(l);
    totalLen += l;
  }

  if (totalLen <= 0.001) return points[0].clone();

  const targetDist = progress * totalLen;
  let accumulated = 0;

  for (let i = 0; i < segLens.length; i++) {
    const nextAcc = accumulated + segLens[i];
    if (targetDist <= nextAcc || i === segLens.length - 1) {
      const segRatio = segLens[i] > 0 ? (targetDist - accumulated) / segLens[i] : 0;
      return points[i].clone().lerp(points[i + 1], Math.max(0, Math.min(1, segRatio)));
    }
    accumulated = nextAcc;
  }

  return points[points.length - 1].clone();
}

function getSmoothSplinePoint(waypoints: THREE.Vector3[], t: number): THREE.Vector3 {
  if (waypoints.length === 0) return new THREE.Vector3();
  if (waypoints.length === 1) return waypoints[0].clone();
  if (waypoints.length === 2) return waypoints[0].clone().lerp(waypoints[1], t);

  try {
    const curve = new THREE.CatmullRomCurve3(waypoints, false, 'centripetal', 0.25);
    return curve.getPoint(Math.max(0, Math.min(1, t)));
  } catch {
    return getPointAlongPolyline(waypoints, t);
  }
}

function createSignBoardMesh(text: string, isEntrance: boolean, width = 6.8, height = 1.3): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // High contrast backdrop
    ctx.fillStyle = isEntrance ? 'rgba(6, 78, 59, 0.95)' : 'rgba(120, 53, 15, 0.95)';
    ctx.fillRect(0, 0, 512, 128);

    // High contrast outer border
    ctx.lineWidth = 10;
    ctx.strokeStyle = isEntrance ? '#10b981' : '#f59e0b';
    ctx.strokeRect(5, 5, 502, 118);

    // Inner frame
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(12, 12, 488, 104);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = isEntrance ? '#34d399' : '#fbbf24';
    ctx.shadowBlur = 12;
    ctx.fillText(text, 256, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geo, mat);
}

function createKoreanStoreSignMesh(
  brand:
    | 'OLIVE_YOUNG'
    | 'MUSINSA'
    | 'KAKAO_FRIENDS'
    | 'NAVER'
    | 'STARBUCKS'
    | 'BAEMIN'
    | 'CU'
    | 'GS25'
    | 'DAISO'
    | 'TOSS'
    | 'COUPANG'
    | 'MEGA_COFFEE'
    | 'NEXON'
    | 'NETMARBLE'
    | 'KRAFTON'
    | 'NCSOFT'
    | 'SMILEGATE'
    | 'PEARLABYSS'
    | 'SAMSUNG'
    | 'LG'
    | 'SK'
    | 'HYUNDAI'
    | 'HANWHA'
    | 'KB'
    | 'SHINHAN'
    | 'HANA'
    | 'WOORI'
    | 'KRX'
    | 'MIRAE_ASSET'
    | 'NH_INVEST'
    | 'DANGGEUN'
    | 'LINE'
    | 'CJ'
    | 'KAKAO',
  width = 12.0,
  height = 5.0
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (brand === 'OLIVE_YOUNG') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(0, 0, 512, 42);

      ctx.strokeStyle = '#84cc16';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(28, 58, 175, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HEALTH & BEAUTY', 115, 82);

      ctx.fillStyle = '#1e293b';
      ctx.font = '900 40px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('OLIVE YOUNG', 28, 142);

      ctx.fillStyle = '#65a30d';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('올리브영 플래그십 스토어 💄', 28, 186);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('K-뷰티 1위 // 메이크업 & 스킨케어 & 드론 배송', 28, 226);
    } else if (brand === 'MUSINSA') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, 496, 240);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MUSINSA', 28, 85);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '700 24px sans-serif';
      ctx.fillText('STANDARD', 28, 122);

      ctx.fillStyle = '#e4e4e7';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('무신사 스탠다드 강남 👟', 28, 170);

      ctx.fillStyle = '#71717a';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('K-FASHION NO.1 // 패션 트렌드 플래그십', 28, 218);
    } else if (brand === 'KAKAO_FRIENDS') {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#3b1d11';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#3b1d11';
      ctx.beginPath();
      ctx.roundRect(28, 24, 190, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OFFICIAL STORE', 123, 48);

      ctx.fillStyle = '#3b1d11';
      ctx.font = '900 38px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('KAKAO FRIENDS', 28, 110);

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('카카오프렌즈 캐릭터 스토어 🦁', 28, 160);

      ctx.fillStyle = '#92400e';
      ctx.font = '700 18px sans-serif';
      ctx.fillText('라이언 & 춘식이 굿즈 // 드론 퀵 픽업존', 28, 208);
    } else if (brand === 'NAVER') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#03c75a';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#03c75a';
      ctx.fillRect(28, 26, 48, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', 52, 63);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('NAVER 1784', 90, 64);

      ctx.fillStyle = '#03c75a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('네이버 미래 로보틱스 사옥 🤖', 28, 130);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('세계 최초 로봇 친화형 스마트 빌딩 & AI 연구소', 28, 175);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 14px monospace';
      ctx.fillText('AUTONOMOUS DRONE DOCK // LIVE CONNECTED', 28, 218);
    } else if (brand === 'NEXON') {
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(28, 24, 175, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEXON KOREA', 115, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('NEXON', 28, 110);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('넥슨 코리아 글로벌 본사 🎮', 28, 158);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('메이플스토리 · 던전앤파이터 · FC온라인 · 카트라이더', 28, 205);
    } else if (brand === 'NETMARBLE') {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(28, 24, 185, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#1c1917';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('G-TOWER SEOUL', 120, 48);

      ctx.fillStyle = '#eab308';
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('netmarble', 28, 112);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('넷마블 지타워 (G-TOWER) 본사 🏢', 28, 160);

      ctx.fillStyle = '#fde047';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('나 혼자만 레벨업 · 세븐나이츠 · 모두의마블', 28, 206);
    } else if (brand === 'KRAFTON') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(28, 24, 190, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PUBG STUDIOS', 123, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('KRAFTON', 28, 110);

      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('크래프톤 배틀그라운드 스튜디오 🪂', 28, 158);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('PUBG: BATTLEGROUNDS · 글로벌 AI 제작 거점', 28, 205);
    } else if (brand === 'NCSOFT') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(28, 24, 180, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NC R&D CENTER', 118, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('NCSOFT', 28, 110);

      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('엔씨소프트 판교 R&D 센터 ⚔️', 28, 158);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('리니지 · 블레이드&소울 · 쓰론 앤 리버티 · AI NLP', 28, 205);
    } else if (brand === 'SMILEGATE') {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#f97316';
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Smilegate', 28, 90);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('스마일게이트 엔터테인먼트 🛡️', 28, 142);

      ctx.fillStyle = '#fdba74';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('로스트아크 · 크로스파이어 · 에픽세븐 글로벌 본부', 28, 188);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '700 14px monospace';
      ctx.fillText('GLOBAL MEGA IP CREATOR // MEGACITY DOCK', 28, 226);
    } else if (brand === 'PEARLABYSS') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, 500, 244);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 40px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('PEARL ABYSS', 28, 90);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('펄어비스 홈원 (Home One) 사옥 🗡️', 28, 142);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('검은사막 · 붉은사막 차세대 블랙스페이스 엔진', 28, 188);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 14px monospace';
      ctx.fillText('PROPRIETARY GAME ENGINE // NEXT-GEN GRAPHICS', 28, 226);
    } else if (brand === 'SAMSUNG') {
      ctx.fillStyle = '#0033a0';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SAMSUNG', 28, 86);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('삼성전자 서초 / 여의도 AI 연구소 📱', 28, 140);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('Galaxy AI · 첨단 반도체 & 초격차 모빌리티 솔루션', 28, 186);

      ctx.fillStyle = '#93c5fd';
      ctx.font = '700 15px monospace';
      ctx.fillText('AI HYPER-COMPUTE HUB // DRONE NETWORK', 28, 226);
    } else if (brand === 'LG') {
      ctx.fillStyle = '#a50034';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('LG Twin Towers', 28, 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('LG전자 & LG에너지솔루션 여의도 본사 ⚡', 28, 140);

      ctx.fillStyle = '#fecdd3';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('차세대 배터리 · 스마트 가전 & ThinQ 클라우드', 28, 185);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 15px monospace';
      ctx.fillText('LIFE\'S GOOD // YEOUIDO GLOBAL HEADQUARTERS', 28, 226);
    } else if (brand === 'SK') {
      ctx.fillStyle = '#be123c';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(0, 195, 512, 61);

      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 8;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SK telecom', 28, 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('SK텔레콤 T타워 AI & 6G 센터 📡', 28, 140);

      ctx.fillStyle = '#fde047';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('글로벌 에이닷 AI · 에어넷 초고속 도심 드론 관제', 28, 182);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px sans-serif';
      ctx.fillText('SK T-TOWER // HYPER CONNECTIVITY', 28, 235);
    } else if (brand === 'HYUNDAI') {
      ctx.fillStyle = '#002c6c';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 46px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HYUNDAI', 28, 85);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('현대자동차 미래 항공 모빌리티 (AAM) 🛸', 28, 140);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('도심 항공 교통 (UAM) · 수소 에너지 & 자율비행 거점', 28, 185);

      ctx.fillStyle = '#7dd3fc';
      ctx.font = '700 15px monospace';
      ctx.fillText('ADVANCED AIR MOBILITY // FLIGHT LAB', 28, 226);
    } else if (brand === 'HANWHA') {
      ctx.fillStyle = '#f97316';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#1e293b';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Hanwha', 28, 85);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('한화에어로스페이스 우주항공 & 63 본사 🚀', 28, 140);

      ctx.fillStyle = '#1e293b';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('누리호 발사체 · 우주 탐사 & K-방산 글로벌 리더', 28, 185);

      ctx.fillStyle = '#431407';
      ctx.font = '700 15px monospace';
      ctx.fillText('SPACE & AEROSPACE SUPREMACY // 63 SQUARE', 28, 226);
    } else if (brand === 'KB') {
      ctx.fillStyle = '#2d2d2d';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.roundRect(28, 24, 180, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KB FINANCIAL', 118, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('KB국민은행', 28, 110);

      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('KB국민은행 여의도 본점 신관 🏦', 28, 160);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('대한민국 No.1 금융 플랫폼 · KB스타뱅킹 금융타워', 28, 206);
    } else if (brand === 'SHINHAN') {
      ctx.fillStyle = '#0046ff';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SHINHAN', 28, 85);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('신한투자증권 여의도 금융타워 📈', 28, 140);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('디지털 금융 리딩뱅크 · 글로벌 자산운용 및 IB 허브', 28, 185);

      ctx.fillStyle = '#bfdbfe';
      ctx.font = '700 15px monospace';
      ctx.fillText('SHINHAN FINANCIAL TOWER // YEOUIDO HUB', 28, 226);
    } else if (brand === 'HANA') {
      ctx.fillStyle = '#008485';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Hana Financial', 28, 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('하나금융그룹 글로벌 본사 타워 🪙', 28, 140);

      ctx.fillStyle = '#ccfbf1';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('모두의 기쁨, 그 하나를 위하여 · 하나원큐 테크센터', 28, 185);

      ctx.fillStyle = '#99f6e4';
      ctx.font = '700 15px monospace';
      ctx.fillText('GLOBAL ASSET MANAGEMENT // FINTECH LAB', 28, 226);
    } else if (brand === 'WOORI') {
      ctx.fillStyle = '#007bc3';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Woori Financial', 28, 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('우리금융그룹 여의도 금융센터 🏛️', 28, 140);

      ctx.fillStyle = '#e0f2fe';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('우리WON뱅킹 · 차세대 기업금융 & 디지털 자산 관리', 28, 185);

      ctx.fillStyle = '#bae6fd';
      ctx.font = '700 15px monospace';
      ctx.fillText('WOORI DIGITAL FINANCE // INVESTMENT HUB', 28, 226);
    } else if (brand === 'KRX') {
      ctx.fillStyle = '#0f2b48';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('KRX 한국거래소', 28, 85);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('한국거래소 (KRX) 여의도 본부 📊', 28, 140);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('코스피 & 코스닥 글로벌 금융 파생 시장 메인 엔진', 28, 185);

      ctx.fillStyle = '#7dd3fc';
      ctx.font = '700 15px monospace';
      ctx.fillText('KOREA CAPITAL MARKET MAIN ENGINE // LIVE TICKER', 28, 226);
    } else if (brand === 'MIRAE_ASSET') {
      ctx.fillStyle = '#f26522';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#002d62';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#002d62';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MIRAE ASSET', 28, 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('미래에셋증권 글로벌 금융타워 🌐', 28, 140);

      ctx.fillStyle = '#002d62';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('열린 마음으로 미래를 개척하는 글로벌 투자 전문가', 28, 185);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = '700 15px monospace';
      ctx.fillText('GLOBAL ASSET ALLOCATION LEADERSHIP // AI TRADING', 28, 226);
    } else if (brand === 'NH_INVEST') {
      ctx.fillStyle = '#009944';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffb81c';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('NH투자증권', 28, 85);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('NH투자증권 파크원 타워 본사 🌲', 28, 140);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('스마트 투자 플랫폼 나무(NAMUH) & 글로벌 IB 본부', 28, 185);

      ctx.fillStyle = '#bbf7d0';
      ctx.font = '700 15px monospace';
      ctx.fillText('PARC.1 HEADQUARTERS // WEALTH MANAGEMENT', 28, 226);
    } else if (brand === 'DANGGEUN') {
      ctx.fillStyle = '#ff6f0f';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('당근 DANGGEUN', 28, 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('당근마켓 테크 & 커뮤니티 본사 🥕', 28, 140);

      ctx.fillStyle = '#fed7aa';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('우리 동네 이웃과의 따뜻한 연결 · 하이퍼로컬 AI 거점', 28, 185);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 15px monospace';
      ctx.fillText('HYPERLOCAL NETWORK & PAY SYSTEM // DRONE DISPATCH', 28, 226);
    } else if (brand === 'LINE') {
      ctx.fillStyle = '#06c755';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('LINE', 28, 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('라인 글로벌 소프트웨어 연구소 💬', 28, 140);

      ctx.fillStyle = '#dcfce7';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('전 세계 2억 명이 사용하는 글로벌 메신저 테크 허브', 28, 185);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 15px monospace';
      ctx.fillText('GLOBAL MOBILE PLATFORM & WEB3 LAB', 28, 226);
    } else if (brand === 'CJ') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#e11d48';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CJ ENM', 28, 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('CJ ENM K-콘텐츠 & 엔터테인먼트 타워 🎬', 28, 140);

      ctx.fillStyle = '#fda4af';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('스튜디오드래곤 · tvN · K-POP 글로벌 문화 메카', 28, 185);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 15px monospace';
      ctx.fillText('GLOBAL CULTURAL EMPOWERMENT // MEDIA LAB', 28, 226);
    } else if (brand === 'KAKAO') {
      ctx.fillStyle = '#fee500';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#191919';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#191919';
      ctx.font = '900 52px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('kakao', 28, 85);

      ctx.fillStyle = '#191919';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('카카오 AI & 플랫폼 본사 타워 💬', 28, 140);

      ctx.fillStyle = '#422006';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('카카오톡 · 카카오페이 · 카카오모빌리티 & AI 어시스턴트', 28, 185);

      ctx.fillStyle = '#78350f';
      ctx.font = '700 15px monospace';
      ctx.fillText('NEXT TECH ECOSYSTEM // AUTONOMOUS CLOUD', 28, 226);
    } else if (brand === 'STARBUCKS') {
      ctx.fillStyle = '#006241';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, 500, 244);

      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.roundRect(28, 24, 180, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#006241';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DRIVE-THRU DT', 118, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('STARBUCKS COFFEE', 28, 108);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('스타벅스 리저브 & 딜리버스 ☕', 28, 158);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('신선한 프리미엄 원두 & 디저트 드론 픽업', 28, 205);
    } else if (brand === 'BAEMIN') {
      ctx.fillStyle = '#2ac1bc';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(28, 24, 160, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#2ac1bc';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('배민 B마트', 108, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('배달의민족', 28, 112);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('도심 초고속 드론 배달 센터 🛵', 28, 162);

      ctx.fillStyle = '#0f172a';
      ctx.font = '700 17px sans-serif';
      ctx.fillText('주문 즉시 10분 내 옥상 패드로 날아갑니다!', 28, 208);
    } else if (brand === 'CU') {
      ctx.fillStyle = '#6b21a8';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, 195, 512, 61);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 8;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CU', 28, 82);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('24시 스마트 무인 편의점 🏪', 28, 130);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('삼각김밥 · 음료 · 스낵 · 무인 픽업', 28, 170);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 20px sans-serif';
      ctx.fillText('NICE TO CU // DRONE DELIVERY', 28, 235);
    } else if (brand === 'GS25') {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(0, 195, 512, 61);

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 8;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('GS25', 28, 82);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('갓생기획 24H 편의점 🍱', 28, 130);

      ctx.fillStyle = '#bae6fd';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('신선 도시락 & 커피 & 생활용품', 28, 170);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 20px sans-serif';
      ctx.fillText('LIFESTYLE PLATFORM GS25', 28, 235);
    } else if (brand === 'DAISO') {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DAISO', 28, 82);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('국민가게 다이소 몰 🛍️', 28, 138);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('천원으로 누리는 행복 // 생활용품 백화점', 28, 182);

      ctx.fillStyle = '#fecaca';
      ctx.font = '700 15px monospace';
      ctx.fillText('FLOOR 1F~5F // MEGA FLAGSHIP', 28, 225);
    } else if (brand === 'TOSS') {
      ctx.fillStyle = '#0064ff';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('toss', 28, 85);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('토스 뱅크 & 토스증권 💳', 28, 140);

      ctx.fillStyle = '#dbeafe';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('금융의 모든 것, 토스에서 쉽고 간편하게', 28, 185);

      ctx.fillStyle = '#93c5fd';
      ctx.font = '700 15px monospace';
      ctx.fillText('INNOVATION CAMPUS // SEOUL FINTECH', 28, 226);
    } else if (brand === 'COUPANG') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 8;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#ef4444';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('coupang', 28, 82);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('쿠팡 로켓배송 드론 허브 🚀', 28, 138);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('오늘 주문 내일 새벽 도착! 로켓와우', 28, 182);

      ctx.fillStyle = '#f87171';
      ctx.font = '700 15px monospace';
      ctx.fillText('ROBOTIC FULFILLMENT // 24H DISPATCH', 28, 225);
    } else if (brand === 'MEGA_COFFEE') {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 8;
      ctx.strokeRect(5, 5, 502, 246);

      ctx.fillStyle = '#451a03';
      ctx.font = '900 38px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MEGA MGC COFFEE', 28, 78);

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('메가MGC커피 테이크아웃 🥤', 28, 132);

      ctx.fillStyle = '#451a03';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('빅사이즈 2샷 원두커피 & 딸기라떼 전문점', 28, 178);

      ctx.fillStyle = '#78350f';
      ctx.font = '700 15px monospace';
      ctx.fillText('OPEN 07:00 ~ 23:00 // DRONE PICKUP', 28, 224);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geo, mat);
}

function createBillboardMesh(
  title: string,
  subtitle: string,
  tag: string,
  themeColor: string,
  accentColor: string,
  width = 12.0,
  height = 5.5
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dark modern gradient background
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.6, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Glowing outer border
    ctx.lineWidth = 10;
    ctx.strokeStyle = themeColor;
    ctx.strokeRect(5, 5, 502, 246);

    // Tag / Badge pill
    ctx.fillStyle = themeColor;
    ctx.beginPath();
    ctx.roundRect(28, 22, 160, 36, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, 108, 40);

    // Main Title text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 12;
    ctx.fillText(title, 28, 108);

    // Subtitle text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 21px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText(subtitle, 28, 156);

    // Tech divider line
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, 188);
    ctx.lineTo(484, 188);
    ctx.stroke();

    // Bottom Tech Status Bar
    ctx.fillStyle = accentColor;
    ctx.font = '700 16px monospace';
    ctx.fillText('LIVE DISPLAY // SMART CITY 2026 // 4K 60FPS', 28, 220);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geo, mat);
}

// Procedural Korean Road Surface Textures (Teheran-ro Blue Bus Lane, 50km speed limit, Mapo Bridge asphalt)
function createKoreanRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Realistic dark aggregate asphalt base with micro-gravel texture
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle road aggregate speckles
    for (let i = 0; i < 2000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#334155' : '#0f172a';
      ctx.fillRect(rx, ry, 2, 2);
    }

    // Korea Central Bus-Only Dedicated Lane (Blue Solid Stripes on inner lanes)
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(170, 0);
    ctx.lineTo(170, 512);
    ctx.moveTo(342, 0);
    ctx.lineTo(342, 512);
    ctx.stroke();

    // Central Double Yellow Solid Lines
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(250, 0);
    ctx.lineTo(250, 512);
    ctx.moveTo(262, 0);
    ctx.lineTo(262, 512);
    ctx.stroke();

    // White Dashed Lane Dividers (Outer Lanes)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.setLineDash([32, 28]);
    ctx.beginPath();
    ctx.moveTo(90, 0);
    ctx.lineTo(90, 512);
    ctx.moveTo(422, 0);
    ctx.lineTo(422, 512);
    ctx.stroke();
    ctx.setLineDash([]);

    // Korean '50' Speed Limit Road Markings (Safe Urban 50km/h)
    ctx.save();
    ctx.translate(130, 256);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('50', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(382, 256);
    ctx.rotate(Math.PI / 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('50', 0, 0);
    ctx.restore();

    // Korean Bus Lane text mark '버스전용'
    ctx.save();
    ctx.translate(210, 256);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('버스전용', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(302, 256);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('버스전용', 0, 0);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 10);
  return tex;
}

// Korean Green Expressway/Avenue Signboard (e.g. '여의대로 / 테헤란로 / 올림픽대로')
function createKoreanStreetSignMesh(
  koreanName: string,
  englishName: string,
  routeNumber: string,
  width = 6.0,
  height = 2.4
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Korean Standard Highway Green Background
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 512, 200);

    // White Border
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(8, 8, 496, 184);

    // Route Number Shield
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(24, 24, 80, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(routeNumber, 64, 50);

    // Korean Destination Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(koreanName, 120, 60);

    // English Subtitle
    ctx.fillStyle = '#fef08a';
    ctx.font = '700 24px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText(englishName, 120, 110);

    // Arrow Indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px sans-serif';
    ctx.fillText('▲ 직진 (Go Straight)', 120, 160);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

// Procedural Building Facade Window Grid Textures (Blender Architectural Curtain Wall Style)
function createBuildingWindowTexture(baseHex: number, winColor: string = '#7dd3fc', rows: number = 12, cols: number = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const colHex = '#' + baseHex.toString(16).padStart(6, '0');
    ctx.fillStyle = colHex;
    ctx.fillRect(0, 0, 256, 512);

    // Architectural spandrel floor bands
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    const floorH = 512 / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillRect(0, r * floorH, 256, 4);
    }

    // Modern glass window panes with subtle interior warm/cyan reflections
    const padX = 6;
    const padY = 6;
    const wW = (256 - (cols + 1) * padX) / cols;
    const wH = floorH - padY * 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = padX + c * (wW + padX);
        const wy = r * floorH + padY;

        // Window pane glass gradient
        const winGrad = ctx.createLinearGradient(wx, wy, wx + wW, wy + wH);
        const isWarmLit = (r * 7 + c * 13) % 7 === 0;
        if (isWarmLit) {
          winGrad.addColorStop(0, '#fef08a');
          winGrad.addColorStop(1, '#ca8a04');
        } else {
          winGrad.addColorStop(0, winColor);
          winGrad.addColorStop(0.5, '#38bdf8');
          winGrad.addColorStop(1, '#0284c7');
        }

        ctx.fillStyle = winGrad;
        ctx.fillRect(wx, wy, wW, wH);

        // Window frame border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, wW, wH);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Procedural Landscape Grass & Lawn Texture (Blender Subsurface Scatter Tone)
function createProceduralLawnTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#166534'; // Lush base green
    ctx.fillRect(0, 0, 512, 512);

    // Fine organic grass turf blades and color variations
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 3 + 1;
      const greenTones = ['#15803d', '#14532d', '#22c55e', '#16a34a', '#1e3a1e'];
      ctx.fillStyle = greenTones[Math.floor(Math.random() * greenTones.length)];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  return tex;
}

export interface WorldCallbacks {
  onTelemetry: (data: DroneTelemetry) => void;
  onCoinCollected: (coinId: number, totalCollected: number) => void;
  onRingPassed: (ringId: number, nextRingId: number) => void;
  onPatientPickedUp: () => void;
  onPatientDelivered: () => void;
  onCrash: (impactSpeed: number) => void;
  onLapFinished: (lap: number, totalLaps: number, lapTime: number, playerAhead: boolean) => void;
  onRaceFinished: (playerWon: boolean, playerTime: number, aiTime: number) => void;
}

export class DroneWorld {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number = 0;
  private callbacks: WorldCallbacks;

  // Speed Gear Mode (1: ECO, 2: NORMAL STD, 3: TURBO SPORT)
  public speedGear: SpeedGear = 2;

  // Drone State
  private droneGroup: THREE.Group = new THREE.Group();
  private propMeshes: THREE.Mesh[] = [];
  private droneBodyMesh: THREE.Mesh | null = null;
  private ledLights: THREE.PointLight[] = [];
  private tractorBeamMesh: THREE.Mesh | null = null;
  private jetFlameMeshes: THREE.Mesh[] = [];

  private position = new THREE.Vector3(0, 0.4, 0);
  private velocity = new THREE.Vector3(0, 0, 0);
  private rotation = new THREE.Euler(0, 0, 0, 'YXZ'); // pitch (x), yaw (y), roll (z)
  private angularVelocity = new THREE.Vector3(0, 0, 0);
  private batteryPct: number = 100;
  private isGrounded: boolean = true;
  private hasCrashed: boolean = false;
  private armed: boolean = true;
  private autoFlightState: 'TAKEOFF' | 'LANDING' | 'NONE' = 'NONE';

  // Camera Shake & Collision Effects
  private cameraShakeTrauma: number = 0;
  private lastImpactSoundTime: number = 0;
  private currentCameraLookTarget = new THREE.Vector3(0, 0.6, 0);

  // Configuration
  private assistLevel: AssistLevel = 'BEGINNER';
  private cameraView: CameraView = 'CHASE';
  private sensitivity: number = 0.7; // Locked 0.7 standard sensitivity
  private invertPitch: boolean = false;
  private currentSkin: DroneSkin;

  // Controls input
  private currentInput: DroneControlInput = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };

  // Environment & Collision
  private buildingBoxes: THREE.Box3[] = [];
  private groundHelipadPos = new THREE.Vector3(0, 0, 0);
  private baseHelipadMesh: THREE.Group | null = null;

  // Mission Objects
  private currentStage: MissionStage | null = null;
  private rings: RingGate[] = [];
  private ringMeshes: THREE.Group[] = [];
  private coins: CoinItem[] = [];
  private coinMeshes: THREE.Mesh[] = [];
  private rescueTarget: RescueTarget | null = null;
  private rescuePatientMesh: THREE.Group | null = null;
  private hospitalMesh: THREE.Group | null = null;
  private rescueDelivered: boolean = false;
  private patientAttached: boolean = false;

  // Drone model holder (180° inverted to face forward in flight direction)
  private droneModelHolder: THREE.Group = new THREE.Group();

  // Universal Dynamic Augmented Reality Guidance & Holo-Beacon System
  private cityNavGraph = new CityNavGraph();
  private missionGuidanceGroup: THREE.Group = new THREE.Group();
  private missionGuidanceLine: THREE.Line | null = null;
  private guidancePulseOrbs: THREE.Mesh[] = [];
  private guidanceBeaconGroup: THREE.Group = new THREE.Group();
  private guidanceBeaconRings: THREE.Mesh[] = [];
  private guidanceBeaconCone: THREE.Mesh | null = null;
  private guidanceBeaconBeam: THREE.Mesh | null = null;
  private guidanceBeaconLight: THREE.PointLight | null = null;

  // Hospital & Rescue OR transfer
  private hospitalDoctors: THREE.Group[] = [];
  private hospitalORGroup: THREE.Group | null = null;
  private hospitalORDoorLeft: THREE.Mesh | null = null;
  private hospitalORDoorRight: THREE.Mesh | null = null;
  private patientWavingArm: THREE.Mesh | null = null;
  private isTransferringPatientToOR: boolean = false;
  private transferORProgress: number = 0;

  // Racing track models
  private raceTrackGroup: THREE.Group | null = null;

  // 63 Building Stage 5 Rescue Mission Highlight Effects
  private bldg63MissionEffectGroup: THREE.Group | null = null;
  private bldg63BeaconRings: THREE.Mesh[] = [];
  private bldg63HoloSign: THREE.Mesh | null = null;
  private bldg63Searchlights: THREE.Mesh[] = [];

  // Stage 2 Dynamic Obstacles & Landing State
  private stage2Obstacles: { group: THREE.Group; position: THREE.Vector3; radius: number; rotor: THREE.Mesh | THREE.Group }[] = [];
  private stage2LandingReady: boolean = false;

  // AI Racer
  private aiDroneGroup: THREE.Group | null = null;
  private aiProps: THREE.Mesh[] = [];
  private aiRacerState: AiRacerState | null = null;
  private raceWaypoints: THREE.Vector3[] = [];
  private aiFlightWaypoints: THREE.Vector3[] = [];
  private raceStartTime: number = 0;
  private currentLap: number = 1;
  private totalRaceLaps: number = 1;
  private raceActive: boolean = false;
  private raceFinished: boolean = false;
  private isRaceReady: boolean = false;

  // Visual Effects & Particle Pool (Pre-allocated for Zero GC Jitter)
  private particlePool: {
    mesh: THREE.Points;
    geometry: THREE.BufferGeometry;
    material: THREE.PointsMaterial;
    positions: Float32Array;
    velocities: Float32Array;
    active: boolean;
    life: number;
    maxLife: number;
  }[] = [];
  private dustRing: THREE.Mesh | null = null;

  // Scratch Objects & Caches (Eliminates all per-frame heap allocations)
  private _tempVecA = new THREE.Vector3();
  private _tempVecB = new THREE.Vector3();
  private _tempClosestPoint = new THREE.Vector3();
  private _tempNormal = new THREE.Vector3();
  private _tempDiff = new THREE.Vector3();
  private _tempCamOffset = new THREE.Vector3();
  private _tempCamTarget = new THREE.Vector3();
  private _tempRotMat4 = new THREE.Matrix4();
  private _tempOrbPos = new THREE.Vector3();
  private _scratchAiPos = new THREE.Vector3();
  private _scratchToWp = new THREE.Vector3();
  private _scratchDir = new THREE.Vector3();
  private _scratchNextDir = new THREE.Vector3();
  private _scratchTargetPos = new THREE.Vector3();
  private _scratchCoinPos = new THREE.Vector3();
  private _scratchRingPos = new THREE.Vector3();
  private _scratchPatientPos = new THREE.Vector3();
  private _scratchHospitalPos = new THREE.Vector3();
  private _scratchPushDir = new THREE.Vector3();

  // Quest Path Caching state
  private cachedQuestCurve: THREE.CatmullRomCurve3 | null = null;
  private lastQuestCalcTime = 0;
  private lastQuestStartPos = new THREE.Vector3(999, 999, 999);
  private lastQuestGoalPos = new THREE.Vector3(999, 999, 999);
  private lastTelemetryTime = 0;
  private prevIsGrounded = true;

  // Animated Environment Elements (Hot Air Balloons, Pedestrians, Birds, Dog, Lights, Fountain, Dynamic Traffic)
  private hotAirBalloons: { group: THREE.Group; baseY: number; phase: number; speed: number; rotSpeed: number }[] = [];
  private animatedPedestrians: {
    group: THREE.Group;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    minVal: number;
    maxVal: number;
    speed: number;
    dir: number;
    isX: boolean;
    walkPhase: number;
  }[] = [];
  private dynamicVehicles: {
    group: THREE.Group;
    speed: number;
    dir: number;
    isX: boolean;
    minVal: number;
    maxVal: number;
    wheels: THREE.Mesh[];
  }[] = [];
  private trafficLightMeshes: {
    cz: number;
    nsRedMesh: THREE.Mesh;
    nsGreenMesh: THREE.Mesh;
    ewRedMesh: THREE.Mesh;
    ewGreenMesh: THREE.Mesh;
  }[] = [];
  private birdFlock: {
    group: THREE.Group;
    leftWing: THREE.Mesh;
    rightWing: THREE.Mesh;
    center: THREE.Vector3;
    radius: number;
    height: number;
    angle: number;
    speed: number;
    flapSpeed: number;
    flapPhase: number;
  }[] = [];
  private parkDog: {
    group: THREE.Group;
    tail: THREE.Mesh;
    head: THREE.Mesh;
    legs: THREE.Mesh[];
    minX: number;
    maxX: number;
    speed: number;
    dir: number;
    walkPhase: number;
  } | null = null;
  private redWarningLights: THREE.Mesh[] = [];
  private fountainWater: THREE.Mesh | null = null;

  // Cyber Sky, Moon, Space Beacons & Airships
  private skyDome: THREE.Mesh | null = null;
  private starsPoints: THREE.Points | null = null;
  private cyberMoonGroup: THREE.Group | null = null;
  private cyberMoonRings: THREE.Mesh[] = [];
  private cyberMoonSatellites: THREE.Mesh[] = [];
  private skyBeacons: { mesh: THREE.Mesh; light: THREE.PointLight | null; baseY: number; pulseSpeed: number; baseOpacity: number }[] = [];
  private skyCruisers: { group: THREE.Group; radius: number; height: number; speed: number; angle: number; engineTrail: THREE.Mesh; strobes: THREE.Mesh[] }[] = [];
  private floatingDataRelays: { group: THREE.Group; innerRing: THREE.Mesh; outerRing: THREE.Mesh; baseY: number; floatSpeed: number; rotSpeed: number }[] = [];

  // Instanced Cyber City Elements (Zero-lag single draw-call instances)
  private instancedStreetPylons: THREE.InstancedMesh | null = null;
  private instancedPylonLamps: THREE.InstancedMesh | null = null;
  private instancedSkyCruisers: THREE.InstancedMesh | null = null;
  private skyCruiserFlightPaths: { radius: number; height: number; speed: number; angle: number; tilt: number; dir: number }[] = [];
  private instancedDataCubes: THREE.InstancedMesh | null = null;
  private dataCubeConfigs: { origin: THREE.Vector3; floatSpeed: number; rotSpeed: number; radius: number; phase: number }[] = [];
  private instancedMegacityTowers: THREE.InstancedMesh | null = null;
  private instancedMegacityBeacons: THREE.InstancedMesh | null = null;

  // Rich Urban Ecosystem (Massive Zero-Lag Instanced Meshes & Props)
  private windTurbineRotors: THREE.Group[] = [];
  private instancedTreeTrunks: THREE.InstancedMesh | null = null;
  private instancedTreeOakFoliage: THREE.InstancedMesh | null = null;
  private instancedTreePineFoliage: THREE.InstancedMesh | null = null;
  private instancedVehicles: THREE.InstancedMesh | null = null;
  private instancedVehicleTops: THREE.InstancedMesh | null = null;
  private instancedSolarPanels: THREE.InstancedMesh | null = null;
  private instancedMidRiseBlocks: THREE.InstancedMesh | null = null;
  private instancedMidRisePads: THREE.InstancedMesh | null = null;
  private instancedMidRiseWindows: THREE.InstancedMesh | null = null;
  private instancedRoofHVAC: THREE.InstancedMesh | null = null;
  private instancedRoofAntennas: THREE.InstancedMesh | null = null;
  private instancedEntranceAwnings: THREE.InstancedMesh | null = null;
  private instancedStreetPoles: THREE.InstancedMesh | null = null;
  private instancedStreetLanterns: THREE.InstancedMesh | null = null;

  // GLTF Loader & Custom 3D Model Management (Blender/Sketchfab/Kenney GLTF support)
  private gltfLoader = new GLTFLoader();
  private customModelsGroup = new THREE.Group();
  private loadedCustomModels: CustomGLTFModel[] = [];
  private currentAtmospherePreset: GraphicsAtmospherePreset = 'SEOUL_HANRIVER_DAY';
  private sunLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private airportTowerBeacon: THREE.Mesh | null = null;

  // Scratch math objects for zero-allocation InstancedMesh transforms
  private _instMatrix = new THREE.Matrix4();
  private _instPos = new THREE.Vector3();
  private _instQuat = new THREE.Quaternion();
  private _instScale = new THREE.Vector3(1, 1, 1);
  private _instEuler = new THREE.Euler();

  // Time tracking & 60 FPS Render Loop
  private lastTime: number = performance.now();
  private hoverTimeTracker: number = 0;

  constructor(container: HTMLElement, skin: DroneSkin, callbacks: WorldCallbacks) {
    this.container = container;
    this.currentSkin = skin;
    this.callbacks = callbacks;

    // Scene with Bright Daylight Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbde0fe); // Crisp sunny sky blue
    this.scene.fog = new THREE.FogExp2(0xcfe2fe, 0.0032); // Soft daylight atmospheric mist

    // Camera with balanced depth range (near: 0.5, far: 450) with logarithmic depth buffer for zero Z-fighting
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.5, 450);
    this.camera.position.set(0, 3, 6);

    // High-Performance WebGLRenderer with zero Z-fighting:
    // - logarithmicDepthBuffer: false (reduces mobile fragment shader ALU burden significantly)
    // - precision: highp for stable vertex calculation
    // - stencil: false, depth: true, premultipliedAlpha: false
    // - pixelRatio: 1.0 (capped at 1.0 on tablets for 2.25x GPU fillrate boost over 1.5x)
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false, 
      stencil: false, 
      depth: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      precision: 'highp',
      logarithmicDepthBuffer: false
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(1.0); // 1.0x native clean scale: runs butter-smooth 60 FPS on any tablet
    
    // Blender-Grade ACES Filmic Tone Mapping for crisp color grading & rich contrast
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = false;
    this.renderer.autoClear = true;
    container.appendChild(this.renderer.domElement);

    // Lighting (Shadows disabled for maximum tablet fillrate)
    this.setupLighting(true);

    // Build World
    this.buildCityWorld();
    this.buildGuidanceLineSystem();

    // Build Drone
    this.buildDroneModel();

    // Pre-allocate Particle Pool for Zero Heap Churn during impact sparks
    const maxParticles = 32;
    for (let i = 0; i < 4; i++) {
      const positions = new Float32Array(maxParticles * 3);
      const velocities = new Float32Array(maxParticles * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.28,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Points(geometry, material);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push({
        mesh,
        geometry,
        material,
        positions,
        velocities,
        active: false,
        life: 0,
        maxLife: 0.5
      });
    }

    // Resize handler
    window.addEventListener('resize', this.onWindowResize);

    // Start loop
    this.lastTime = performance.now();
    this.animate();
  }

  private setupLighting(isMobileOrTablet: boolean = false) {
    // Crisp Daylight Ambient Illumination (Natural soft sky fill)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambientLight);

    // Natural Sky & Ground Bounce Lighting (Sky Cyan-Blue / Ground Lawn-Concrete Bounce)
    this.hemiLight = new THREE.HemisphereLight(0x70b5ff, 0xdcfce7, 0.65);
    this.scene.add(this.hemiLight);

    // Warm Golden Sun Directional Light (Direct Sunlight gives sharp, clean architectural depth with zero shadow lag)
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
    this.sunLight.position.set(100, 160, 80);
    this.sunLight.castShadow = false;
    this.scene.add(this.sunLight);
  }

  private buildCityWorld() {
    this.buildingBoxes = [];

    // 1. Procedural Daylight Sky Dome, Soft Clouds & Radiant Sun
    this.buildCyberSkyAndAtmosphere();

    // 2. Base Green Countryside Turf & Landscape Base
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundTex = createProceduralLawnTexture();
    const groundMat = new THREE.MeshLambertMaterial({ 
      color: 0xffffff,
      map: groundTex,
      depthWrite: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.renderOrder = 0;
    this.scene.add(ground);

    // 3. Layered Urban Districts, Foundations & Parking Lots
    this.buildUrbanDistrictsAndLandscape();

    // 4. Realistic Asphalt Roads, Yellow Centerlines & Zebra Crosswalks
    this.buildRoadNetworkAndStreets();

    // 5. Scenic South River, Embankments & 3 Arched Bridges
    this.buildRiverCanalAndBridges();

    // 6. East District Olympic Sports Park (Stadium, Soccer, Basketball & Tennis Courts)
    this.buildSportsComplexAndStadium();

    // 7. West District High-Tech Logistics & Clean Wind Energy Farm
    this.buildWindTurbinesAndCleanEnergy();

    // 8. Southwest International Airport & Aircraft Hangars (Aviation District)
    this.buildAirportAndHangars();

    // 9. 대한민국 국회의사당 & 여의도 의사당 광장 (National Assembly of Korea & Grand Lawn)
    this.buildNationalAssemblyOfKorea();

    // 10. Seoul Yeouido & Gangnam Landmark Master Architecture (63 Golden Building, Parc.1 Tower, Teheran-ro Media Billboards, Mapo Bridge)
    this.buildSeoulYeouidoGangnamLandmarks();

    // 11. Main Base Start / Landing Helipad (High-Visibility Aviation Yellow)
    this.baseHelipadMesh = this.buildHelipad(0, 0.15, 0, 7.5, 0xfacc15, 'START / BASE');

    // 12. Modern Architecture Glass Towers, Concrete Highrises & Hospital
    this.buildBuildings();

    // 13. Central Park Plaza, Fountain & North Eco Nature Lake
    this.buildTreesAndPark();

    // 14. Ambient City Life (Hot Air Balloons, Pedestrians, Soaring Birds, Dynamic Traffic)
    this.buildHotAirBalloons();
    this.buildPedestrians();
    this.buildAnimalsAndBirds();
    this.buildDynamicRoadTraffic();

    // 15. Instanced Urban Elements (Trees, Vehicles, Solar Panels, Suburban Houses, Mid-Rise Blocks, Megacity Towers)
    this.buildCyberInstancedElements();

    // 16. Container for Custom Loaded GLTF / 3D Models
    this.scene.add(this.customModelsGroup);
  }

  private buildCyberSkyAndAtmosphere() {
    // 1. Procedural 360° Daylight Sky Dome with Natural Atmospheric Gradients & Clouds
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Natural Blue Sky Gradient (Zenith -> Horizon)
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0.0, '#1d72b8');   // Rich Upper Sky Blue
      grad.addColorStop(0.35, '#3b82f6');  // Azure Mid-Sky
      grad.addColorStop(0.70, '#60a5fa');  // Soft Daylight Blue
      grad.addColorStop(0.88, '#bae6fd');  // Atmospheric Light Blue
      grad.addColorStop(1.0, '#e0f2fe');   // Horizon Daylight Mist
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      // Soft Fluffy Procedural Clouds across the Sky
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      const cloudClusters = [
        { x: 60, y: 70, w: 90, h: 22 },
        { x: 180, y: 55, w: 120, h: 26 },
        { x: 340, y: 80, w: 100, h: 24 },
        { x: 440, y: 65, w: 85, h: 20 },
        { x: 120, y: 130, w: 80, h: 18 },
        { x: 280, y: 140, w: 110, h: 22 },
        { x: 410, y: 135, w: 90, h: 19 }
      ];

      cloudClusters.forEach(c => {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x - c.w * 0.25, c.y - c.h * 0.1, c.w * 0.35, c.h * 0.6, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + c.w * 0.25, c.y - c.h * 0.1, c.w * 0.35, c.h * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Distant Horizon Metropolis Skyline Silhouettes
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)'; // Soft distant atmospheric silhouette
      const buildingWidths = [18, 24, 14, 30, 20, 28, 16, 22, 34, 18, 26, 15];
      let curX = 0;
      let bIdx = 0;
      while (curX < 512) {
        const bw = buildingWidths[bIdx % buildingWidths.length];
        const bh = 22 + (bIdx % 4) * 14;
        const by = 256 - bh;
        ctx.fillRect(curX, by, bw - 2, bh);
        curX += bw;
        bIdx++;
      }
    }

    const skyTex = new THREE.CanvasTexture(canvas);
    skyTex.wrapS = THREE.RepeatWrapping;
    skyTex.wrapT = THREE.ClampToEdgeWrapping;

    const skyGeo = new THREE.SphereGeometry(420, 20, 12);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // 2. Radiant Golden Sun Disc & Lens Flare Ring
    this.cyberMoonGroup = new THREE.Group();
    this.cyberMoonGroup.position.set(120, 150, -180);

    // Warm Sun Core Sphere
    const sunGeo = new THREE.SphereGeometry(20, 16, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffef0 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.cyberMoonGroup.add(sunMesh);

    // Sun Golden Atmospheric Flare Ring
    const haloGeo = new THREE.RingGeometry(20.5, 36.0, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.lookAt(0, 0, 0);
    this.cyberMoonGroup.add(haloMesh);

    this.scene.add(this.cyberMoonGroup);

    this.skyBeacons = [];
    this.skyCruisers = [];
    this.floatingDataRelays = [];
    this.cyberMoonRings = [];
    this.cyberMoonSatellites = [];
  }

  private buildUrbanDistrictsAndLandscape() {
    const districtGroup = new THREE.Group();
    districtGroup.renderOrder = 0;

    // 1. Downtown Core Concrete Foundation Platform (Clean Urban Slate Platform)
    const corePlazaGeo = new THREE.PlaneGeometry(190, 250);
    const corePlazaMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const corePlaza = new THREE.Mesh(corePlazaGeo, corePlazaMat);
    corePlaza.rotation.x = -Math.PI / 2;
    corePlaza.position.set(0, 0.02, -10);
    districtGroup.add(corePlaza);

    // 2. Central Takeoff Pedestrian Paver Plaza
    const centerPlazaGeo = new THREE.PlaneGeometry(36, 36);
    const centerPlazaMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const centerPlaza = new THREE.Mesh(centerPlazaGeo, centerPlazaMat);
    centerPlaza.rotation.x = -Math.PI / 2;
    centerPlaza.position.set(0, 0.04, 0);
    districtGroup.add(centerPlaza);

    // 3. North Corporate Skyline Promenade Platform & Courtyard
    const northPromenadeGeo = new THREE.PlaneGeometry(150, 60);
    const northPromenadeMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const northPromenade = new THREE.Mesh(northPromenadeGeo, northPromenadeMat);
    northPromenade.rotation.x = -Math.PI / 2;
    northPromenade.position.set(0, 0.03, -90);
    districtGroup.add(northPromenade);

    // North sidewalk pedestrian paving strips
    const northWalkway = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 14),
      new THREE.MeshLambertMaterial({ color: 0xcbd5e1 })
    );
    northWalkway.rotation.x = -Math.PI / 2;
    northWalkway.position.set(0, 0.045, -72);
    districtGroup.add(northWalkway);

    // 4. Downtown Asphalt Parking Lots & Painted Parking Bays
    const parkingLots = [
      { x: -55, z: -35, w: 26, d: 24, label: 'ALPHA PARKING' },
      { x: 55, z: -35, w: 26, d: 24, label: 'COMMERCIAL LOT' },
      { x: 88, z: 25, w: 28, d: 22, label: 'HOSPITAL LOT' },
      { x: -30, z: 25, w: 24, d: 20, label: 'CIVIC LOT' },
      { x: -110, z: -35, w: 75, d: 65, label: 'LOGISTICS TARMAC' } // West Logistics Yard
    ];

    const parkingMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const stallLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    parkingLots.forEach(lot => {
      const lotMesh = new THREE.Mesh(new THREE.PlaneGeometry(lot.w, lot.d), parkingMat);
      lotMesh.rotation.x = -Math.PI / 2;
      lotMesh.position.set(lot.x, 0.035, lot.z);
      districtGroup.add(lotMesh);

      // White parking stall stripes
      const numBays = Math.floor(lot.w / 3.2);
      for (let i = 0; i < numBays; i++) {
        const offX = -lot.w / 2 + 1.8 + i * 3.0;
        const line1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 5.0), stallLineMat);
        line1.rotation.x = -Math.PI / 2;
        line1.position.set(lot.x + offX, 0.05, lot.z - lot.d / 4);
        districtGroup.add(line1);

        const line2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 5.0), stallLineMat);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(lot.x + offX, 0.05, lot.z + lot.d / 4);
        districtGroup.add(line2);
      }
    });

    // 5. East Residential Village Ground & Driveways Base
    const villageBaseGeo = new THREE.PlaneGeometry(100, 200);
    const villageBaseMat = new THREE.MeshLambertMaterial({ color: 0x166534 }); // Manicured lawn base
    const villageBase = new THREE.Mesh(villageBaseGeo, villageBaseMat);
    villageBase.rotation.x = -Math.PI / 2;
    villageBase.position.set(125, 0.02, 10);
    districtGroup.add(villageBase);

    // East Village Central Avenue (Connecting North to South)
    const villageRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 190),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    villageRoad.rotation.x = -Math.PI / 2;
    villageRoad.position.set(122.5, 0.03, 10);
    districtGroup.add(villageRoad);

    this.scene.add(districtGroup);
  }

  private buildRiverCanalAndBridges() {
    const riverGroup = new THREE.Group();

    // 1. South Waterway Canal: Han River (Clean azure blue river located at Z = 158, clearly south of the Olympic Expressway)
    const riverGeo = new THREE.PlaneGeometry(580, 48);
    const riverMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.04, 158);
    riverGroup.add(river);

    // 2. Concrete Embankment Edges (North and South Riverbanks at Z = 134 and Z = 182)
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const nEmbank = new THREE.Mesh(new THREE.BoxGeometry(580, 0.35, 1.4), curbMat);
    nEmbank.position.set(0, 0.16, 134);
    riverGroup.add(nEmbank);

    const sEmbank = new THREE.Mesh(new THREE.BoxGeometry(580, 0.35, 1.4), curbMat);
    sEmbank.position.set(0, 0.16, 182);
    riverGroup.add(sEmbank);

    // 3. Three Arched Vehicular Bridges spanning over the Han River (Z = 158)
    const bridgeXs = [
      { x: 0, w: 22, name: 'Mapo Grand Bridge' },           // Central Boulevard Mapo Grand Bridge
      { x: -110, w: 14, name: 'West Logistics Bridge' },    // West Logistics Avenue Bridge
      { x: 110, w: 14, name: 'East Residential Bridge' }    // East Residential Avenue Bridge
    ];

    const deckMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const railMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x64748b });

    bridgeXs.forEach(b => {
      // Elevated Road deck crossing over the Han River
      const deck = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.6, 52), deckMat);
      deck.position.set(b.x, 0.45, 158);
      riverGroup.add(deck);

      // Center yellow line on bridge
      const yLine = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 50), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      yLine.rotation.x = -Math.PI / 2;
      yLine.position.set(b.x, 0.78, 158);
      riverGroup.add(yLine);

      // Safety side railings
      [-b.w / 2 + 0.4, b.w / 2 - 0.4].forEach(rx => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 52), railMat);
        rail.position.set(b.x + rx, 0.9, 158);
        riverGroup.add(rail);
      });

      // River support piers submerged into the Han River
      [-b.w / 3, b.w / 3].forEach(px => {
        const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 3.0, 8), pierMat);
        pier.position.set(b.x + px, -0.5, 158);
        riverGroup.add(pier);
      });

      // Register Bridge Collision Box
      this.buildingBoxes.push(
        new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(b.x, 0.5, 158),
          new THREE.Vector3(b.w, 1.2, 52)
        )
      );
    });

    this.scene.add(riverGroup);
  }

  private buildSportsComplexAndStadium() {
    const sportsGroup = new THREE.Group();

    // 1. Olympic Athletic Stadium & Soccer Pitch at x: 105, z: -30
    const stadiumBase = new THREE.Mesh(
      new THREE.PlaneGeometry(58, 38),
      new THREE.MeshLambertMaterial({ color: 0xb91c1c }) // Olympic brick red running track
    );
    stadiumBase.rotation.x = -Math.PI / 2;
    stadiumBase.position.set(105, 0.04, -30);
    sportsGroup.add(stadiumBase);

    // Green soccer pitch
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(44, 26),
      new THREE.MeshLambertMaterial({ color: 0x16a34a })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(105, 0.055, -30);
    sportsGroup.add(pitch);

    // Soccer white boundary lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const bLines = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.4, 16), lineMat);
    bLines.rotation.x = -Math.PI / 2;
    bLines.position.set(105, 0.065, -30);
    sportsGroup.add(bLines);

    // Center dividing stripe
    const cStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 26), lineMat);
    cStripe.rotation.x = -Math.PI / 2;
    cStripe.position.set(105, 0.065, -30);
    sportsGroup.add(cStripe);

    // Goal posts
    const postMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    [-21, 21].forEach(gx => {
      const gBeam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 4.0), postMat);
      gBeam.position.set(105 + gx, 0.9, -30);
      sportsGroup.add(gBeam);
    });

    // Concrete Spectator Bleachers
    const standMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    [-17, 17].forEach(sz => {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(46, 2.4, 3.5), standMat);
      stand.position.set(105, 1.2, -30 + sz);
      sportsGroup.add(stand);

      // Register Stadium Bleachers Collision Box
      this.buildingBoxes.push(
        new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(105, 1.2, -30 + sz),
          new THREE.Vector3(46, 2.4, 3.5)
        )
      );
    });

    // 2. Basketball Court at x: 105, z: 12
    const bCourt = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 15),
      new THREE.MeshLambertMaterial({ color: 0xea580c }) // Terracotta orange
    );
    bCourt.rotation.x = -Math.PI / 2;
    bCourt.position.set(105, 0.045, 12);
    sportsGroup.add(bCourt);

    // Basketball hoops
    [-11, 11].forEach(hx => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
      pole.position.set(105 + hx, 1.6, 12);
      sportsGroup.add(pole);

      const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 1.6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      board.position.set(105 + hx + (hx > 0 ? -0.3 : 0.3), 2.8, 12);
      sportsGroup.add(board);
    });

    // 3. Tennis Court at x: 105, z: 42
    const tCourt = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 14),
      new THREE.MeshLambertMaterial({ color: 0x15803d })
    );
    tCourt.rotation.x = -Math.PI / 2;
    tCourt.position.set(105, 0.045, 42);
    sportsGroup.add(tCourt);

    const net = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.8, 13.5),
      new THREE.MeshLambertMaterial({ color: 0xe2e8f0 })
    );
    net.position.set(105, 0.45, 42);
    sportsGroup.add(net);

    this.scene.add(sportsGroup);
  }

  private buildWindTurbinesAndCleanEnergy() {
    const energyGroup = new THREE.Group();
    this.windTurbineRotors = [];

    // 1. Four Outskirts Clean Wind Turbines
    const turbineLocations = [
      { x: -135, z: 65, h: 34 },
      { x: -155, z: -20, h: 38 },
      { x: -135, z: -95, h: 36 },
      { x: -175, z: -60, h: 40 }
    ];

    const towerMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    turbineLocations.forEach((loc, idx) => {
      const tGroup = new THREE.Group();
      tGroup.position.set(loc.x, 0, loc.z);

      // Tapered tower
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, loc.h, 8), towerMat);
      tower.position.y = loc.h / 2;
      tGroup.add(tower);

      // Nacelle pod
      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.3, 3.4), towerMat);
      nacelle.position.set(0, loc.h, 0);
      tGroup.add(nacelle);

      // Rotor group (animated spin)
      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(0, loc.h, 1.8);

      // Spinner nose cone
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 8), bladeMat);
      spinner.rotation.x = Math.PI / 2;
      rotorGroup.add(spinner);

      // 3 Aerodynamic blades
      for (let b = 0; b < 3; b++) {
        const angle = (b * Math.PI * 2) / 3;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 11.0, 0.1), bladeMat);
        blade.position.set(Math.sin(angle) * 5.5, Math.cos(angle) * 5.5, 0);
        blade.rotation.z = -angle;
        rotorGroup.add(blade);
      }

      rotorGroup.rotation.z = idx * 1.2;
      tGroup.add(rotorGroup);
      this.windTurbineRotors.push(rotorGroup);

      energyGroup.add(tGroup);

      // Register Wind Turbine Collision Box (Tower + Nacelle)
      this.buildingBoxes.push(
        new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(loc.x, loc.h / 2, loc.z),
          new THREE.Vector3(3.2, loc.h, 3.2)
        )
      );
    });

    // 2. West Logistics Warehouses & Shipping Containers
    const warehouseMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const shutterMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const ventMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const cautionMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // Warehouse concrete foundation apron
    const whApron = new THREE.Mesh(
      new THREE.PlaneGeometry(42, 58),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    whApron.rotation.x = -Math.PI / 2;
    whApron.position.set(-110, 0.04, -32.5);
    energyGroup.add(whApron);

    [-45, -20].forEach((wz, wIdx) => {
      const wh = new THREE.Mesh(new THREE.BoxGeometry(30, 9, 18), warehouseMat);
      wh.position.set(-110, 4.5, wz);
      energyGroup.add(wh);

      const wTrim = new THREE.Mesh(new THREE.BoxGeometry(30.6, 0.8, 18.6), trimMat);
      wTrim.position.set(-110, 9.2, wz);
      energyGroup.add(wTrim);

      // Industrial Roll-up Shutter Garage Doors on Front Facade (+X face)
      for (let d = -6; d <= 6; d += 6) {
        const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.2, 4.5), shutterMat);
        shutter.position.set(-94.8, 2.6, wz + d);
        energyGroup.add(shutter);

        // Yellow caution hazard line above shutter
        const cLine = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 4.8), cautionMat);
        cLine.position.set(-94.75, 5.4, wz + d);
        energyGroup.add(cLine);
      }

      // Rooftop Industrial HVAC Chillers & Air Vents
      for (let v = -8; v <= 8; v += 8) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 2.8), ventMat);
        vent.position.set(-110, 10.3, wz + v);
        energyGroup.add(vent);

        const fanCap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 8), shutterMat);
        fanCap.position.set(-110, 11.3, wz + v);
        energyGroup.add(fanCap);
      }

      // Digital Logistics Terminal Billboard
      const bbTitle = wIdx === 0 ? 'GLOBAL AIR CARGO' : 'SMART DRONE LOGISTICS';
      const bbSub = wIdx === 0 ? 'Autonomous Heavy Payload Depot' : 'Express Robotic Fulfillment Hub';
      const whSign = createBillboardMesh(bbTitle, bbSub, 'DEPOT', '#0369a1', '#38bdf8', 12, 4.5);
      whSign.position.set(-94.7, 7.0, wz);
      whSign.rotation.y = Math.PI / 2;
      energyGroup.add(whSign);

      // Bounding box for flight collision
      const box = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(-110, 4.5, wz),
        new THREE.Vector3(30, 9, 18)
      );
      this.buildingBoxes.push(box);
    });

    // Colorful shipping containers stacked 2-high
    const containerColors = [0x2563eb, 0xea580c, 0xdc2626, 0x16a34a, 0xf8fafc, 0xfacc15];
    const cGeo = new THREE.BoxGeometry(6.0, 2.4, 2.4);

    for (let c = 0; c < 14; c++) {
      const cMat = new THREE.MeshLambertMaterial({ color: containerColors[c % containerColors.length] });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      const row = Math.floor(c / 2);
      const isTop = c % 2 === 1;
      cMesh.position.set(-85, isTop ? 3.6 : 1.2, -50 + row * 2.8);
      energyGroup.add(cMesh);
    }

    // Register Shipping Containers Stack Collision Box
    this.buildingBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(-85, 2.4, -41.6),
        new THREE.Vector3(6.5, 5.0, 20.0)
      )
    );

    this.scene.add(energyGroup);
  }

  private buildRoadNetworkAndStreets() {
    const roadGroup = new THREE.Group();
    roadGroup.renderOrder = 1;

    // High-Detail Korean Road Texture with Blue Bus Lanes & 50km/h Speed Signs
    const koreanRoadTex = createKoreanRoadTexture();
    const koreanRoadMat = new THREE.MeshLambertMaterial({ 
      color: 0xffffff,
      map: koreanRoadTex,
      polygonOffset: true,
      polygonOffsetFactor: -4.0,
      polygonOffsetUnits: -4.0
    });

    const crossRoadMat = new THREE.MeshLambertMaterial({ 
      color: 0x1e293b,
      polygonOffset: true,
      polygonOffsetFactor: -4.0,
      polygonOffsetUnits: -4.0
    });

    // 1. Main Central Boulevard: 테헤란로 / 여의대로 (Gangnam Teheran-ro / Yeouido Blvd)
    const mainRoadGeo = new THREE.PlaneGeometry(22, 220);
    const mainRoad = new THREE.Mesh(mainRoadGeo, koreanRoadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.08, 0);
    roadGroup.add(mainRoad);

    // 2. East-West Connecting Crossways (Gangnam & Yeouido Street Crossings)
    const crosswayZs = [30, -20, -60];
    crosswayZs.forEach(cz => {
      const crossRoadGeo = new THREE.PlaneGeometry(160, 16);
      const crossRoad = new THREE.Mesh(crossRoadGeo, crossRoadMat);
      crossRoad.rotation.x = -Math.PI / 2;
      crossRoad.position.set(0, 0.085, cz);
      roadGroup.add(crossRoad);

      // Yellow Centerline
      const cYLineGeo = new THREE.PlaneGeometry(156, 0.35);
      const cYLineMat = new THREE.MeshBasicMaterial({ 
        color: 0xfacc15,
        polygonOffset: true,
        polygonOffsetFactor: -8.0,
        polygonOffsetUnits: -8.0
      });
      const cYLine = new THREE.Mesh(cYLineGeo, cYLineMat);
      cYLine.rotation.x = -Math.PI / 2;
      cYLine.position.set(0, 0.115, cz);
      roadGroup.add(cYLine);

      // Korean Crosswalks (횡단보도) at Intersection Corners
      [-12.5, 12.5].forEach(cwX => {
        for (let bx = -6.5; bx <= 6.5; bx += 1.3) {
          const zStripe = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 3.2),
            new THREE.MeshBasicMaterial({ 
              color: 0xf8fafc,
              polygonOffset: true,
              polygonOffsetFactor: -9.0,
              polygonOffsetUnits: -9.0
            })
          );
          zStripe.rotation.x = -Math.PI / 2;
          zStripe.position.set(cwX > 0 ? cwX + 2.5 : cwX - 2.5, 0.12, cz + bx);
          roadGroup.add(zStripe);
        }
      });

      // 4-Way Traffic Signal Posts with Dual-Direction Korean Signals
      const postMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const housingMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      
      const nsRedMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      const nsGreenMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      const ewRedMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      const ewGreenMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: 0x22c55e }));

      // Build North-South Traffic Light Post (Corner: x: 13.5, z: cz - 9.5)
      const nsLightPost = new THREE.Group();
      nsLightPost.position.set(13.5, 0, cz - 9.5);
      const poleMesh1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 6.8, 8), postMat);
      poleMesh1.position.y = 3.4;
      nsLightPost.add(poleMesh1);

      const mastArm1 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 0.2), postMat);
      mastArm1.position.set(-2.2, 6.4, 0);
      nsLightPost.add(mastArm1);

      // Signal Housing
      const box1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.4), housingMat);
      box1.position.set(-3.5, 6.0, 0);
      nsLightPost.add(box1);

      nsRedMesh.position.set(-3.5, 6.5, 0.22);
      nsGreenMesh.position.set(-3.5, 5.5, 0.22);
      nsLightPost.add(nsRedMesh);
      nsLightPost.add(nsGreenMesh);
      roadGroup.add(nsLightPost);

      // Build East-West Traffic Light Post (Corner: x: -13.5, z: cz + 9.5)
      const ewLightPost = new THREE.Group();
      ewLightPost.position.set(-13.5, 0, cz + 9.5);
      const poleMesh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 6.8, 8), postMat);
      poleMesh2.position.y = 3.4;
      ewLightPost.add(poleMesh2);

      const mastArm2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 4.5), postMat);
      mastArm2.position.set(0, 6.4, -2.2);
      ewLightPost.add(mastArm2);

      const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.6), housingMat);
      box2.position.set(0, 6.0, -3.5);
      ewLightPost.add(box2);

      ewRedMesh.position.set(0.22, 6.5, -3.5);
      ewGreenMesh.position.set(0.22, 5.5, -3.5);
      ewLightPost.add(ewRedMesh);
      ewLightPost.add(ewGreenMesh);
      roadGroup.add(ewLightPost);

      this.trafficLightMeshes.push({
        cz,
        nsRedMesh,
        nsGreenMesh,
        ewRedMesh,
        ewGreenMesh
      });
    });

    // 3. Korean Sidewalks & Granite Curbstones (보도블록 및 화강석 경계석)
    const sidewalkMat = new THREE.MeshLambertMaterial({ 
      color: 0xcbd5e1,
      polygonOffset: true,
      polygonOffsetFactor: -6.0,
      polygonOffsetUnits: -6.0
    });
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x64748b });

    [-13.5, 13.5].forEach(swX => {
      const swGeo = new THREE.BoxGeometry(4.5, 0.18, 220);
      const sw = new THREE.Mesh(swGeo, sidewalkMat);
      sw.position.set(swX, 0.14, 0);
      roadGroup.add(sw);

      // Granite curb
      const curbGeo = new THREE.BoxGeometry(0.25, 0.22, 218);
      const curbMesh = new THREE.Mesh(curbGeo, curbMat);
      const curbX = swX > 0 ? swX - 2.25 : swX + 2.25;
      curbMesh.position.set(curbX, 0.16, 0);
      roadGroup.add(curbMesh);
    });

    crosswayZs.forEach(cz => {
      [-10.2, 10.2].forEach(offZ => {
        const cSwGeo = new THREE.BoxGeometry(160, 0.18, 4.0);
        const cSw = new THREE.Mesh(cSwGeo, sidewalkMat);
        cSw.position.set(0, 0.14, cz + offZ);
        roadGroup.add(cSw);

        const cCurbGeo = new THREE.BoxGeometry(158, 0.22, 0.25);
        const cCurbMesh = new THREE.Mesh(cCurbGeo, curbMat);
        cCurbMesh.position.set(0, 0.16, cz + (offZ > 0 ? offZ - 1.9 : offZ + 1.9));
        roadGroup.add(cCurbMesh);
      });
    });

    // 4. Han River Waterfront & Olympic Expressway Road Surface (올림픽대로 6차선 고속화도로 아스팔트 노면)
    const olympicExpGeo = new THREE.PlaneGeometry(280, 16);
    const olympicExpRoad = new THREE.Mesh(olympicExpGeo, crossRoadMat);
    olympicExpRoad.rotation.x = -Math.PI / 2;
    olympicExpRoad.position.set(0, 0.12, 125);
    roadGroup.add(olympicExpRoad);

    // Olympic Expressway Yellow Centerline & Lane Markings
    const oYLine = new THREE.Mesh(new THREE.PlaneGeometry(276, 0.4), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    oYLine.rotation.x = -Math.PI / 2;
    oYLine.position.set(0, 0.14, 125);
    roadGroup.add(oYLine);

    // 5. Overhead Korean Highway & Street Gantry Signboards (도로 이정표 안내 표지판 - 넓은 통과 폭 적용)
    const gantryConfigs = [
      { z: -10, kr: '여의대로 / 파크원', en: 'Yeoui-daero / Parc.1', no: '46' },
      { z: 50, kr: '올림픽대로 / 63스퀘어', en: 'Olympic-daero / 63 Square', no: '88' }
    ];

    const gantryPoleMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    gantryConfigs.forEach(cfg => {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(0, 0, cfg.z);

      // Left and Right Steel Support Pillars widened to ±17.0m (outer edge of sidewalk, generous gate width)
      [-17.0, 17.0].forEach(px => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 10.5, 8), gantryPoleMat);
        pole.position.set(px, 5.25, 0);
        gantryGroup.add(pole);
      });

      // Overhead Horizontal Truss Beam (Extended to 34.4m width for generous vehicle clearance)
      const truss = new THREE.Mesh(new THREE.BoxGeometry(34.4, 0.65, 0.65), gantryPoleMat);
      truss.position.set(0, 10.0, 0);
      gantryGroup.add(truss);

      // Green Korean Road Direction Signboard
      const signBoard = createKoreanStreetSignMesh(cfg.kr, cfg.en, cfg.no, 8.5, 2.8);
      signBoard.position.set(0, 9.1, 0.35);
      gantryGroup.add(signBoard);

      // Backside Signboard facing opposite direction
      const signBoardBack = signBoard.clone();
      signBoardBack.position.z = -0.35;
      signBoardBack.rotation.y = Math.PI;
      gantryGroup.add(signBoardBack);

      roadGroup.add(gantryGroup);
    });

    this.scene.add(roadGroup);
  }

  private buildHelipad(x: number, y: number, z: number, size: number, color: number, labelText?: string): THREE.Group {
    const padGroup = new THREE.Group();
    padGroup.renderOrder = 3;
    padGroup.position.set(x, y, z);

    // Outer circle
    const circleGeo = new THREE.CircleGeometry(size / 2, 32);
    const circleMat = new THREE.MeshBasicMaterial({ 
      color,
      polygonOffset: true,
      polygonOffsetFactor: -6.0,
      polygonOffsetUnits: -6.0
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    padGroup.add(circle);

    // Inner ring
    const ringGeo = new THREE.RingGeometry(size / 2 - 0.5, size / 2, 32);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -8.0,
      polygonOffsetUnits: -8.0
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    padGroup.add(ring);

    // Letter 'H'
    const hBarMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -10.0,
      polygonOffsetUnits: -10.0
    });
    const hBar1 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.2), hBarMat);
    hBar1.rotation.x = -Math.PI / 2;
    hBar1.position.set(-1.1, 0.05, 0);
    padGroup.add(hBar1);

    const hBar2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.2), hBarMat);
    hBar2.rotation.x = -Math.PI / 2;
    hBar2.position.set(1.1, 0.05, 0);
    padGroup.add(hBar2);

    const hBarMid = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.6), hBarMat);
    hBarMid.rotation.x = -Math.PI / 2;
    hBarMid.position.set(0, 0.05, 0);
    padGroup.add(hBarMid);

    this.scene.add(padGroup);
    return padGroup;
  }

  private buildGuidanceLineSystem() {
    // 1. Augmented Reality 3D Quest Flight Trajectory Line (64 interpolated points along obstacle-free corridor)
    const initialPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 64; i++) {
      initialPoints.push(new THREE.Vector3(0, 0, 0));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(initialPoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false
    });
    this.missionGuidanceLine = new THREE.Line(lineGeo, lineMat);
    this.missionGuidanceLine.renderOrder = 9999;
    this.missionGuidanceGroup.add(this.missionGuidanceLine);

    // 2. Animated Flowing Holographic Pulse Orbs along the Trajectory
    this.guidancePulseOrbs = [];
    const orbGeo = new THREE.SphereGeometry(0.22, 12, 12);
    for (let i = 0; i < 8; i++) {
      const orbMat = new THREE.MeshBasicMaterial({
        color: 0xff0033,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.renderOrder = 9999;
      this.missionGuidanceGroup.add(orb);
      this.guidancePulseOrbs.push(orb);
    }
    this.missionGuidanceGroup.visible = false;
    this.scene.add(this.missionGuidanceGroup);

    // 3. 3D Destination Target Holo-Beacon
    this.guidanceBeaconRings = [];
    
    // Concentric Target Reticle Rings
    [1.6, 2.6, 3.8].forEach((r, idx) => {
      const rGeo = new THREE.RingGeometry(r - 0.12, r + 0.12, 32);
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xff0033,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75 - idx * 0.15,
        depthTest: false,
        depthWrite: false
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 9998;
      this.guidanceBeaconGroup.add(ring);
      this.guidanceBeaconRings.push(ring);
    });

    // Downward Guidance Pointer Cone
    const coneGeo = new THREE.ConeGeometry(0.6, 1.4, 8);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false
    });
    this.guidanceBeaconCone = new THREE.Mesh(coneGeo, coneMat);
    this.guidanceBeaconCone.rotation.x = Math.PI; // Pointing down
    this.guidanceBeaconCone.position.y = 1.8;
    this.guidanceBeaconCone.renderOrder = 9999;
    this.guidanceBeaconGroup.add(this.guidanceBeaconCone);

    // High Altitude Sky Vertical Laser Beam
    const beamGeo = new THREE.CylinderGeometry(0.25, 0.25, 60, 12);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.55,
      depthTest: false,
      depthWrite: false
    });
    this.guidanceBeaconBeam = new THREE.Mesh(beamGeo, beamMat);
    this.guidanceBeaconBeam.position.y = 30;
    this.guidanceBeaconBeam.renderOrder = 9997;
    this.guidanceBeaconGroup.add(this.guidanceBeaconBeam);

    this.guidanceBeaconGroup.visible = false;
    this.scene.add(this.guidanceBeaconGroup);
  }

  private buildBuildings() {
    // Modern Architectural Colors (Azure Glass, Architectural White, Sapphire Glass, Limestone, Slate, Steel)
    const buildingColors = [0x38bdf8, 0xf8fafc, 0x0284c7, 0xe2e8f0, 0x475569, 0x64748b, 0x0ea5e9];

    // Streamlined building distribution with wide open flight corridors:
    const buildingSpecs: {
      x: number;
      z: number;
      w: number;
      d: number;
      h: number;
      color: number;
      hasTunnel?: boolean;
      tunnelY?: number;
      tunnelW?: number;
      tunnelH?: number;
      isRescueRooftop?: boolean;
      isHospital?: boolean;
      southSignText?: string;
      southIsEntrance?: boolean;
      northSignText?: string;
      northIsEntrance?: boolean;
    }[] = [
      // Left boulevard & West Tech District
      { 
        x: -35, z: -40, w: 26, d: 24, h: 34, color: 0, 
        hasTunnel: true, tunnelY: 12.0, tunnelW: 16.0, tunnelH: 9.0,
        southSignText: '[ OUT ▶ 알파 빌딩 관통 출구 ]', // +Z face (front face seen from plaza/photo -> EXIT)
        southIsEntrance: false,
        northSignText: '[ IN ▶ 알파 빌딩 진입 입구 ]', // -Z face (back of building -> ENTRANCE)
        northIsEntrance: true
      },
      { 
        x: -70, z: -20, w: 26, d: 24, h: 42, color: 4, 
        hasTunnel: true, tunnelY: 20.0, tunnelW: 16.0, tunnelH: 9.0,
        southSignText: '[ SKYBRIDGE ▶ 스카이브릿지 연결 ]', // +Z face (connects to skybridge)
        southIsEntrance: false,
        northSignText: '[ IN ▶ 트윈 타워 진입 입구 ]', // -Z face (approached from Alpha exit heading to +Z)
        northIsEntrance: true
      },
      { 
        x: -70, z: 30, w: 26, d: 24, h: 38, color: 1, 
        hasTunnel: true, tunnelY: 20.0, tunnelW: 16.0, tunnelH: 9.0, isRescueRooftop: true,
        southSignText: '[ OUT ▶ 트윈 타워 관통 출구 ]', // +Z face (exit to North crossway heading to +Z)
        southIsEntrance: false,
        northSignText: '[ SKYBRIDGE ▶ 트윈타워 북측 진입 ]', // -Z face (receives skybridge)
        northIsEntrance: true
      },
      { x: -115, z: 20, w: 22, d: 22, h: 36, color: 2 }, // NCSOFT 판교/여의도 R&D 센터
      { x: -50, z: 90, w: 22, d: 22, h: 36, color: 5 },  // PEARLABYSS 펄어비스 홈원 (북서측 외곽으로 완전 격리)
      { x: -48, z: 20, w: 20, d: 20, h: 32, color: 3 },  // 당근마켓 DANGGEUN 본사 (서측 외곽으로 격리)
      { x: -85, z: 88, w: 22, d: 20, h: 34, color: 0 },  // 우리금융그룹 WOORI 금융센터

      // Right boulevard & East Tech/Media District
      { x: 48, z: -40, w: 22, d: 22, h: 46, color: 5 },  // KRX 한국거래소 여의도 본부 메인 타워
      { x: 50, z: 0, w: 20, d: 20, h: 34, color: 2 },    // SAMSUNG 서초/여의도 AI 연구소 (동측 외곽으로 격리)
      { 
        x: 35, z: 40, w: 26, d: 24, h: 34, color: 3, 
        hasTunnel: true, tunnelY: 14.0, tunnelW: 16.0, tunnelH: 9.0,
        southSignText: '[ IN ▶ 감마 빌딩 진입 입구 ]', // +Z face (approached from Twin Tower crossway heading to -Z)
        southIsEntrance: true,
        northSignText: '[ OUT ▶ 감마 빌딩 관통 출구 ]', // -Z face (exit towards Finish Gate heading to -Z)
        northIsEntrance: false
      },
      { x: 80, z: -20, w: 26, d: 28, h: 24, color: 6, isHospital: true }, // 119 항공구조 외상센터
      { x: 80, z: 30, w: 24, d: 26, h: 36, color: 5 },   // KRAFTON 크래프톤 배틀그라운드 스튜디오
      { x: 120, z: 65, w: 22, d: 22, h: 36, color: 1 },  // SMILEGATE 스마일게이트 본사
      { x: 50, z: 90, w: 22, d: 22, h: 36, color: 4 },   // CJ ENM 엔터테인먼트 타워 (북동측 외곽으로 완전 격리)
      { x: 80, z: 88, w: 22, d: 20, h: 34, color: 2 },   // LINE 라인 글로벌 소프트웨어 연구소

      // North Yeouido Financial & Tech Skyline (여의도 금융타워 - 국회의사당 및 북측 회랑과 완전 격리)
      { x: -110, z: -95, w: 24, d: 20, h: 42, color: 0 }, // SK TELECOM T-TOWER
      { x: -80, z: -95, w: 22, d: 20, h: 40, color: 4 },  // KB국민은행 여의도 본점 신관
      { x: -45, z: -95, w: 22, d: 20, h: 40, color: 2 },  // 신한투자증권 여의도 금융타워
      { x: 45, z: -95, w: 22, d: 20, h: 40, color: 1 },   // 미래에셋증권 글로벌 금융타워
      { x: 80, z: -95, w: 22, d: 20, h: 40, color: 3 },   // 하나금융그룹 글로벌 본사
      { x: 110, z: -95, w: 24, d: 20, h: 42, color: 4 },  // HYUNDAI 현대자동차 AAM 연구소
    ];

    // Build Skybridge Connecting Twin Towers at x: -70 (between z: -8 and z: 18)
    const skybridgeGroup = new THREE.Group();
    skybridgeGroup.position.set(-70, 20.0, 5.0);

    // Skybridge Bottom Walkway (Spanning between the two towers, 18m wide)
    const sbFloor = new THREE.Mesh(
      new THREE.BoxGeometry(18.0, 1.2, 28.0),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    sbFloor.position.y = -4.75;
    skybridgeGroup.add(sbFloor);

    // Skybridge Top Roof (18m wide)
    const sbRoof = new THREE.Mesh(
      new THREE.BoxGeometry(18.0, 1.2, 28.0),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    sbRoof.position.y = 4.75;
    skybridgeGroup.add(sbRoof);

    // Skybridge Solid Enclosing Side Walls (Left & Right)
    const sbSideWallGeo = new THREE.BoxGeometry(1.2, 8.5, 28.0);
    const sbSideWallMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const sbGlassMat = new THREE.MeshLambertMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75
    });

    [-8.4, 8.4].forEach(ex => {
      // Solid base side wall
      const wallMesh = new THREE.Mesh(sbSideWallGeo, sbSideWallMat);
      wallMesh.position.set(ex, 0, 0);
      skybridgeGroup.add(wallMesh);

      // Glass viewing window strips on side facade
      for (let wz = -10; wz <= 10; wz += 5) {
        const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(1.26, 4.2, 3.8), sbGlassMat);
        glassMesh.position.set(ex, 0.2, wz);
        skybridgeGroup.add(glassMesh);
      }
    });

    // Clean Architectural Steel Edge Trims along Floor and Roof
    const edgeTrimGeo = new THREE.BoxGeometry(0.3, 0.4, 28.0);
    const edgeTrimMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    
    [-8.8, 8.8].forEach(ex => {
      const trimBtm = new THREE.Mesh(edgeTrimGeo, edgeTrimMat);
      trimBtm.position.set(ex, -4.15, 0);
      skybridgeGroup.add(trimBtm);

      const trimTop = new THREE.Mesh(edgeTrimGeo, edgeTrimMat);
      trimTop.position.set(ex, 4.15, 0);
      skybridgeGroup.add(trimTop);
    });

    // Skybridge Interior Warm Daylight Lighting
    const sbLightStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.2, 26.0),
      new THREE.MeshBasicMaterial({ color: 0xfffbeb })
    );
    sbLightStrip.position.y = 4.0;
    skybridgeGroup.add(sbLightStrip);

    this.scene.add(skybridgeGroup);

    // Add Skybridge Collision Boxes (Floor, Roof, Solid Left Wall, Solid Right Wall)
    const sbBoxFloor = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-70, 20.0 - 4.75, 5.0),
      new THREE.Vector3(18.0, 1.2, 28.0)
    );
    const sbBoxRoof = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-70, 20.0 + 4.75, 5.0),
      new THREE.Vector3(18.0, 1.2, 28.0)
    );
    const sbBoxLeftWall = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-70 - 8.4, 20.0, 5.0),
      new THREE.Vector3(1.4, 9.0, 28.0)
    );
    const sbBoxRightWall = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-70 + 8.4, 20.0, 5.0),
      new THREE.Vector3(1.4, 9.0, 28.0)
    );
    this.buildingBoxes.push(sbBoxFloor, sbBoxRoof, sbBoxLeftWall, sbBoxRightWall);

    // Build Grand Park Entrance Arch Portal at [0, 5.0, -25] (Widened to 32m for 8-lane unobstructed roadway & sidewalk clearance)
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -25);

    const archPillarGeo = new THREE.BoxGeometry(2.0, 11.5, 2.0);
    const archPillarMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const archPillarL = new THREE.Mesh(archPillarGeo, archPillarMat);
    archPillarL.position.set(-16.0, 5.75, 0);
    archGroup.add(archPillarL);

    const archPillarR = new THREE.Mesh(archPillarGeo, archPillarMat);
    archPillarR.position.set(16.0, 5.75, 0);
    archGroup.add(archPillarR);

    const archBeamGeo = new THREE.BoxGeometry(34.0, 2.2, 2.0);
    const archBeamMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const archBeam = new THREE.Mesh(archBeamGeo, archBeamMat);
    archBeam.position.set(0, 10.5, 0);
    archGroup.add(archBeam);

    // Park Arch Signboard Header
    const archTrimMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const archTrim = new THREE.Mesh(new THREE.BoxGeometry(32.0, 0.4, 2.2), archTrimMat);
    archTrim.position.set(0, 9.2, 0);
    archGroup.add(archTrim);

    this.scene.add(archGroup);

    // Add Arch Collision Boxes (Left Pillar, Right Pillar, Top Beam)
    this.buildingBoxes.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-16.0, 5.75, -25), new THREE.Vector3(2.0, 11.5, 2.0)),
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(16.0, 5.75, -25), new THREE.Vector3(2.0, 11.5, 2.0)),
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 10.5, -25), new THREE.Vector3(34.0, 2.2, 2.0))
    );

    buildingSpecs.forEach(spec => {
      const bGroup = new THREE.Group();
      const colorHex = spec.isHospital ? 0xf8fafc : buildingColors[spec.color % buildingColors.length];
      const winTex = createBuildingWindowTexture(colorHex, spec.isHospital ? '#67e8f9' : '#7dd3fc', Math.max(6, Math.floor(spec.h / 3)), 6);
      winTex.repeat.set(Math.max(1, Math.round(spec.w / 8)), Math.max(1, Math.round(spec.h / 8)));
      const mat = new THREE.MeshLambertMaterial({ 
        color: 0xffffff,
        map: winTex
      });

      if (spec.hasTunnel && spec.tunnelY && spec.tunnelW && spec.tunnelH) {
        // Construct Solid Building with Straight Front-to-Back Penetration Tunnel!
        const btmHeight = spec.tunnelY - (spec.tunnelH / 2);
        const topHeight = spec.h - (spec.tunnelY + (spec.tunnelH / 2));
        const pillarW = (spec.w - spec.tunnelW) / 2;

        // 1. Solid Bottom Base Section (Full width & depth)
        const btmGeo = new THREE.BoxGeometry(spec.w, btmHeight, spec.d);
        const btmMesh = new THREE.Mesh(btmGeo, mat);
        btmMesh.position.set(spec.x, btmHeight / 2, spec.z);
        btmMesh.castShadow = true;
        btmMesh.receiveShadow = true;
        this.scene.add(btmMesh);

        // 2. Solid Top Roof Section (Full width & depth)
        const topGeo = new THREE.BoxGeometry(spec.w, topHeight, spec.d);
        const topMesh = new THREE.Mesh(topGeo, mat);
        topMesh.position.set(spec.x, spec.h - topHeight / 2, spec.z);
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        this.scene.add(topMesh);

        // 3. Solid Left Wall (Enclosing side of tunnel completely)
        const pillLGeo = new THREE.BoxGeometry(pillarW, spec.tunnelH, spec.d);
        const pillLMesh = new THREE.Mesh(pillLGeo, mat);
        pillLMesh.position.set(spec.x - (spec.w / 2) + (pillarW / 2), spec.tunnelY, spec.z);
        pillLMesh.castShadow = true;
        pillLMesh.receiveShadow = true;
        this.scene.add(pillLMesh);

        // 4. Solid Right Wall (Enclosing side of tunnel completely)
        const pillRGeo = new THREE.BoxGeometry(pillarW, spec.tunnelH, spec.d);
        const pillRMesh = new THREE.Mesh(pillRGeo, mat);
        pillRMesh.position.set(spec.x + (spec.w / 2) - (pillarW / 2), spec.tunnelY, spec.z);
        pillRMesh.castShadow = true;
        pillRMesh.receiveShadow = true;
        this.scene.add(pillRMesh);

        // Modern Clean Gate Portals at Entrance (Front) and Exit (Back)
        const portalColor = spec.color === 0 ? 0x0284c7 : 0xe11d48;
        const portalMat = new THREE.MeshLambertMaterial({ color: portalColor });

        // South-facing Portal (+Z face)
        const southPortal = new THREE.Group();
        southPortal.position.set(spec.x, spec.tunnelY, spec.z + spec.d / 2 + 0.1);

        const portalTop = new THREE.Mesh(new THREE.BoxGeometry(spec.tunnelW + 0.8, 0.4, 0.4), portalMat);
        portalTop.position.y = spec.tunnelH / 2;
        southPortal.add(portalTop);

        const portalBtm = new THREE.Mesh(new THREE.BoxGeometry(spec.tunnelW + 0.8, 0.4, 0.4), portalMat);
        portalBtm.position.y = -spec.tunnelH / 2;
        southPortal.add(portalBtm);

        const portalL = new THREE.Mesh(new THREE.BoxGeometry(0.4, spec.tunnelH, 0.4), portalMat);
        portalL.position.x = -spec.tunnelW / 2;
        southPortal.add(portalL);

        const portalR = new THREE.Mesh(new THREE.BoxGeometry(0.4, spec.tunnelH, 0.4), portalMat);
        portalR.position.x = spec.tunnelW / 2;
        southPortal.add(portalR);

        // Directional Runway Chevron Arrow
        const arrowGeo = new THREE.ConeGeometry(0.4, 0.9, 4);
        const arrowMesh = new THREE.Mesh(arrowGeo, portalMat);
        arrowMesh.position.y = spec.tunnelH / 2 + 0.8;
        arrowMesh.rotation.x = Math.PI;
        southPortal.add(arrowMesh);

        // 3D Signboard on South face (+Z face)
        const southSignText = spec.southSignText || '[ IN ▶ 진입 입구 ]';
        const southIsEntrance = spec.southIsEntrance !== undefined ? spec.southIsEntrance : true;
        const southSign = createSignBoardMesh(southSignText, southIsEntrance, Math.min(spec.tunnelW + 1.2, 7.5), 1.2);
        southSign.position.set(0, spec.tunnelH / 2 + 1.2, 0.05);
        southPortal.add(southSign);

        this.scene.add(southPortal);

        // North-facing Portal (-Z face)
        const northPortal = southPortal.clone();
        northPortal.position.z = spec.z - spec.d / 2 - 0.1;
        northPortal.rotation.y = Math.PI; // Face outwards towards rear (-Z)

        // Replace signboard on North face with the north specific signboard
        const northChildrenToRemove: THREE.Object3D[] = [];
        northPortal.children.forEach(c => {
          if ((c as THREE.Mesh).isMesh && c.position.y > spec.tunnelH / 2 + 0.5) {
            northChildrenToRemove.push(c);
          }
        });
        northChildrenToRemove.forEach(c => northPortal.remove(c));

        const northSignText = spec.northSignText || '[ OUT ▶ 관통 출구 ]';
        const northIsEntrance = spec.northIsEntrance !== undefined ? spec.northIsEntrance : false;
        const northSign = createSignBoardMesh(northSignText, northIsEntrance, Math.min(spec.tunnelW + 1.2, 7.5), 1.2);
        northSign.position.set(0, spec.tunnelH / 2 + 1.2, 0.05);
        northPortal.add(northSign);

        this.scene.add(northPortal);

        // Interior Ceiling Light Strip
        const ceilingStrip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, spec.d), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
        ceilingStrip.position.set(spec.x, spec.tunnelY + spec.tunnelH / 2 - 0.1, spec.z);
        this.scene.add(ceilingStrip);

        // Roof edge trim
        const trimGeo = new THREE.BoxGeometry(spec.w + 0.6, 0.8, spec.d + 0.6);
        const trimMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.set(spec.x, spec.h + 0.4, spec.z);
        this.scene.add(trim);

        // If high-rise rescue rooftop helipad
        if (spec.isRescueRooftop) {
          const rPadGeo = new THREE.CircleGeometry(4.2, 32);
          const rPadMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
          const rPad = new THREE.Mesh(rPadGeo, rPadMat);
          rPad.rotation.x = -Math.PI / 2;
          rPad.position.set(spec.x, spec.h + 0.82, spec.z);
          this.scene.add(rPad);
        }

        // Register Collision Boxes (Bottom, Top, Solid Left Wall, Solid Right Wall)
        this.buildingBoxes.push(
          new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(spec.x, btmHeight / 2, spec.z),
            new THREE.Vector3(spec.w, btmHeight, spec.d)
          ),
          new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(spec.x, spec.h - topHeight / 2, spec.z),
            new THREE.Vector3(spec.w, topHeight, spec.d)
          ),
          new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(spec.x - (spec.w / 2) + (pillarW / 2), spec.tunnelY, spec.z),
            new THREE.Vector3(pillarW, spec.tunnelH, spec.d)
          ),
          new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(spec.x + (spec.w / 2) - (pillarW / 2), spec.tunnelY, spec.z),
            new THREE.Vector3(pillarW, spec.tunnelH, spec.d)
          )
        );

        return; // Skip default solid building construction
      }

      bGroup.position.set(spec.x, spec.h / 2, spec.z);

      const geo = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      bGroup.add(mesh);

      // Roof edge trim
      const trimGeo = new THREE.BoxGeometry(spec.w + 0.6, 0.8, spec.d + 0.6);
      const trimMat = new THREE.MeshLambertMaterial({ color: spec.isHospital ? 0xef4444 : 0x475569 });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.y = spec.h / 2 + 0.4;
      bGroup.add(trim);

      // Special structures
      if (spec.isHospital) {
        this.hospitalMesh = bGroup;
        // Hospital rooftop red cross helipad
        const hPadGeo = new THREE.CircleGeometry(4.8, 32);
        const hPadMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const hPad = new THREE.Mesh(hPadGeo, hPadMat);
        hPad.rotation.x = -Math.PI / 2;
        hPad.position.y = spec.h / 2 + 0.82;
        bGroup.add(hPad);

        // Helipad Outer Yellow Ring
        const ringGeo = new THREE.RingGeometry(4.6, 4.9, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
        const yRing = new THREE.Mesh(ringGeo, ringMat);
        yRing.rotation.x = -Math.PI / 2;
        yRing.position.y = spec.h / 2 + 0.83;
        bGroup.add(yRing);

        // Red cross on helipad
        const cross1 = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 5.0), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        cross1.rotation.x = -Math.PI / 2;
        cross1.position.y = spec.h / 2 + 0.85;
        bGroup.add(cross1);
        const cross2 = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.4), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        cross2.rotation.x = -Math.PI / 2;
        cross2.position.y = spec.h / 2 + 0.85;
        bGroup.add(cross2);

        // Hospital Rooftop Operating Room (OR) Elevator Airlock Building
        const orBuilding = new THREE.Group();
        orBuilding.position.set(0, spec.h / 2 + 2.0, -9.0);
        
        const orBoxGeo = new THREE.BoxGeometry(6.5, 3.6, 4.5);
        const orBoxMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
        const orBox = new THREE.Mesh(orBoxGeo, orBoxMat);
        orBuilding.add(orBox);

        // OR Entrance Frame
        const doorFrameGeo = new THREE.BoxGeometry(3.6, 2.6, 0.4);
        const doorFrameMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
        const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
        doorFrame.position.set(0, -0.5, 2.26);
        orBuilding.add(doorFrame);

        // OR Sliding Double Doors
        const doorMat = new THREE.MeshLambertMaterial({ 
          color: 0x38bdf8
        });
        const doorGeoL = new THREE.BoxGeometry(1.5, 2.3, 0.1);
        this.hospitalORDoorLeft = new THREE.Mesh(doorGeoL, doorMat);
        this.hospitalORDoorLeft.position.set(-0.8, -0.5, 2.3);
        orBuilding.add(this.hospitalORDoorLeft);

        const doorGeoR = new THREE.BoxGeometry(1.5, 2.3, 0.1);
        this.hospitalORDoorRight = new THREE.Mesh(doorGeoR, doorMat);
        this.hospitalORDoorRight.position.set(0.8, -0.5, 2.3);
        orBuilding.add(this.hospitalORDoorRight);

        // Green Medical Cross Sign above OR door
        const orSignGeo = new THREE.BoxGeometry(2.4, 0.8, 0.3);
        const orSignMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
        const orSign = new THREE.Mesh(orSignGeo, orSignMat);
        orSign.position.set(0, 1.2, 2.35);
        orBuilding.add(orSign);

        bGroup.add(orBuilding);
        this.hospitalORGroup = orBuilding;

        // 3D Doctor / Paramedic Team on Rooftop Helipad
        this.hospitalDoctors = [];
        const docConfigs = [
          { x: -3.2, z: 2.0, rotY: Math.PI / 4 },
          { x: 3.2, z: 2.0, rotY: -Math.PI / 4 }
        ];

        docConfigs.forEach((cfg) => {
          const docGroup = new THREE.Group();
          docGroup.position.set(cfg.x, spec.h / 2 + 0.85, cfg.z);
          docGroup.rotation.y = cfg.rotY;

          // Body / White Medical Coat
          const coatGeo = new THREE.CylinderGeometry(0.32, 0.4, 1.0, 12);
          const coatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
          const coat = new THREE.Mesh(coatGeo, coatMat);
          coat.position.y = 0.5;
          docGroup.add(coat);

          // Head with Medical Scrub Cap
          const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
          const headMat = new THREE.MeshLambertMaterial({ color: 0x059669 }); // Emerald scrub cap
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.y = 1.15;
          docGroup.add(head);

          // Stethoscope / ID Badge
          const stethGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 16);
          const stethMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
          const steth = new THREE.Mesh(stethGeo, stethMat);
          steth.position.set(0, 0.85, 0.28);
          steth.rotation.x = Math.PI / 4;
          docGroup.add(steth);

          // Marshaling Safety Baton (Flashing Green)
          const wandGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
          const wandMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
          const wand = new THREE.Mesh(wandGeo, wandMat);
          wand.position.set(0.35, 0.7, 0.3);
          wand.rotation.x = -Math.PI / 4;
          docGroup.add(wand);

          bGroup.add(docGroup);
          this.hospitalDoctors.push(docGroup);
        });

        // Hospital Facade Red Cross
        const fCross1 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 8.0), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        fCross1.position.set(0, 0, spec.d / 2 + 0.1);
        bGroup.add(fCross1);
        const fCross2 = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 2.0), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        fCross2.position.set(0, 0, spec.d / 2 + 0.1);
        bGroup.add(fCross2);

        // Ground Ambulance Vehicle at Entrance
        const ambGroup = new THREE.Group();
        ambGroup.position.set(6, -spec.h / 2 + 1.2, spec.d / 2 + 3.5);
        
        // Ambulance Body
        const ambBody = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 2.2, 5.0),
          new THREE.MeshLambertMaterial({ color: 0xffffff })
        );
        ambGroup.add(ambBody);

        // Red stripe
        const ambStripe = new THREE.Mesh(
          new THREE.BoxGeometry(2.64, 0.4, 4.8),
          new THREE.MeshBasicMaterial({ color: 0xdc2626 })
        );
        ambStripe.position.y = 0.1;
        ambGroup.add(ambStripe);

        // Flashing Emergency Beacon on Ambulance
        const ambBeacon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.2, 8),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        ambBeacon.position.y = 1.2;
        ambGroup.add(ambBeacon);

        bGroup.add(ambGroup);
      }

      // Authentic Korean Brand Signage & Corporate Headquarters (네이버, 넥슨, 넷마블, 크래프톤, 삼성, 카카오, SK, 현대, 엔씨소프트, 스마일게이트, 펄어비스, KB, 신한, 하나, 우리, KRX, 미래에셋, 올리브영, 무신사, 다이소, 스타벅스, 배민, 쿠팡, 당근 등)
      if (spec.x === -35 && spec.z === -40) {
        // Alpha Building (x: -35, z: -40): NAVER 1784 사옥 + CU 편의점 + 토스 TOSS 혁신 캠퍼스
        const naverSign = createKoreanStoreSignMesh('NAVER', 14, 5.5);
        naverSign.position.set(spec.w / 2 + 0.08, spec.h / 2 - 4.5, 0);
        naverSign.rotation.y = Math.PI / 2;
        bGroup.add(naverSign);

        const cuSign = createKoreanStoreSignMesh('CU', 10, 4.0);
        cuSign.position.set(spec.w / 2 + 0.08, 2.5, 3.5);
        cuSign.rotation.y = Math.PI / 2;
        bGroup.add(cuSign);

        const cuAwning = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.35, 10.4),
          new THREE.MeshLambertMaterial({ color: 0x6b21a8 })
        );
        cuAwning.position.set(spec.w / 2 + 0.7, 4.6, 3.5);
        bGroup.add(cuAwning);

        const tossSign = createKoreanStoreSignMesh('TOSS', 13, 5.0);
        tossSign.position.set(0, spec.h / 2 - 4.5, -spec.d / 2 - 0.08);
        tossSign.rotation.y = Math.PI;
        bGroup.add(tossSign);
      } else if (spec.x === -70 && spec.z === -20) {
        // Twin Tower South (x: -70, z: -20): NEXON 코리아 글로벌 본사 + 무신사 스탠다드 K-패션 플래그십 + 다이소
        const nexonSign = createKoreanStoreSignMesh('NEXON', 15, 5.8);
        nexonSign.position.set(spec.w / 2 + 0.08, spec.h / 2 - 4.5, 0);
        nexonSign.rotation.y = Math.PI / 2;
        bGroup.add(nexonSign);

        const musinsaSign = createKoreanStoreSignMesh('MUSINSA', 13, 4.8);
        musinsaSign.position.set(0, spec.h / 2 - 4.5, -spec.d / 2 - 0.08);
        musinsaSign.rotation.y = Math.PI;
        bGroup.add(musinsaSign);

        const musinsaAwning = new THREE.Mesh(
          new THREE.BoxGeometry(14.4, 0.4, 1.5),
          new THREE.MeshLambertMaterial({ color: 0x18181b })
        );
        musinsaAwning.position.set(0, 4.8, -spec.d / 2 - 0.75);
        bGroup.add(musinsaAwning);

        const daisoSign = createKoreanStoreSignMesh('DAISO', 12, 4.5);
        daisoSign.position.set(0, 8.0, spec.d / 2 + 0.08);
        bGroup.add(daisoSign);
      } else if (spec.x === -70 && spec.z === 30) {
        // Twin Tower North (x: -70, z: 30): NETMARBLE 지타워 (G-TOWER) 본사 + PEARLABYSS
        const netmarbleSign = createKoreanStoreSignMesh('NETMARBLE', 15, 5.8);
        netmarbleSign.position.set(spec.w / 2 + 0.08, spec.h / 2 - 4.5, 0);
        netmarbleSign.rotation.y = Math.PI / 2;
        bGroup.add(netmarbleSign);

        const pearlSign = createKoreanStoreSignMesh('PEARLABYSS', 13, 4.8);
        pearlSign.position.set(0, spec.h / 2 - 4.5, spec.d / 2 + 0.08);
        bGroup.add(pearlSign);
      } else if (spec.x === -110 && spec.z === 20) {
        // NCSOFT R&D 센터 (x: -110, z: 20)
        const ncSign = createKoreanStoreSignMesh('NCSOFT', 15, 5.8);
        ncSign.position.set(spec.w / 2 + 0.08, spec.h / 2 - 4.5, 0);
        ncSign.rotation.y = Math.PI / 2;
        bGroup.add(ncSign);
      } else if (spec.x === -35 && spec.z === 70) {
        // PEARLABYSS 홈원 사옥 (x: -35, z: 70)
        const pearlSign2 = createKoreanStoreSignMesh('PEARLABYSS', 14, 5.5);
        pearlSign2.position.set(0, spec.h / 2 - 4.5, -spec.d / 2 - 0.08);
        pearlSign2.rotation.y = Math.PI;
        bGroup.add(pearlSign2);
      } else if (spec.x === -35 && spec.z === 20) {
        // 당근마켓 본사 (x: -35, z: 20)
        const dgSign = createKoreanStoreSignMesh('DANGGEUN', 14, 5.2);
        dgSign.position.set(spec.w / 2 + 0.08, spec.h / 2 - 4.5, 0);
        dgSign.rotation.y = Math.PI / 2;
        bGroup.add(dgSign);
      } else if (spec.x === -70 && spec.z === 75) {
        // 우리금융그룹 WOORI 금융센터 (x: -70, z: 75)
        const wooriSign = createKoreanStoreSignMesh('WOORI', 14, 5.2);
        wooriSign.position.set(0, spec.h / 2 - 4.5, -spec.d / 2 - 0.08);
        wooriSign.rotation.y = Math.PI;
        bGroup.add(wooriSign);
      } else if (spec.x === 35 && spec.z === 0) {
        // SAMSUNG 전자 AI 연구센터 + 올리브영 플래그십 + 스타벅스 DT + 메가커피 (x: 35, z: 0)
        const samsungSign = createKoreanStoreSignMesh('SAMSUNG', 15, 5.8);
        samsungSign.position.set(-spec.w / 2 - 0.08, spec.h / 2 - 4.0, 0);
        samsungSign.rotation.y = -Math.PI / 2;
        bGroup.add(samsungSign);

        const oySign = createKoreanStoreSignMesh('OLIVE_YOUNG', 13, 5.0);
        oySign.position.set(0, spec.h / 2 - 4.0, -spec.d / 2 - 0.08);
        oySign.rotation.y = Math.PI;
        bGroup.add(oySign);

        const oyAwning = new THREE.Mesh(
          new THREE.BoxGeometry(13.4, 0.35, 1.6),
          new THREE.MeshLambertMaterial({ color: 0x84cc16 })
        );
        oyAwning.position.set(0, 4.8, -spec.d / 2 - 0.8);
        bGroup.add(oyAwning);

        const sbSign = createKoreanStoreSignMesh('STARBUCKS', 12, 4.5);
        sbSign.position.set(-spec.w / 2 - 0.08, 2.8, 4.5);
        sbSign.rotation.y = -Math.PI / 2;
        bGroup.add(sbSign);

        const sbAwning = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.35, 12.4),
          new THREE.MeshLambertMaterial({ color: 0x006241 })
        );
        sbAwning.position.set(-spec.w / 2 - 0.8, 5.2, 4.5);
        bGroup.add(sbAwning);

        // Outdoor Cafe Parasols
        [-7.5, -4.5, 4.5, 7.5].forEach((offsetZ) => {
          const tableGroup = new THREE.Group();
          tableGroup.position.set(-spec.w / 2 - 2.8, 0, offsetZ);

          const umbrellaPole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
            new THREE.MeshLambertMaterial({ color: 0x334155 })
          );
          umbrellaPole.position.y = 1.2;
          tableGroup.add(umbrellaPole);

          const umbrellaCanopy = new THREE.Mesh(
            new THREE.ConeGeometry(1.2, 0.6, 8),
            new THREE.MeshLambertMaterial({ color: 0x006241 })
          );
          umbrellaCanopy.position.y = 2.2;
          tableGroup.add(umbrellaCanopy);

          const table = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8),
            new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
          );
          table.position.y = 0.4;
          tableGroup.add(table);

          bGroup.add(tableGroup);
        });

        const megaSign = createKoreanStoreSignMesh('MEGA_COFFEE', 11, 4.5);
        megaSign.position.set(0, 4.0, spec.d / 2 + 0.08);
        bGroup.add(megaSign);
      } else if (spec.x === 35 && spec.z === 40) {
        // Gamma Building (x: 35, z: 40): KAKAO 본사 타워 + 카카오프렌즈 스토어 + 배달의민족 B마트
        const kakaoHQSign = createKoreanStoreSignMesh('KAKAO', 15, 5.8);
        kakaoHQSign.position.set(-spec.w / 2 - 0.08, spec.h / 2 - 4.0, 0);
        kakaoHQSign.rotation.y = -Math.PI / 2;
        bGroup.add(kakaoHQSign);

        const kakaoFriendsSign = createKoreanStoreSignMesh('KAKAO_FRIENDS', 13, 5.0);
        kakaoFriendsSign.position.set(0, spec.h / 2 - 4.0, -spec.d / 2 - 0.08);
        kakaoFriendsSign.rotation.y = Math.PI;
        bGroup.add(kakaoFriendsSign);

        const kakaoAwning = new THREE.Mesh(
          new THREE.BoxGeometry(13.4, 0.35, 1.6),
          new THREE.MeshLambertMaterial({ color: 0xfacc15 })
        );
        kakaoAwning.position.set(0, 4.8, -spec.d / 2 - 0.8);
        bGroup.add(kakaoAwning);

        const baeminSign = createKoreanStoreSignMesh('BAEMIN', 13, 5.0);
        baeminSign.position.set(0, 4.5, spec.d / 2 + 0.08);
        bGroup.add(baeminSign);
      } else if (spec.isHospital) {
        // General Hospital (x: 70, z: -20): 119 항공구조 외상센터 + GS25 편의점 병원점
        const hospSign = createBillboardMesh('METRO 119 AIR RESCUE', 'Level-1 Emergency Trauma Center', 'EMERGENCY', '#dc2626', '#ffffff', 14, 5.5);
        hospSign.position.set(-spec.w / 2 - 0.08, spec.h / 2 - 3.5, 0);
        hospSign.rotation.y = -Math.PI / 2;
        bGroup.add(hospSign);

        const gsSign = createKoreanStoreSignMesh('GS25', 10, 4.0);
        gsSign.position.set(-spec.w / 2 - 0.08, 2.5, 4.5);
        gsSign.rotation.y = -Math.PI / 2;
        bGroup.add(gsSign);

        const gsAwning = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.35, 10.4),
          new THREE.MeshLambertMaterial({ color: 0x0284c7 })
        );
        gsAwning.position.set(-spec.w / 2 - 0.75, 4.6, 4.5);
        bGroup.add(gsAwning);
      } else if (spec.x === 70 && spec.z === 30) {
        // KRAFTON PUBG 스튜디오 본사 (x: 70, z: 30)
        const kraftonSign = createKoreanStoreSignMesh('KRAFTON', 15, 5.8);
        kraftonSign.position.set(-spec.w / 2 - 0.08, spec.h / 2 - 4.5, 0);
        kraftonSign.rotation.y = -Math.PI / 2;
        bGroup.add(kraftonSign);
      } else if (spec.x === 110 && spec.z === 65) {
        // SMILEGATE 엔터테인먼트 (x: 110, z: 65)
        const smileSign = createKoreanStoreSignMesh('SMILEGATE', 15, 5.8);
        smileSign.position.set(-spec.w / 2 - 0.08, spec.h / 2 - 4.5, 0);
        smileSign.rotation.y = -Math.PI / 2;
        bGroup.add(smileSign);
      } else if (spec.x === 35 && spec.z === 70) {
        // CJ ENM 글로벌 K-콘텐츠 타워 (x: 35, z: 70)
        const cjSign = createKoreanStoreSignMesh('CJ', 14, 5.2);
        cjSign.position.set(0, spec.h / 2 - 4.5, -spec.d / 2 - 0.08);
        cjSign.rotation.y = Math.PI;
        bGroup.add(cjSign);
      } else if (spec.x === 70 && spec.z === 75) {
        // LINE 라인 글로벌 소프트웨어 연구소 (x: 70, z: 75)
        const lineSign = createKoreanStoreSignMesh('LINE', 14, 5.2);
        lineSign.position.set(0, spec.h / 2 - 4.5, -spec.d / 2 - 0.08);
        lineSign.rotation.y = Math.PI;
        bGroup.add(lineSign);
      } else if (spec.x === -110 && spec.z === -80) {
        // SK TELECOM AI T-TOWER (x: -110, z: -80)
        const skSign = createKoreanStoreSignMesh('SK', 15, 5.8);
        skSign.position.set(0, spec.h / 2 - 4.5, spec.d / 2 + 0.08);
        bGroup.add(skSign);
      } else if (spec.x === -80 && spec.z === -85) {
        // KB국민은행 여의도 본점 신관 (x: -80, z: -85)
        const kbSign = createKoreanStoreSignMesh('KB', 14, 5.5);
        kbSign.position.set(0, spec.h / 2 - 4.5, spec.d / 2 + 0.08);
        bGroup.add(kbSign);
      } else if (spec.x === -40 && spec.z === -85) {
        // 신한투자증권 여의도 금융타워 (x: -40, z: -85)
        const shinhanSign = createKoreanStoreSignMesh('SHINHAN', 14, 5.5);
        shinhanSign.position.set(0, spec.h / 2 - 4.5, spec.d / 2 + 0.08);
        bGroup.add(shinhanSign);
      } else if (spec.x === 35 && spec.z === -40) {
        // KRX 한국거래소 여의도 본부 메인 타워 (x: 35, z: -40 - 삼성전자 옆건물)
        const krxSign = createKoreanStoreSignMesh('KRX', 16, 6.0);
        krxSign.position.set(-spec.w / 2 - 0.08, spec.h / 2 - 4.5, 0);
        krxSign.rotation.y = -Math.PI / 2;
        bGroup.add(krxSign);

        const krxSignFront = createKoreanStoreSignMesh('KRX', 14, 5.2);
        krxSignFront.position.set(0, spec.h / 2 - 4.5, spec.d / 2 + 0.08);
        bGroup.add(krxSignFront);
      } else if (spec.x === 40 && spec.z === -85) {
        // 미래에셋증권 글로벌 금융타워 (x: 40, z: -85)
        const miraeSign = createKoreanStoreSignMesh('MIRAE_ASSET', 14, 5.5);
        miraeSign.position.set(0, spec.h / 2 - 4.5, spec.d / 2 + 0.08);
        bGroup.add(miraeSign);
      } else if (spec.x === 80 && spec.z === -85) {
        // 하나금융그룹 글로벌 본사 (x: 80, z: -85)
        const hanaSign = createKoreanStoreSignMesh('HANA', 14, 5.5);
        hanaSign.position.set(0, spec.h / 2 - 4.5, spec.d / 2 + 0.08);
        bGroup.add(hanaSign);
      } else if (spec.x === 110 && spec.z === -80) {
        // HYUNDAI 현대자동차 AAM 연구소 (x: 110, z: -80)
        const hyundaiSign = createKoreanStoreSignMesh('HYUNDAI', 15, 5.8);
        hyundaiSign.position.set(0, spec.h / 2 - 4.5, spec.d / 2 + 0.08);
        bGroup.add(hyundaiSign);
      }

      // Rooftop HVAC Chillers & Satellite Dishes on Buildings
      const hvacGeo = new THREE.BoxGeometry(3.5, 2.0, 3.0);
      const hvacMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
      const hvac1 = new THREE.Mesh(hvacGeo, hvacMat);
      hvac1.position.set(-spec.w / 4, spec.h / 2 + 1.0, -spec.d / 4);
      bGroup.add(hvac1);

      const hvac2 = new THREE.Mesh(hvacGeo, hvacMat);
      hvac2.position.set(spec.w / 4, spec.h / 2 + 1.0, -spec.d / 4);
      bGroup.add(hvac2);

      // Satellite Dish on Rooftop
      const dishPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8),
        new THREE.MeshLambertMaterial({ color: 0x64748b })
      );
      dishPillar.position.set(spec.w / 3.5, spec.h / 2 + 0.9, spec.d / 3.5);
      bGroup.add(dishPillar);

      const dishBowl = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide })
      );
      dishBowl.position.set(spec.w / 3.5, spec.h / 2 + 1.8, spec.d / 3.5);
      dishBowl.rotation.x = -Math.PI / 3;
      dishBowl.rotation.y = Math.PI / 4;
      bGroup.add(dishBowl);

      // Ground-Floor Modern Entrance Canopy
      const canopyGeo = new THREE.BoxGeometry(7.0, 0.4, 3.5);
      const canopyMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, -spec.h / 2 + 4.2, spec.d / 2 + 1.75);
      bGroup.add(canopy);

      // Glass Entrance Lobby
      const lobbyGeo = new THREE.BoxGeometry(6.0, 3.8, 0.2);
      const lobbyMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
      const lobby = new THREE.Mesh(lobbyGeo, lobbyMat);
      lobby.position.set(0, -spec.h / 2 + 1.9, spec.d / 2 + 0.05);
      bGroup.add(lobby);

      // Rooftop Communication Masts & Flashing Red Aviation Lights on Highrises
      if (spec.h >= 32) {
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.2, 5.5, 8),
          new THREE.MeshLambertMaterial({ color: 0x64748b })
        );
        mast.position.set(0, spec.h / 2 + 2.75, 0);
        bGroup.add(mast);

        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        beacon.position.set(0, spec.h / 2 + 5.5, 0);
        bGroup.add(beacon);
        this.redWarningLights.push(beacon);
      }

      if (spec.isRescueRooftop) {
        // Yellow emergency rooftop beacon pad
        const rPadGeo = new THREE.CircleGeometry(3.5, 32);
        const rPadMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
        const rPad = new THREE.Mesh(rPadGeo, rPadMat);
        rPad.rotation.x = -Math.PI / 2;
        rPad.position.y = spec.h / 2 + 0.82;
        bGroup.add(rPad);
      }

      // Sleek Architectural Steel Corner Mullions on Buildings
      const cornerMullionMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
      
      const halfW = spec.w / 2;
      const halfD = spec.d / 2;
      [
        { cx: -halfW, cz: -halfD },
        { cx: halfW, cz: -halfD },
        { cx: -halfW, cz: halfD },
        { cx: halfW, cz: halfD }
      ].forEach(c => {
        const cLedGeo = new THREE.BoxGeometry(0.22, spec.h, 0.22);
        const cLedMesh = new THREE.Mesh(cLedGeo, cornerMullionMat);
        cLedMesh.position.set(c.cx, 0, c.cz);
        bGroup.add(cLedMesh);
      });

      this.scene.add(bGroup);

      // Register collision box
      const box = new THREE.Box3();
      box.setFromCenterAndSize(
        new THREE.Vector3(spec.x, spec.h / 2, spec.z),
        new THREE.Vector3(spec.w, spec.h, spec.d)
      );
      this.buildingBoxes.push(box);
    });
  }

  private buildTreesAndPark() {
    const parkGroup = new THREE.Group();

    // 1. Dedicated Yeouido Central Park & Civic Plaza Zone (Located safely at x: -48, z: -85 in the North-West Park district, completely clear of roads)
    const parkPlazaX = -48;
    const parkPlazaZ = -85;

    // Green lawn base surrounding plaza
    const lawnGeo = new THREE.PlaneGeometry(38, 38);
    const lawnMat = new THREE.MeshLambertMaterial({ color: 0x166534 });
    const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
    lawnMesh.rotation.x = -Math.PI / 2;
    lawnMesh.position.set(parkPlazaX, 0.04, parkPlazaZ);
    parkGroup.add(lawnMesh);

    // Stone Paver Plaza
    const plazaPaveGeo = new THREE.PlaneGeometry(28, 28);
    const plazaPaveMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const plazaPave = new THREE.Mesh(plazaPaveGeo, plazaPaveMat);
    plazaPave.rotation.x = -Math.PI / 2;
    plazaPave.position.set(parkPlazaX, 0.05, parkPlazaZ);
    parkGroup.add(plazaPave);

    // Center Park Fountain
    const fountainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(5.0, 5.5, 0.7, 16),
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    fountainBase.position.set(parkPlazaX, 0.35, parkPlazaZ);
    parkGroup.add(fountainBase);

    const waterGeo = new THREE.CircleGeometry(4.8, 16);
    const waterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.fountainWater = new THREE.Mesh(waterGeo, waterMat);
    this.fountainWater.rotation.x = -Math.PI / 2;
    this.fountainWater.position.set(parkPlazaX, 0.65, parkPlazaZ);
    parkGroup.add(this.fountainWater);

    // Park Stone Benches
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    [
      { x: -9, z: 0, rot: 0 },
      { x: 9, z: 0, rot: 0 },
      { x: 0, z: -9, rot: Math.PI / 2 },
      { x: 0, z: 9, rot: Math.PI / 2 }
    ].forEach(bPos => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 3.2), woodMat);
      bench.position.set(parkPlazaX + bPos.x, 0.35, parkPlazaZ + bPos.z);
      bench.rotation.y = bPos.rot;
      parkGroup.add(bench);
    });

    // 2. East Eco Nature Lake & Reservoir at x: 120, z: -15
    const lakeGeo = new THREE.CircleGeometry(32, 24);
    const lakeMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
    lakeMesh.rotation.x = -Math.PI / 2;
    lakeMesh.position.set(120, 0.04, -15);
    parkGroup.add(lakeMesh);

    // Sandy Beach Ring around lake
    const beachGeo = new THREE.RingGeometry(31.5, 38, 24);
    const beachMat = new THREE.MeshLambertMaterial({ color: 0xd6d3d1 }); // Sandy pebble tone
    const beachMesh = new THREE.Mesh(beachGeo, beachMat);
    beachMesh.rotation.x = -Math.PI / 2;
    beachMesh.position.set(120, 0.035, -15);
    parkGroup.add(beachMesh);

    // Lakeside Wooden Gazebo Pavilion
    const gazeboGroup = new THREE.Group();
    gazeboGroup.position.set(105, 0, 0);

    // Wooden deck
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.4, 8), woodMat);
    deck.position.y = 0.2;
    gazeboGroup.add(deck);

    // 4 Wooden pillars
    for (let p = 0; p < 4; p++) {
      const pAngle = (p * Math.PI) / 2 + Math.PI / 4;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6), woodMat);
      pillar.position.set(Math.cos(pAngle) * 2.8, 1.8, Math.sin(pAngle) * 2.8);
      gazeboGroup.add(pillar);
    }

    // Pagoda roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.6, 2.0, 8),
      new THREE.MeshLambertMaterial({ color: 0x991b1b }) // Crimson terracotta roof
    );
    roof.position.y = 4.2;
    gazeboGroup.add(roof);

    parkGroup.add(gazeboGroup);

    // Lakeside Fishing Pier Extending into Water
    const pierGeo = new THREE.BoxGeometry(3.2, 0.3, 14.0);
    const pierMesh = new THREE.Mesh(pierGeo, woodMat);
    pierMesh.position.set(132, 0.3, -10);
    parkGroup.add(pierMesh);

    this.scene.add(parkGroup);
  }

  private buildHotAirBalloons() {
    this.hotAirBalloons = [];

    const balloonConfigs = [
      {
        x: -60,
        y: 48,
        z: -75,
        radius: 5.2,
        colors: [0xef4444, 0xf97316, 0xfacc15, 0x10b981, 0x06b6d4, 0x8b5cf6], // Rainbow gore stripes
        speed: 0.6,
        phase: 0.0
      },
      {
        x: 68,
        y: 54,
        z: -45,
        radius: 5.6,
        colors: [0xd97706, 0xdc2626, 0xffffff, 0x1e3a8a], // Golden Sunset Classic
        speed: 0.45,
        phase: 2.1
      },
      {
        x: -35,
        y: 60,
        z: 70,
        radius: 4.8,
        colors: [0x0d9488, 0x38bdf8, 0xffffff, 0x84cc16], // Aero Teal Sky
        speed: 0.55,
        phase: 4.2
      }
    ];

    balloonConfigs.forEach(cfg => {
      const bGroup = new THREE.Group();
      bGroup.position.set(cfg.x, cfg.y, cfg.z);

      // Streamlined Low-Poly Balloon (Single sphere + single cone)
      const goreMat = new THREE.MeshLambertMaterial({ color: cfg.colors[0] });
      const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(cfg.radius, 10, 8), goreMat);
      bGroup.add(sphereMesh);

      const coneHeight = cfg.radius * 1.2;
      const coneMesh = new THREE.Mesh(new THREE.CylinderGeometry(cfg.radius * 0.9, cfg.radius * 0.35, coneHeight, 8), goreMat);
      coneMesh.position.y = -coneHeight * 0.6;
      bGroup.add(coneMesh);

      const basketMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
      const basket = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), basketMat);
      basket.position.y = -cfg.radius * 1.8;
      bGroup.add(basket);

      this.scene.add(bGroup);
      this.hotAirBalloons.push({
        group: bGroup,
        baseY: cfg.y,
        phase: cfg.phase,
        speed: cfg.speed,
        rotSpeed: 0.03
      });
    });
  }

  private buildPedestrians() {
    this.animatedPedestrians = [];

    // Shared reusable materials for zero-lag rendering
    const skinColors = [0xfcd34d, 0xfde68a, 0xfbbf24, 0xf59e0b];
    const clothingColors = [
      0x2563eb, // Navy Blue
      0xdb2777, // Pink
      0x16a34a, // Emerald Green
      0xea580c, // Vibrant Orange
      0x475569, // Charcoal Gray
      0x0284c7, // Sky Blue
      0x7c3aed, // Purple
      0xdc2626, // Crimson Red
      0x059669, // Forest Green
      0xd97706, // Amber
      0x0891b2, // Cyan
      0x4f46e5, // Indigo
      0x334155, // Dark Slate
      0xf8fafc  // Pure White
    ];
    const hairColors = [0x1e293b, 0x0f172a, 0x451a03, 0x78350f, 0x94a3b8];

    // 36 Diverse City Pedestrians strictly walking on sidewalks, plazas, boardwalks and park paths (100% road-free)
    const pedConfigs: {
      startX: number;
      startZ: number;
      minVal: number;
      maxVal: number;
      isX: boolean;
      speed: number;
      color: number;
      skinColor?: number;
      hairColor?: number;
    }[] = [
      // 1. West Main Sidewalk (X = -13.5, Z: -85 to +85) - Completely safe on sidewalk
      { startX: -13.5, startZ: -75, minVal: -85, maxVal: -45, isX: false, speed: 1.6, color: 0x2563eb },
      { startX: -13.5, startZ: -35, minVal: -50, maxVal: -15, isX: false, speed: 1.9, color: 0xdb2777 },
      { startX: -13.5, startZ: -5, minVal: -25, maxVal: 15, isX: false, speed: 1.7, color: 0x16a34a },
      { startX: -13.5, startZ: 25, minVal: 10, maxVal: 50, isX: false, speed: 1.8, color: 0xea580c },
      { startX: -13.5, startZ: 65, minVal: 45, maxVal: 85, isX: false, speed: 2.1, color: 0x475569 },

      // 2. East Main Sidewalk (X = +13.5, Z: -85 to +85) - Completely safe on sidewalk
      { startX: 13.5, startZ: -80, minVal: -90, maxVal: -50, isX: false, speed: 1.8, color: 0x0284c7 },
      { startX: 13.5, startZ: -40, minVal: -55, maxVal: -20, isX: false, speed: 2.0, color: 0x7c3aed },
      { startX: 13.5, startZ: -10, minVal: -30, maxVal: 10, isX: false, speed: 1.6, color: 0xdc2626 },
      { startX: 13.5, startZ: 20, minVal: 5, maxVal: 45, isX: false, speed: 1.9, color: 0x059669 },
      { startX: 13.5, startZ: 60, minVal: 40, maxVal: 80, isX: false, speed: 1.7, color: 0xd97706 },

      // 3. West Crossway Sidewalks (Gangnam, Tech Valley, Assembly - X: -70 to -16, Safe on Sidewalks)
      { startX: -45, startZ: 40.2, minVal: -70, maxVal: -16, isX: true, speed: 1.5, color: 0x0891b2 },
      { startX: -45, startZ: -9.8, minVal: -70, maxVal: -16, isX: true, speed: 1.7, color: 0xdb2777 },
      { startX: -45, startZ: -70.2, minVal: -70, maxVal: -16, isX: true, speed: 1.6, color: 0xea580c },
      { startX: -30, startZ: 19.8, minVal: -65, maxVal: -16, isX: true, speed: 1.5, color: 0x059669 },
      { startX: -55, startZ: -30.2, minVal: -70, maxVal: -16, isX: true, speed: 1.4, color: 0x2563eb },
      { startX: -40, startZ: -49.8, minVal: -65, maxVal: -16, isX: true, speed: 1.8, color: 0x475569 },

      // 4. East Crossway Sidewalks (Gangnam, Tech Valley, Assembly - X: 16 to 70, Safe on Sidewalks)
      { startX: 45, startZ: 40.2, minVal: 16, maxVal: 70, isX: true, speed: 1.6, color: 0x4f46e5 },
      { startX: 45, startZ: -9.8, minVal: 16, maxVal: 70, isX: true, speed: 1.5, color: 0x16a34a },
      { startX: 45, startZ: -70.2, minVal: 16, maxVal: 70, isX: true, speed: 1.8, color: 0x2563eb },
      { startX: 30, startZ: 19.8, minVal: 16, maxVal: 65, isX: true, speed: 1.7, color: 0xdc2626 },
      { startX: 55, startZ: -30.2, minVal: 16, maxVal: 70, isX: true, speed: 1.5, color: 0x7c3aed },
      { startX: 40, startZ: -49.8, minVal: 16, maxVal: 65, isX: true, speed: 1.6, color: 0xf97316 },

      // 5. East Sports Complex & Stadium Running Tracks (X: 85 to 125, Z: -45 to 25)
      { startX: 95, startZ: -20, minVal: 85, maxVal: 125, isX: true, speed: 2.8, color: 0xdc2626 }, // Fast Jogger
      { startX: 115, startZ: 10, minVal: -15, maxVal: 25, isX: false, speed: 2.6, color: 0x0284c7 }, // Runner
      { startX: 90, startZ: -40, minVal: -45, maxVal: -5, isX: false, speed: 1.7, color: 0x7c3aed },
      { startX: 120, startZ: -10, minVal: 95, maxVal: 125, isX: true, speed: 1.8, color: 0xea580c },

      // 6. National Assembly Plaza & Grand Lawn Promenade (X: -30 to 30, Z: -120 to -145)
      { startX: -15, startZ: -125, minVal: -30, maxVal: 30, isX: true, speed: 1.4, color: 0x475569 },
      { startX: 15, startZ: -130, minVal: -30, maxVal: 30, isX: true, speed: 1.5, color: 0x2563eb },
      { startX: -5, startZ: -120, minVal: -140, maxVal: -115, isX: false, speed: 1.3, color: 0x059669 },
      { startX: 8, startZ: -135, minVal: -142, maxVal: -118, isX: false, speed: 1.6, color: 0xdb2777 },

      // 7. Tech Valley Corporate Plazas (NAVER 1784, KAKAO, SAMSUNG AI, NEXON)
      { startX: -35, startZ: -10, minVal: -45, maxVal: -20, isX: false, speed: 1.8, color: 0x16a34a }, // NAVER Plaza
      { startX: -40, startZ: -70, minVal: -50, maxVal: -20, isX: true, speed: 1.7, color: 0x0284c7 },
      { startX: 35, startZ: 10, minVal: 5, maxVal: 45, isX: false, speed: 1.9, color: 0xfacc15 },  // KAKAO Plaza
      { startX: 45, startZ: -15, minVal: 30, maxVal: 60, isX: true, speed: 1.6, color: 0x4f46e5 },  // SAMSUNG AI Plaza
      { startX: -75, startZ: -15, minVal: -85, maxVal: -55, isX: true, speed: 1.8, color: 0xdb2777 }, // NEXON Plaza

      // 8. 63 Golden Square & Han River Waterfront Promenade (X: -40 to 60, Z: 80 to 95)
      { startX: 45, startZ: 85, minVal: 20, maxVal: 65, isX: true, speed: 1.4, color: 0xd97706 },
      { startX: -30, startZ: 85, minVal: -50, maxVal: -10, isX: true, speed: 1.5, color: 0x0891b2 },
      { startX: 0, startZ: 90, minVal: -25, maxVal: 25, isX: true, speed: 1.6, color: 0xdc2626 }
    ];

    const legGeo = new THREE.BoxGeometry(0.16, 0.68, 0.16);
    legGeo.translate(0, -0.32, 0);

    const armGeo = new THREE.BoxGeometry(0.14, 0.6, 0.14);
    armGeo.translate(0, -0.28, 0);

    pedConfigs.forEach((cfg, idx) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(cfg.startX, 0.15, cfg.startZ);

      const color = cfg.color || clothingColors[idx % clothingColors.length];
      const skin = cfg.skinColor || skinColors[idx % skinColors.length];
      const hair = cfg.hairColor || hairColors[idx % hairColors.length];

      const bodyMat = new THREE.MeshLambertMaterial({ color });
      const skinMat = new THREE.MeshLambertMaterial({ color: skin });
      const hairMat = new THREE.MeshLambertMaterial({ color: hair });
      const pantsMat = new THREE.MeshLambertMaterial({ color: idx % 2 === 0 ? 0x1e293b : 0x334155 });

      // Torso / Jacket
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.32), bodyMat);
      torso.position.y = 1.02;
      pGroup.add(torso);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), skinMat);
      head.position.y = 1.52;
      pGroup.add(head);

      // Hair
      const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), hairMat);
      hairMesh.position.y = 1.66;
      pGroup.add(hairMesh);

      // Left & Right Legs
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.14, 0.68, 0);
      pGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.14, 0.68, 0);
      pGroup.add(rightLeg);

      // Left & Right Arms
      const leftArm = new THREE.Mesh(armGeo, bodyMat);
      leftArm.position.set(-0.32, 1.28, 0);
      pGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, bodyMat);
      rightArm.position.set(0.32, 1.28, 0);
      pGroup.add(rightArm);

      // Initial Facing Rotation
      if (cfg.isX) {
        pGroup.rotation.y = Math.PI / 2;
      }

      this.scene.add(pGroup);

      this.animatedPedestrians.push({
        group: pGroup,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        minVal: cfg.minVal,
        maxVal: cfg.maxVal,
        speed: cfg.speed,
        dir: 1,
        isX: cfg.isX,
        walkPhase: Math.random() * Math.PI * 2
      });
    });
  }

  private buildDynamicRoadTraffic() {
    this.dynamicVehicles = [];

    // Shared Reusable High-Performance Materials
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const windowMat = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Tinted glass
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Luminous Warm Headlight
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Bright Red Taillight
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });

    // Common Geometries for Reuse
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 8);
    wheelGeo.rotateZ(Math.PI / 2);

    const bikeWheelGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.16, 8);
    bikeWheelGeo.rotateZ(Math.PI / 2);

    // 1. Helper: Korean City Bus (간선 파랑 #740 / 지선 초록 / 광역 빨강)
    const createBusMesh = (busColor: number, routeText: string) => {
      const bGroup = new THREE.Group();
      const busMat = new THREE.MeshLambertMaterial({ color: busColor });

      // Lower Chassis & Main Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 8.4), busMat);
      body.position.y = 1.45;
      bGroup.add(body);

      // Side Windows Strip
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.85, 7.2), windowMat);
      sideWin.position.y = 1.85;
      bGroup.add(sideWin);

      // Front Windshield
      const frontWin = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.05, 0.2), windowMat);
      frontWin.position.set(0, 1.85, 4.15);
      bGroup.add(frontWin);

      // Rear Window
      const rearWin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.2), windowMat);
      rearWin.position.set(0, 1.85, -4.15);
      bGroup.add(rearWin);

      // LED Route Destination Board (전면 전자 노선 표지판)
      const ledBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.25), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      ledBox.position.set(0, 2.5, 4.15);
      bGroup.add(ledBox);

      // Headlights (Front: +Z)
      [-0.95, 0.95].forEach(hx => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.15), headlightMat);
        hl.position.set(hx, 0.65, 4.22);
        bGroup.add(hl);
      });

      // Taillights (Rear: -Z)
      [-0.95, 0.95].forEach(hx => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.15), taillightMat);
        tl.position.set(hx, 0.65, -4.22);
        bGroup.add(tl);
      });

      // 6 Wheels
      const wheels: THREE.Mesh[] = [];
      const wheelZs = [2.6, -1.2, -2.7];
      wheelZs.forEach(wz => {
        [-1.28, 1.28].forEach(wx => {
          const w = new THREE.Mesh(wheelGeo, tireMat);
          w.position.set(wx, 0.38, wz);
          bGroup.add(w);
          wheels.push(w);
        });
      });

      return { group: bGroup, wheels };
    };

    // 2. Helper: Passenger Sedan / SUV / Seoul Taxi / Ambulance
    const createCarMesh = (carColor: number, isTaxi = false, isAmbulance = false) => {
      const cGroup = new THREE.Group();
      const carMat = new THREE.MeshLambertMaterial({ color: carColor });

      // Lower Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 4.3), carMat);
      body.position.y = 0.55;
      cGroup.add(body);

      // Cabin / Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.58, 2.2), carMat);
      cabin.position.set(0, 1.1, -0.2);
      cGroup.add(cabin);

      // Windows
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.52, 2.1), windowMat);
      win.position.set(0, 1.1, -0.2);
      cGroup.add(win);

      // Taxi Roof Lamp
      if (isTaxi) {
        const taxiCap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.35), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        taxiCap.position.set(0, 1.48, -0.2);
        cGroup.add(taxiCap);
      }

      // Ambulance Light Bar & Red Cross
      if (isAmbulance) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.25), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        bar.position.set(0, 1.48, -0.2);
        cGroup.add(bar);

        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 4.32), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        crossH.position.set(0, 0.55, 0);
        cGroup.add(crossH);
      }

      // Headlights (Front: +Z)
      [-0.72, 0.72].forEach(hx => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.12), headlightMat);
        hl.position.set(hx, 0.55, 2.16);
        cGroup.add(hl);
      });

      // Taillights (Rear: -Z)
      [-0.72, 0.72].forEach(hx => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.12), taillightMat);
        tl.position.set(hx, 0.55, -2.16);
        cGroup.add(tl);
      });

      // 4 Wheels
      const wheels: THREE.Mesh[] = [];
      [-1.3, 1.3].forEach(wz => {
        [-0.98, 0.98].forEach(wx => {
          const w = new THREE.Mesh(wheelGeo, tireMat);
          w.position.set(wx, 0.38, wz);
          cGroup.add(w);
          wheels.push(w);
        });
      });

      return { group: cGroup, wheels };
    };

    // 3. Helper: Delivery Scooter / Motorcycle with Rider & Delivery Box (배달 오토바이 & 라이더)
    const createMotorcycleMesh = (bikeColor: number, boxColor: number) => {
      const mGroup = new THREE.Group();
      const bikeMat = new THREE.MeshLambertMaterial({ color: bikeColor });
      const boxMat = new THREE.MeshLambertMaterial({ color: boxColor });
      const riderMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const helmetMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });

      // Frame / Chassis
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 1.8), bikeMat);
      frame.position.y = 0.45;
      mGroup.add(frame);

      // Handlebars & Windshield
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.08), chromeMat);
      bar.position.set(0, 0.85, 0.55);
      mGroup.add(bar);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.06), windowMat);
      visor.position.set(0, 1.0, 0.65);
      mGroup.add(visor);

      // Rider Torso
      const rider = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.32), riderMat);
      rider.position.set(0, 0.88, 0.05);
      mGroup.add(rider);

      // Rider Helmet
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), helmetMat);
      helmet.position.set(0, 1.28, 0.08);
      mGroup.add(helmet);

      // Distinctive Delivery Box at Rear (배달통: 민트 배민 / 빨강 요기요 / 노랑 쿠팡이츠)
      const delBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.55), boxMat);
      delBox.position.set(0, 0.82, -0.62);
      mGroup.add(delBox);

      // Headlight (Front: +Z)
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.08), headlightMat);
      hl.position.set(0, 0.6, 0.92);
      mGroup.add(hl);

      // Taillight (Rear: -Z)
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.08), taillightMat);
      tl.position.set(0, 0.55, -0.92);
      mGroup.add(tl);

      // 2 Bike Wheels
      const wheels: THREE.Mesh[] = [];
      [-0.65, 0.65].forEach(wz => {
        const w = new THREE.Mesh(bikeWheelGeo, tireMat);
        w.position.set(0, 0.30, wz);
        mGroup.add(w);
        wheels.push(w);
      });

      return { group: mGroup, wheels };
    };

    // Define 28 Synchronized, Collision-Free Traffic Vehicles with Lane-Velocity Matching
    const trafficConfigs: {
      type: 'BUS' | 'CAR' | 'TAXI' | 'BIKE' | 'AMBULANCE';
      startX: number;
      startZ: number;
      minVal: number;
      maxVal: number;
      isX: boolean;
      dir: number; // 1 or -1
      speed: number;
      color?: number;
      boxColor?: number;
      route?: string;
    }[] = [
      // -------------------------------------------------------------
      // 1. Central Boulevard: Southbound Lanes (dir: 1, Z: -92 to 105)
      // Stops before assembly fountain zone (Z < -92 is assembly plaza)
      // -------------------------------------------------------------
      // Inner Lane (X = 5.5, Synchronized Speed = 10.0 m/s, Equidistant 65m Spacing)
      { type: 'BUS', startX: 5.5, startZ: -65, minVal: -92, maxVal: 105, isX: false, dir: 1, speed: 10.0, color: 0x2563eb, route: '740' },
      { type: 'TAXI', startX: 5.5, startZ: 0, minVal: -92, maxVal: 105, isX: false, dir: 1, speed: 10.0, color: 0xf97316 },
      { type: 'BUS', startX: 5.5, startZ: 65, minVal: -92, maxVal: 105, isX: false, dir: 1, speed: 10.0, color: 0x16a34a, route: '2211' },

      // Outer Fast Lane (X = 8.8, Synchronized Speed = 13.5 m/s, Equidistant 65m Spacing)
      { type: 'CAR', startX: 8.8, startZ: -65, minVal: -92, maxVal: 105, isX: false, dir: 1, speed: 13.5, color: 0xf8fafc },
      { type: 'BIKE', startX: 8.8, startZ: 0, minVal: -92, maxVal: 105, isX: false, dir: 1, speed: 13.5, color: 0x1e293b, boxColor: 0x06b6d4 },
      { type: 'CAR', startX: 8.8, startZ: 65, minVal: -92, maxVal: 105, isX: false, dir: 1, speed: 13.5, color: 0x0284c7 },

      // -------------------------------------------------------------
      // 2. Central Boulevard: Northbound Lanes (dir: -1, Z: -92 to 105)
      // Stops before assembly fountain zone (Z < -92 is assembly plaza)
      // -------------------------------------------------------------
      // Inner Lane (X = -5.5, Synchronized Speed = 10.0 m/s, Equidistant 65m Spacing)
      { type: 'BUS', startX: -5.5, startZ: 65, minVal: -92, maxVal: 105, isX: false, dir: -1, speed: 10.0, color: 0x2563eb, route: '472' },
      { type: 'TAXI', startX: -5.5, startZ: 0, minVal: -92, maxVal: 105, isX: false, dir: -1, speed: 10.0, color: 0xe2e8f0 },
      { type: 'BUS', startX: -5.5, startZ: -65, minVal: -92, maxVal: 105, isX: false, dir: -1, speed: 10.0, color: 0xdc2626, route: '9401' },

      // Outer Fast Lane (X = -8.8, Synchronized Speed = 13.5 m/s, Equidistant 65m Spacing)
      { type: 'AMBULANCE', startX: -8.8, startZ: 65, minVal: -92, maxVal: 105, isX: false, dir: -1, speed: 13.5, color: 0xf8fafc },
      { type: 'BIKE', startX: -8.8, startZ: 0, minVal: -92, maxVal: 105, isX: false, dir: -1, speed: 13.5, color: 0x1e293b, boxColor: 0xeab308 },
      { type: 'CAR', startX: -8.8, startZ: -65, minVal: -92, maxVal: 105, isX: false, dir: -1, speed: 13.5, color: 0x1e293b },

      // -------------------------------------------------------------
      // 3. Crossway 1 (Z = 30, Gangnam Crossway, X: -75 to 75)
      // -------------------------------------------------------------
      // Westbound (Z = 26.8, dir: -1, Synchronized Speed = 11.0 m/s, Spacing 75m)
      { type: 'BUS', startX: 37.5, startZ: 26.8, minVal: -75, maxVal: 75, isX: true, dir: -1, speed: 11.0, color: 0x16a34a, route: '3412' },
      { type: 'CAR', startX: -37.5, startZ: 26.8, minVal: -75, maxVal: 75, isX: true, dir: -1, speed: 11.0, color: 0xf8fafc },

      // Eastbound (Z = 33.2, dir: 1, Synchronized Speed = 11.0 m/s, Spacing 75m)
      { type: 'TAXI', startX: -37.5, startZ: 33.2, minVal: -75, maxVal: 75, isX: true, dir: 1, speed: 11.0, color: 0xf97316 },
      { type: 'BIKE', startX: 37.5, startZ: 33.2, minVal: -75, maxVal: 75, isX: true, dir: 1, speed: 11.0, color: 0x1e293b, boxColor: 0xef4444 },

      // -------------------------------------------------------------
      // 4. Crossway 2 (Z = -20, Central Tech Crossway, X: -75 to 75)
      // -------------------------------------------------------------
      // Westbound (Z = -23.2, dir: -1, Synchronized Speed = 11.0 m/s, Spacing 75m)
      { type: 'CAR', startX: 37.5, startZ: -23.2, minVal: -75, maxVal: 75, isX: true, dir: -1, speed: 11.0, color: 0x0284c7 },
      { type: 'BIKE', startX: -37.5, startZ: -23.2, minVal: -75, maxVal: 75, isX: true, dir: -1, speed: 11.0, color: 0x1e293b, boxColor: 0x06b6d4 },

      // Eastbound (Z = -16.8, dir: 1, Synchronized Speed = 11.0 m/s, Spacing 75m)
      { type: 'BUS', startX: -37.5, startZ: -16.8, minVal: -75, maxVal: 75, isX: true, dir: 1, speed: 11.0, color: 0xdc2626, route: '9701' },
      { type: 'CAR', startX: 37.5, startZ: -16.8, minVal: -75, maxVal: 75, isX: true, dir: 1, speed: 11.0, color: 0x94a3b8 },

      // -------------------------------------------------------------
      // 5. Crossway 3 (Z = -60, North Assembly Crossway, X: -75 to 75)
      // -------------------------------------------------------------
      // Westbound (Z = -63.2, dir: -1, Synchronized Speed = 11.0 m/s, Spacing 75m)
      { type: 'BUS', startX: 37.5, startZ: -63.2, minVal: -75, maxVal: 75, isX: true, dir: -1, speed: 11.0, color: 0x16a34a, route: '7016' },
      { type: 'BIKE', startX: -37.5, startZ: -63.2, minVal: -75, maxVal: 75, isX: true, dir: -1, speed: 11.0, color: 0x1e293b, boxColor: 0xeab308 },

      // Eastbound (Z = -56.8, dir: 1, Synchronized Speed = 11.0 m/s, Spacing 75m)
      { type: 'TAXI', startX: -37.5, startZ: -56.8, minVal: -75, maxVal: 75, isX: true, dir: 1, speed: 11.0, color: 0xf97316 },
      { type: 'CAR', startX: 37.5, startZ: -56.8, minVal: -75, maxVal: 75, isX: true, dir: 1, speed: 11.0, color: 0xf8fafc },

      // -------------------------------------------------------------
      // 6. Mapo Bridge / Han River Waterfront Highway (Z = 125, X: -140 to 140)
      // -------------------------------------------------------------
      // Eastbound (Z = 122.5, dir: 1, Synchronized Speed = 14.0 m/s, Spacing 93m)
      { type: 'BUS', startX: -93, startZ: 122.5, minVal: -140, maxVal: 140, isX: true, dir: 1, speed: 14.0, color: 0xdc2626, route: '8800' },
      { type: 'CAR', startX: 0, startZ: 122.5, minVal: -140, maxVal: 140, isX: true, dir: 1, speed: 14.0, color: 0x1e3a8a },
      { type: 'BIKE', startX: 93, startZ: 122.5, minVal: -140, maxVal: 140, isX: true, dir: 1, speed: 14.0, color: 0x1e293b, boxColor: 0x06b6d4 },

      // Westbound (Z = 127.5, dir: -1, Synchronized Speed = 14.0 m/s, Spacing 93m)
      { type: 'BUS', startX: 93, startZ: 127.5, minVal: -140, maxVal: 140, isX: true, dir: -1, speed: 14.0, color: 0x2563eb, route: '160' },
      { type: 'TAXI', startX: 0, startZ: 127.5, minVal: -140, maxVal: 140, isX: true, dir: -1, speed: 14.0, color: 0xf97316 },
      { type: 'CAR', startX: -93, startZ: 127.5, minVal: -140, maxVal: 140, isX: true, dir: -1, speed: 14.0, color: 0x94a3b8 }
    ];

    trafficConfigs.forEach(cfg => {
      let vehicleObj: { group: THREE.Group; wheels: THREE.Mesh[] };

      if (cfg.type === 'BUS') {
        vehicleObj = createBusMesh(cfg.color || 0x2563eb, cfg.route || '740');
      } else if (cfg.type === 'TAXI') {
        vehicleObj = createCarMesh(cfg.color || 0xf97316, true, false);
      } else if (cfg.type === 'AMBULANCE') {
        vehicleObj = createCarMesh(0xf8fafc, false, true);
      } else if (cfg.type === 'BIKE') {
        vehicleObj = createMotorcycleMesh(cfg.color || 0x1e293b, cfg.boxColor || 0x06b6d4);
      } else {
        vehicleObj = createCarMesh(cfg.color || 0xf8fafc, false, false);
      }

      vehicleObj.group.position.set(cfg.startX, 0.1, cfg.startZ);

      // Set Correct Facing Direction (Mesh front is +Z, so rotation aligns +Z to movement vector)
      if (cfg.isX) {
        // When moving +X, face +X (rotation.y = Math.PI / 2); when moving -X, face -X (rotation.y = -Math.PI / 2)
        vehicleObj.group.rotation.y = cfg.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        // When moving +Z (Southbound), face +Z (rotation.y = 0); when moving -Z (Northbound), face -Z (rotation.y = Math.PI)
        vehicleObj.group.rotation.y = cfg.dir > 0 ? 0 : Math.PI;
      }

      this.scene.add(vehicleObj.group);

      this.dynamicVehicles.push({
        group: vehicleObj.group,
        speed: cfg.speed,
        dir: cfg.dir,
        isX: cfg.isX,
        minVal: cfg.minVal,
        maxVal: cfg.maxVal,
        wheels: vehicleObj.wheels
      });
    });
  }

  private buildAnimalsAndBirds() {
    this.birdFlock = [];

    // 3 Sky Birds
    const birdMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    for (let i = 0; i < 3; i++) {
      const bGroup = new THREE.Group();

      const body = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.8, 5), birdMat);
      body.rotation.x = Math.PI / 2;
      bGroup.add(body);

      const wingGeo = new THREE.PlaneGeometry(0.6, 0.3);
      wingGeo.translate(-0.3, 0, 0);
      const leftWing = new THREE.Mesh(wingGeo, birdMat);
      leftWing.rotation.x = Math.PI / 2;
      bGroup.add(leftWing);

      const rWingGeo = new THREE.PlaneGeometry(0.6, 0.3);
      rWingGeo.translate(0.3, 0, 0);
      const rightWing = new THREE.Mesh(rWingGeo, birdMat);
      rightWing.rotation.x = Math.PI / 2;
      bGroup.add(rightWing);

      this.scene.add(bGroup);

      this.birdFlock.push({
        group: bGroup,
        leftWing,
        rightWing,
        center: new THREE.Vector3(0, 0, -20),
        radius: 38 + i * 8,
        height: 30 + i * 5,
        angle: (i / 3) * Math.PI * 2,
        speed: 0.35,
        flapSpeed: 8.0,
        flapPhase: i * 1.2
      });
    }

    // 2. Cute Park Dog trotting in the green park plaza (Safely situated in Yeouido Central Park at X: -48, Z: -85)
    const dogGroup = new THREE.Group();
    dogGroup.position.set(-48, 0.15, -82);

    const dogMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Golden amber coat
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });

    // Body
    const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.7), dogMat);
    dBody.position.y = 0.35;
    dogGroup.add(dBody);

    // Head & Snout
    const dHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.35), dogMat);
    dHead.position.set(0, 0.58, 0.38);
    dogGroup.add(dHead);

    const dSnout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.2), darkMat);
    dSnout.position.set(0, 0.52, 0.58);
    dogGroup.add(dSnout);

    // Ears
    [-0.14, 0.14].forEach(ex => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.1), darkMat);
      ear.position.set(ex, 0.7, 0.32);
      dogGroup.add(ear);
    });

    // Wagging Tail
    const tailGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.35, 6);
    tailGeo.translate(0, 0.16, 0);
    const tail = new THREE.Mesh(tailGeo, dogMat);
    tail.position.set(0, 0.45, -0.35);
    tail.rotation.x = -Math.PI / 4;
    dogGroup.add(tail);

    // 4 Legs
    const dLegs: THREE.Mesh[] = [];
    const legGeo = new THREE.BoxGeometry(0.1, 0.28, 0.1);
    legGeo.translate(0, -0.12, 0);

    [
      [-0.14, 0.28, 0.22], [0.14, 0.28, 0.22],
      [-0.14, 0.28, -0.22], [0.14, 0.28, -0.22]
    ].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, dogMat);
      leg.position.set(lx, ly, lz);
      dogGroup.add(leg);
      dLegs.push(leg);
    });

    this.scene.add(dogGroup);

    this.parkDog = {
      group: dogGroup,
      tail,
      head: dHead,
      legs: dLegs,
      minX: -55,
      maxX: -41,
      speed: 1.5,
      dir: 1,
      walkPhase: 0
    };
  }

  // 8. Southwest International Airport & Aviation District (Runways, Hangars & ATC Tower)
  private buildAirportAndHangars() {
    const airportGroup = new THREE.Group();

    // 1. Tarmac & Apron Asphalt Ground
    const tarmacGeo = new THREE.PlaneGeometry(100, 180);
    const tarmacMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const tarmac = new THREE.Mesh(tarmacGeo, tarmacMat);
    tarmac.rotation.x = -Math.PI / 2;
    tarmac.position.set(-150, 0.035, 90);
    airportGroup.add(tarmac);

    // 2. Main High-Capacity Concrete Runway (Length: 160m, Width: 22m)
    const runwayGeo = new THREE.PlaneGeometry(22, 160);
    const runwayMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(-165, 0.045, 90);
    airportGroup.add(runway);

    // Runway Yellow Centerline Dashes
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let rz = 20; rz <= 160; rz += 10) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 5.5), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-165, 0.055, rz);
      airportGroup.add(stripe);
    }

    // Runway Threshold White Piano Keys (North & South ends)
    const thresholdMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-1, 1].forEach(dir => {
      const baseZ = 90 + dir * 72;
      for (let i = -4; i <= 4; i++) {
        const key = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 8.0), thresholdMat);
        key.rotation.x = -Math.PI / 2;
        key.position.set(-165 + i * 2.1, 0.055, baseZ);
        airportGroup.add(key);
      }
    });

    // Runway Edge Lights (Green at threshold, bright warm white along edge, red at rollout)
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const lightGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 6);

    for (let rz = 15; rz <= 165; rz += 12) {
      const mat = (rz <= 20) ? greenMat : (rz >= 160) ? redMat : whiteMat;
      [-176.2, -153.8].forEach(lx => {
        const lamp = new THREE.Mesh(lightGeo, mat);
        lamp.position.set(lx, 0.25, rz);
        airportGroup.add(lamp);
      });
    }

    // 3. Air Traffic Control (ATC) Tower (x: -125, z: 40)
    const atcGroup = new THREE.Group();
    atcGroup.position.set(-125, 0, 40);

    // Concrete Base Shaft
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 24, 12), shaftMat);
    shaft.position.y = 12;
    atcGroup.add(shaft);

    // Glass Panoramic 360° Observation Cab
    const cabMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 4.2, 5.0, 12), cabMat);
    cab.position.y = 26.5;
    atcGroup.add(cab);

    // Tower Roof Radome & Antenna Mast
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.8, 12), roofMat);
    roof.position.y = 29.4;
    atcGroup.add(roof);

    const radome = new THREE.Mesh(new THREE.SphereGeometry(2.0, 12, 12), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    radome.position.y = 31.5;
    atcGroup.add(radome);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 6.0, 6), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
    mast.position.y = 35.0;
    atcGroup.add(mast);

    // Rotating Green/White Aviation Beacon Lamp
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    beacon.position.y = 38.0;
    atcGroup.add(beacon);
    this.airportTowerBeacon = beacon;

    airportGroup.add(atcGroup);

    // Register ATC Tower Collision Box
    this.buildingBoxes.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-125, 17, 40), new THREE.Vector3(12, 34, 12))
    );

    // 4. Two Aircraft Service Hangars (x: -125, z: 85 and z: 125)
    const hangarMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const hangarRoofMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const doorFrameMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });

    [85, 125].forEach((hz, idx) => {
      const hGroup = new THREE.Group();
      hGroup.position.set(-125, 0, hz);

      // Main Hangar Walls
      const hWalls = new THREE.Mesh(new THREE.BoxGeometry(26, 12, 22), hangarMat);
      hWalls.position.y = 6;
      hGroup.add(hWalls);

      // Arched Barrel Roof
      const hRoof = new THREE.Mesh(new THREE.CylinderGeometry(13.2, 13.2, 22, 16, 1, false, 0, Math.PI), hangarRoofMat);
      hRoof.rotation.z = Math.PI / 2;
      hRoof.rotation.y = Math.PI / 2;
      hRoof.position.y = 12;
      hGroup.add(hRoof);

      // Sliding Bay Door Portal Face (Front facing runway at -X)
      const doorPortal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 16), doorFrameMat);
      doorPortal.position.set(-12.8, 4.5, 0);
      hGroup.add(doorPortal);

      airportGroup.add(hGroup);

      // Register Hangar Collision Box
      this.buildingBoxes.push(
        new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-125, 8, hz), new THREE.Vector3(26, 16, 22))
      );
    });

    this.scene.add(airportGroup);
  }

  // 9. 대한민국 국회의사당 & 의사당 광장 (National Assembly of Korea & Grand Lawn Plaza)
  private buildNationalAssemblyOfKorea() {
    const assemblyGroup = new THREE.Group();
    // Located at North Yeouido Island Core (x: 0, z: -160)
    assemblyGroup.position.set(0, 0, -160);

    // Assembly Materials
    const graniteMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 }); // White granite facade
    const baseStoneMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 }); // Lower stone plinth
    const copperDomeMat = new THREE.MeshLambertMaterial({ color: 0x059669 }); // Iconic oxidized copper blue-green dome (청록색 돔)
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    const goldPinnacleMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });

    // 1. Grand Plaza Lawn & Stone Terrace Platform (화강석 기단 및 잔디광장)
    const grandTerrace = new THREE.Mesh(new THREE.BoxGeometry(110, 2.5, 75), baseStoneMat);
    grandTerrace.position.y = 1.25;
    assemblyGroup.add(grandTerrace);

    // Front Grand Entrance Stone Staircase (중앙 화강암 진입 계단)
    for (let s = 1; s <= 6; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(38, 0.4, 4.0), baseStoneMat);
      step.position.set(0, s * 0.35, 37.5 + s * 2.2);
      assemblyGroup.add(step);
    }

    // 2. Main Assembly Hall Structure (본회의장 본관 바디: 폭 84m, 깊이 54m, 높이 24m)
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(84, 22, 54), graniteMat);
    mainBody.position.y = 2.5 + 11;
    assemblyGroup.add(mainBody);

    // Front & Rear Recessed Glass Window Atriums
    const frontAtrium = new THREE.Mesh(new THREE.BoxGeometry(76, 16, 1.2), glassMat);
    frontAtrium.position.set(0, 14, 27.2);
    assemblyGroup.add(frontAtrium);

    const rearAtrium = new THREE.Mesh(new THREE.BoxGeometry(76, 16, 1.2), glassMat);
    rearAtrium.position.set(0, 14, -27.2);
    assemblyGroup.add(rearAtrium);

    // 3. Iconic 24 Granite Colonnade Pillars (국회의사당 상징 24개 전면/후면/측면 화강석 원주 기둥)
    const columnGeo = new THREE.CylinderGeometry(1.2, 1.35, 21.0, 12);
    
    // Front Columns (전면 기둥 8개)
    for (let i = -3.5; i <= 3.5; i += 1.0) {
      const col = new THREE.Mesh(columnGeo, graniteMat);
      col.position.set(i * 10.5, 13.0, 28.5);
      assemblyGroup.add(col);
    }
    // Rear Columns (후면 기둥 8개)
    for (let i = -3.5; i <= 3.5; i += 1.0) {
      const col = new THREE.Mesh(columnGeo, graniteMat);
      col.position.set(i * 10.5, 13.0, -28.5);
      assemblyGroup.add(col);
    }
    // Side Columns (좌우 측면 기둥 각 4개)
    [-43.5, 43.5].forEach(sx => {
      for (let zOff = -18; zOff <= 18; zOff += 12) {
        const col = new THREE.Mesh(columnGeo, graniteMat);
        col.position.set(sx, 13.0, zOff);
        assemblyGroup.add(col);
      }
    });

    // 4. Heavy Entablature & Roof Cornice (상부 처마 및 대형 코니스)
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(92, 3.2, 62), graniteMat);
    cornice.position.y = 25.0;
    assemblyGroup.add(cornice);

    const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(86, 1.2, 56), baseStoneMat);
    roofDeck.position.y = 27.0;
    assemblyGroup.add(roofDeck);

    // 5. The Legendary Blue-Green Copper Dome (국회의사당 상징 돔 구조)
    // Cylindrical Dome Tambour (돔 지지 원형 드럼 베이스)
    const domeDrum = new THREE.Mesh(new THREE.CylinderGeometry(18.5, 19.5, 5.0, 32), graniteMat);
    domeDrum.position.y = 29.5;
    assemblyGroup.add(domeDrum);

    // Drum Glass Windows & Mini Pillars
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4.8, 8), graniteMat);
      p.position.set(Math.cos(a) * 19.8, 29.5, Math.sin(a) * 19.8);
      assemblyGroup.add(p);
    }

    // Hemispherical Copper Dome (청록색 반구형 돔)
    const domeGeo = new THREE.SphereGeometry(18.0, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, copperDomeMat);
    domeMesh.position.y = 32.0;
    assemblyGroup.add(domeMesh);

    // Dome Gold Finial & Beacon Mast (돔 상단 황금 첨탑 및 항공 장애등)
    const domeLantern = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.0, 3.5, 12), graniteMat);
    domeLantern.position.y = 50.0 + 1.75;
    assemblyGroup.add(domeLantern);

    const goldSpire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.5, 8), goldPinnacleMat);
    goldSpire.position.y = 55.0;
    assemblyGroup.add(goldSpire);

    const domeBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    domeBeacon.position.y = 58.0;
    assemblyGroup.add(domeBeacon);
    this.redWarningLights.push(domeBeacon);

    // 7. National Assembly Peace Fountain & Surrounding Garden Plaza (평화와 번영의 분수대)
    const gardenPlaza = new THREE.Mesh(new THREE.PlaneGeometry(140, 48), new THREE.MeshLambertMaterial({ color: 0x15803d })); // Green manicured lawn
    gardenPlaza.rotation.x = -Math.PI / 2;
    gardenPlaza.position.set(0, 0.06, 52);
    assemblyGroup.add(gardenPlaza);

    const lawnFountain = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 8.0, 1.2, 24), baseStoneMat);
    lawnFountain.position.set(0, 0.6, 52);
    assemblyGroup.add(lawnFountain);

    const fountainWater = new THREE.Mesh(new THREE.CircleGeometry(6.6, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    fountainWater.rotation.x = -Math.PI / 2;
    fountainWater.position.set(0, 1.25, 52);
    assemblyGroup.add(fountainWater);

    this.scene.add(assemblyGroup);

    // Register Precision Collision Box for National Assembly Building
    this.buildingBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(0, 28, -160),
        new THREE.Vector3(96, 60, 72)
      )
    );
  }

  // 10. Seoul Yeouido & Gangnam Landmark Master Architecture (63 Golden Building, Parc.1 Red Truss Tower, IFC Seoul, Mapo Bridge, Gangnam LED Billboards)
  private buildSeoulYeouidoGangnamLandmarks() {
    const seoulGroup = new THREE.Group();

    // ==========================================
    // A. 63빌딩 (63 Golden Square Tower) at x: 45, z: 95
    // ==========================================
    const golden63Group = new THREE.Group();
    golden63Group.position.set(45, 0, 95);

    // 63 Golden Facade Window Texture
    const gold63Tex = createBuildingWindowTexture(0xb45309, '#fef08a', 28, 8);
    const gold63Mat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: gold63Tex
    });

    // 63 Building Tapered Slabs (3-tier iconic cantilever skyscraper)
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(22, 28, 14), gold63Mat);
    t1.position.y = 14;
    golden63Group.add(t1);

    const t2 = new THREE.Mesh(new THREE.BoxGeometry(19, 26, 12.5), gold63Mat);
    t2.position.y = 28 + 13;
    golden63Group.add(t2);

    const t3 = new THREE.Mesh(new THREE.BoxGeometry(16, 24, 11), gold63Mat);
    t3.position.y = 54 + 12;
    golden63Group.add(t3);

    // 63 Crown Golden Slanted Roof & High-Altitude Aircraft Warning Beacon
    const crownMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4.5, 5.0, 4), crownMat);
    crown.rotation.y = Math.PI / 4;
    crown.position.set(-4.5, 78 + 2.5, 0); // Offset to west side of roof to leave grand helipad clear
    golden63Group.add(crown);

    const beaconLight = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    beaconLight.position.set(-4.5, 83.5, 0);
    golden63Group.add(beaconLight);

    // 63 Building Rooftop Observation Helipad & Emergency Rescue Zone
    const padDeckGeo = new THREE.BoxGeometry(9.0, 0.4, 9.0);
    const padDeckMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const padDeck = new THREE.Mesh(padDeckGeo, padDeckMat);
    padDeck.position.set(1.5, 78.2, 0);
    golden63Group.add(padDeck);

    // White Helipad Outer Landing Circle
    const hPadCircle = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 3.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    hPadCircle.rotation.x = -Math.PI / 2;
    hPadCircle.position.set(1.5, 78.42, 0);
    golden63Group.add(hPadCircle);

    // Large 'H' Cross Marking
    const hBarMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const h1 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 4.0), hBarMat);
    h1.rotation.x = -Math.PI / 2;
    h1.position.set(0.0, 78.44, 0);
    golden63Group.add(h1);

    const h2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 4.0), hBarMat);
    h2.rotation.x = -Math.PI / 2;
    h2.position.set(3.0, 78.44, 0);
    golden63Group.add(h2);

    const hMid = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.7), hBarMat);
    hMid.rotation.x = -Math.PI / 2;
    hMid.position.set(1.5, 78.44, 0);
    golden63Group.add(hMid);

    // Rooftop Safety Corner Strobe Lights
    const strobeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    [
      [-2.5, -4.0],
      [5.5, -4.0],
      [-2.5, 4.0],
      [5.5, 4.0]
    ].forEach(([sx, sz]) => {
      const sLight = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), strobeMat);
      sLight.position.set(sx, 78.6, sz);
      golden63Group.add(sLight);
    });

    // 63 Billboard & Hanwha Corporate Sign
    const sign63 = createBillboardMesh('63 SQUARE', '대한생명 63빌딩 // Yeouido Landmark', '63빌딩', '#d97706', '#fef08a', 14, 5.0);
    sign63.position.set(0, 18, 7.2);
    golden63Group.add(sign63);

    const hanwhaSign = createKoreanStoreSignMesh('HANWHA', 14, 5.2);
    hanwhaSign.position.set(0, 52, 6.4);
    golden63Group.add(hanwhaSign);

    // ==========================================
    // 63 Building Stage 5 Mission Dynamic Effect Group (아이들을 위한 미션 활성화 시에만 나타나는 특수 효과)
    // ==========================================
    this.bldg63MissionEffectGroup = new THREE.Group();
    this.bldg63MissionEffectGroup.position.set(1.5, 78.5, 0);

    // 1. Towering Golden Skyward Beacon Pillar Beam (100m tall glowing cylinder)
    const beamGeo = new THREE.CylinderGeometry(2.5, 5.0, 110, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beaconBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    beaconBeamMesh.position.y = 55;
    this.bldg63MissionEffectGroup.add(beaconBeamMesh);

    // 2. Three Ascending Pulsing Golden Target Rings
    this.bldg63BeaconRings = [];
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 4.4, 32),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          depthWrite: false
        })
      );
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 8 + rIdx * 20;
      this.bldg63BeaconRings.push(ringMesh);
      this.bldg63MissionEffectGroup.add(ringMesh);
    }

    // 3. Floating 3D Emergency Mission Hologram Signboard above Helipad
    const missionSignCanvas = document.createElement('canvas');
    missionSignCanvas.width = 512;
    missionSignCanvas.height = 256;
    const sCtx = missionSignCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#450a0a';
      sCtx.fillRect(0, 0, 512, 256);

      sCtx.strokeStyle = '#ef4444';
      sCtx.lineWidth = 10;
      sCtx.strokeRect(5, 5, 502, 246);

      // Flashing Emergency Badge
      sCtx.fillStyle = '#dc2626';
      sCtx.beginPath();
      sCtx.roundRect(28, 20, 200, 38, 19);
      sCtx.fill();
      sCtx.fillStyle = '#ffffff';
      sCtx.font = '900 19px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText('🚨 RESCUE TARGET', 128, 45);

      sCtx.fillStyle = '#fef08a';
      sCtx.font = '900 38px sans-serif';
      sCtx.textAlign = 'left';
      sCtx.fillText('63빌딩 옥상 응급구조', 28, 112);

      sCtx.fillStyle = '#ffffff';
      sCtx.font = 'bold 24px sans-serif';
      sCtx.fillText('대한생명 63스퀘어 헬리패드 (78m)', 28, 160);

      sCtx.fillStyle = '#f87171';
      sCtx.font = '700 18px sans-serif';
      sCtx.fillText('환자에게 접근하여 자석 줄로 연결하세요!', 28, 210);
    }
    const missionSignTex = new THREE.CanvasTexture(missionSignCanvas);
    missionSignTex.needsUpdate = true;
    this.bldg63HoloSign = new THREE.Mesh(
      new THREE.PlaneGeometry(16.0, 7.5),
      new THREE.MeshBasicMaterial({
        map: missionSignTex,
        transparent: true,
        side: THREE.DoubleSide
      })
    );
    this.bldg63HoloSign.position.set(0, 16.0, 0);
    this.bldg63MissionEffectGroup.add(this.bldg63HoloSign);

    // 4. Four Corner Golden Searchlight Cones
    this.bldg63Searchlights = [];
    const searchConeGeo = new THREE.ConeGeometry(2.2, 18.0, 12, 1, true);
    const searchConeMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    [
      [-3.0, -4.0],
      [6.0, -4.0],
      [-3.0, 4.0],
      [6.0, 4.0]
    ].forEach(([cx, cz]) => {
      const sCone = new THREE.Mesh(searchConeGeo, searchConeMat);
      sCone.position.set(cx, 9.0, cz);
      this.bldg63Searchlights.push(sCone);
      this.bldg63MissionEffectGroup.add(sCone);
    });

    // Default hidden unless Stage 5 Rescue mission is active
    this.bldg63MissionEffectGroup.visible = false;
    golden63Group.add(this.bldg63MissionEffectGroup);

    seoulGroup.add(golden63Group);
    this.buildingBoxes.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(45, 39, 95), new THREE.Vector3(22, 78, 14))
    );

    // ==========================================
    // B. 여의도 파크원 타워 (Parc.1 Tower with iconic Red Exposed Steel Corner Trusses) at x: -45, z: 95
    // ==========================================
    const parc1Group = new THREE.Group();
    parc1Group.position.set(-45, 0, 95);

    const parc1GlassTex = createBuildingWindowTexture(0x0f172a, '#38bdf8', 32, 10);
    const parc1GlassMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: parc1GlassTex
    });

    // Parc.1 Main Sleek Glass Tower Body
    const parc1Body = new THREE.Mesh(new THREE.BoxGeometry(24, 92, 18), parc1GlassMat);
    parc1Body.position.y = 46;
    parc1Group.add(parc1Body);

    // Iconic Bright Red Corner Steel Trusses & Braces (파크원 특유의 강렬한 붉은색 외골격 기둥)
    const redTrussMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    [-12.2, 12.2].forEach(tx => {
      [-9.2, 9.2].forEach(tz => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 95, 1.4), redTrussMat);
        pillar.position.set(tx, 47.5, tz);
        parc1Group.add(pillar);
      });

      // Diagonal Red Bracing Beams along height
      for (let by = 15; by < 90; by += 20) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 18.2), redTrussMat);
        brace.position.set(tx, by, 0);
        parc1Group.add(brace);
      }
    });

    // Parc.1 Roof Helipad & Crown
    const parc1Helipad = new THREE.Mesh(
      new THREE.CylinderGeometry(7.0, 7.0, 1.2, 16),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    parc1Helipad.position.y = 92.6;
    parc1Group.add(parc1Helipad);

    const parc1HMark = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 5.5),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    parc1HMark.rotation.x = -Math.PI / 2;
    parc1HMark.position.y = 93.3;
    parc1Group.add(parc1HMark);

    const parc1Sign = createBillboardMesh('PARC.1 SEOUL', '여의도 파크원 // Rogers Stirk Harbour Design', '파크원', '#dc2626', '#f87171', 14, 5.0);
    parc1Sign.position.set(0, 20, 9.2);
    parc1Group.add(parc1Sign);

    const nhSign = createKoreanStoreSignMesh('NH_INVEST', 14, 5.2);
    nhSign.position.set(0, 56, 9.2);
    parc1Group.add(nhSign);

    seoulGroup.add(parc1Group);
    this.buildingBoxes.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-45, 47, 95), new THREE.Vector3(26, 95, 20))
    );

    // ==========================================
    // C. 여의도 LG 트윈타워 (LG Twin Towers Yeouido - LG전자 & LG화학/에너지솔루션) at x: -95, z: 95
    // ==========================================
    const lgGroup = new THREE.Group();
    lgGroup.position.set(-95, 0, 95);

    const lgGlassTex = createBuildingWindowTexture(0x1e293b, '#94a3b8', 26, 8);
    const lgGlassMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: lgGlassTex });

    // East & West Twin Monoliths (Tower A & Tower B)
    [-7.5, 7.5].forEach((offsetX) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(13, 68, 14), lgGlassMat);
      tower.position.set(offsetX, 34, 0);
      lgGroup.add(tower);

      // Red Crown Roof
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(13.2, 2.5, 14.2),
        new THREE.MeshLambertMaterial({ color: 0xa21caf })
      );
      crown.position.set(offsetX, 69.2, 0);
      lgGroup.add(crown);
    });

    // LG Twin Towers Connecting Skybridge
    const lgBridge = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 3.5, 6.0),
      new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    lgBridge.position.set(0, 48, 0);
    lgGroup.add(lgBridge);

    // LG Corporate Signboard
    const lgSign = createKoreanStoreSignMesh('LG', 14, 5.5);
    lgSign.position.set(0, 18, 7.2);
    lgGroup.add(lgSign);

    seoulGroup.add(lgGroup);
    this.buildingBoxes.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-95, 35, 95), new THREE.Vector3(30, 72, 16))
    );

    // ==========================================
    // D. 여의도 IFC 서울 (International Finance Centre Seoul) at x: 95, z: 95
    // ==========================================
    const ifcGroup = new THREE.Group();
    ifcGroup.position.set(95, 0, 95);

    const ifcGlassTex = createBuildingWindowTexture(0x0c4a6e, '#38bdf8', 30, 10);
    const ifcGlassMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: ifcGlassTex });

    // Three IFC Tower (Tallest - 85m)
    const threeIFC = new THREE.Mesh(new THREE.BoxGeometry(18, 85, 16), ifcGlassMat);
    threeIFC.position.set(0, 42.5, 0);
    ifcGroup.add(threeIFC);

    // Two IFC Tower (Tiered - 60m)
    const twoIFC = new THREE.Mesh(new THREE.BoxGeometry(14, 60, 14), ifcGlassMat);
    twoIFC.position.set(15, 30, 0);
    ifcGroup.add(twoIFC);

    // IFC Crown Slanted Top
    const ifcCrown = new THREE.Mesh(
      new THREE.ConeGeometry(8, 6, 4),
      new THREE.MeshLambertMaterial({ color: 0x0284c7 })
    );
    ifcCrown.rotation.y = Math.PI / 4;
    ifcCrown.position.set(0, 88, 0);
    ifcGroup.add(ifcCrown);

    // IFC Seoul Signboard
    const ifcSign = createBillboardMesh('IFC SEOUL', '여의도 국제금융센터 // Global Finance & Conrad', 'IFC 서울', '#0284c7', '#38bdf8', 14, 5.0);
    ifcSign.position.set(0, 18, 8.2);
    ifcGroup.add(ifcSign);

    seoulGroup.add(ifcGroup);
    this.buildingBoxes.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(95, 43, 95), new THREE.Vector3(34, 88, 18))
    );

    // ==========================================
    // E. 마포대교 아치 교각 디테일 (Mapo Bridge River Gateway) at South River [x: 0, z: 158]
    // ==========================================
    const mapoSign = createKoreanStreetSignMesh('마포대교 (한강)', 'Mapo Bridge // Han River', '46', 9.0, 3.2);
    mapoSign.position.set(0, 7.5, 134.5);
    seoulGroup.add(mapoSign);

    // Han River Water Reflection Enhancer Plane
    const hanRiverGlitter = new THREE.Mesh(
      new THREE.PlaneGeometry(580, 46),
      new THREE.MeshLambertMaterial({
        color: 0x0284c7,
        polygonOffset: true,
        polygonOffsetFactor: -3.0,
        polygonOffsetUnits: -3.0
      })
    );
    hanRiverGlitter.rotation.x = -Math.PI / 2;
    hanRiverGlitter.position.set(0, 0.045, 158);
    seoulGroup.add(hanRiverGlitter);

    this.scene.add(seoulGroup);
  }

  // Real-Time Graphics & Atmosphere Lighting Presets (Blender Photoreal / Seoul Han River / Gangnam Night / Golden Sunset / Alpine Dawn)
  public setAtmospherePreset(preset: GraphicsAtmospherePreset) {
    this.currentAtmospherePreset = preset;

    if (!this.sunLight || !this.ambientLight || !this.hemiLight) return;

    switch (preset) {
      case 'SEOUL_HANRIVER_DAY':
        this.sunLight.color.setHex(0xfffbeb); // Clear Seoul Afternoon Sun
        this.sunLight.intensity = 1.5;
        this.sunLight.position.set(80, 180, 90);
        this.ambientLight.color.setHex(0xffffff);
        this.ambientLight.intensity = 0.9;
        this.hemiLight.color.setHex(0x60a5fa); // Han River blue sky bounce
        this.hemiLight.groundColor.setHex(0xcbd5e1);
        this.hemiLight.intensity = 0.7;
        this.scene.fog = new THREE.FogExp2(0xdbeafe, 0.0016);
        this.renderer.toneMappingExposure = 1.1;
        break;

      case 'GANGNAM_NIGHT':
        this.sunLight.color.setHex(0x3b82f6); // Deep Gangnam Night Sky
        this.sunLight.intensity = 0.35;
        this.sunLight.position.set(30, 100, -50);
        this.ambientLight.color.setHex(0x1e1b4b);
        this.ambientLight.intensity = 0.8;
        this.hemiLight.color.setHex(0xa855f7); // Neon Purple & Blue Skylight
        this.hemiLight.groundColor.setHex(0x0f172a);
        this.hemiLight.intensity = 0.65;
        this.scene.fog = new THREE.FogExp2(0x090d16, 0.0028);
        this.renderer.toneMappingExposure = 1.35;
        break;

      case 'BLENDER_PBR_DAY':
        this.sunLight.color.setHex(0xfff7ed);
        this.sunLight.intensity = 1.45;
        this.sunLight.position.set(100, 160, 80);
        this.ambientLight.color.setHex(0xffffff);
        this.ambientLight.intensity = 0.85;
        this.hemiLight.color.setHex(0x70b5ff);
        this.hemiLight.groundColor.setHex(0xdcfce7);
        this.hemiLight.intensity = 0.65;
        this.scene.fog = new THREE.FogExp2(0xe0f2fe, 0.0018);
        this.renderer.toneMappingExposure = 1.08;
        break;

      case 'AIRPORT_SUNSET':
        this.sunLight.color.setHex(0xf97316); // Golden Amber Sun
        this.sunLight.intensity = 1.6;
        this.sunLight.position.set(180, 45, 120);
        this.ambientLight.color.setHex(0xfde68a);
        this.ambientLight.intensity = 0.75;
        this.hemiLight.color.setHex(0xfb923c);
        this.hemiLight.groundColor.setHex(0x7c2d12);
        this.hemiLight.intensity = 0.75;
        this.scene.fog = new THREE.FogExp2(0xfeb272, 0.0024);
        this.renderer.toneMappingExposure = 1.15;
        break;

      case 'CYBERPUNK_NIGHT':
        this.sunLight.color.setHex(0x38bdf8); // Cyan Moon fill
        this.sunLight.intensity = 0.45;
        this.sunLight.position.set(-60, 120, -80);
        this.ambientLight.color.setHex(0x1e1b4b);
        this.ambientLight.intensity = 0.65;
        this.hemiLight.color.setHex(0x818cf8);
        this.hemiLight.groundColor.setHex(0x0f172a);
        this.hemiLight.intensity = 0.55;
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0032);
        this.renderer.toneMappingExposure = 1.25;
        break;

      case 'ALPINE_DAWN':
        this.sunLight.color.setHex(0xfbcfe8); // Rosy Morning Dawn
        this.sunLight.intensity = 1.35;
        this.sunLight.position.set(-150, 70, -100);
        this.ambientLight.color.setHex(0xfce7f3);
        this.ambientLight.intensity = 0.85;
        this.hemiLight.color.setHex(0xc084fc);
        this.hemiLight.groundColor.setHex(0x365314);
        this.hemiLight.intensity = 0.65;
        this.scene.fog = new THREE.FogExp2(0xfbcfe8, 0.002);
        this.renderer.toneMappingExposure = 1.05;
        break;
    }
  }

  // Load Custom 3D Model (GLTF / GLB from Blender / Sketchfab / Poly / Kenney)
  public async loadCustomGLTF(
    source: string | File,
    options: {
      name?: string;
      position?: [number, number, number];
      scale?: number;
      rotationY?: number;
    } = {}
  ): Promise<CustomGLTFModel> {
    const modelName = options.name || (source instanceof File ? source.name : 'Blender_Custom_GLTF');
    const modelId = `gltf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const posX = options.position ? options.position[0] : this.position.x;
    const posY = options.position ? options.position[1] : Math.max(0.1, this.position.y);
    const posZ = options.position ? options.position[2] : this.position.z + 5;
    const modelScale = options.scale || 1.0;
    const rotY = options.rotationY || 0;

    return new Promise<CustomGLTFModel>((resolve, reject) => {
      const handleGltfScene = (gltfScene: THREE.Group) => {
        let totalVertices = 0;
        let totalMeshes = 0;

        gltfScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            totalMeshes++;
            if (mesh.geometry) {
              const posAttr = mesh.geometry.attributes.position;
              if (posAttr) totalVertices += posAttr.count;
            }
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => { m.depthWrite = true; });
              } else {
                mesh.material.depthWrite = true;
              }
            }
          }
        });

        // Compute Bounding Box & Center
        const box = new THREE.Box3().setFromObject(gltfScene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Normalize scale if too gigantic or microscopic
        let finalScale = modelScale;
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 100) {
          finalScale = (30 / maxDim) * modelScale;
        } else if (maxDim < 0.2) {
          finalScale = (5 / Math.max(0.01, maxDim)) * modelScale;
        }

        gltfScene.scale.set(finalScale, finalScale, finalScale);
        gltfScene.position.set(posX, posY, posZ);
        gltfScene.rotation.y = rotY;
        gltfScene.name = modelId;

        this.customModelsGroup.add(gltfScene);

        // Compute final world bounding box and register obstacle collision
        const worldBox = new THREE.Box3().setFromObject(gltfScene);
        this.buildingBoxes.push(worldBox);

        const loadedInfo: CustomGLTFModel = {
          id: modelId,
          name: modelName,
          vertexCount: totalVertices,
          meshCount: totalMeshes,
          scale: finalScale,
          position: [posX, posY, posZ],
          loadedAt: Date.now()
        };

        this.loadedCustomModels.push(loadedInfo);
        resolve(loadedInfo);
      };

      if (source instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const contents = e.target?.result;
          if (contents && contents instanceof ArrayBuffer) {
            this.gltfLoader.parse(
              contents,
              '',
              (gltf) => { handleGltfScene(gltf.scene); },
              (err) => { reject(err); }
            );
          } else {
            reject(new Error('Failed to read GLTF file buffer'));
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(source);
      } else {
        this.gltfLoader.load(
          source,
          (gltf) => { handleGltfScene(gltf.scene); },
          undefined,
          (err) => { reject(err); }
        );
      }
    });
  }

  public removeCustomGLTF(modelId: string) {
    const obj = this.customModelsGroup.getObjectByName(modelId);
    if (obj) {
      this.customModelsGroup.remove(obj);
    }
    this.loadedCustomModels = this.loadedCustomModels.filter(m => m.id !== modelId);
  }

  public clearCustomModels() {
    while (this.customModelsGroup.children.length > 0) {
      this.customModelsGroup.remove(this.customModelsGroup.children[0]);
    }
    this.loadedCustomModels = [];
  }

  public getLoadedCustomModels(): CustomGLTFModel[] {
    return [...this.loadedCustomModels];
  }

  private buildCyberInstancedElements() {
    // 1. Instanced Modern Street Light Columns (Zero-Lag 1-Draw-Call Instancing)
    const pylonPositions: { x: number; z: number }[] = [];
    
    // Main boulevard light columns (West and East curbs)
    const boulevardZs = [-95, -75, -55, -35, -15, 10, 35, 55, 75, 95];
    boulevardZs.forEach(bz => {
      pylonPositions.push({ x: -16.2, z: bz });
      pylonPositions.push({ x: 16.2, z: bz });
    });

    // Crossway streets light columns
    const crosswayZs = [30, -20, -60];
    const crosswayXs = [-70, -50, -30, 30, 50, 70];
    crosswayZs.forEach(cz => {
      crosswayXs.forEach(cx => {
        pylonPositions.push({ x: cx, z: cz + 10.8 });
        pylonPositions.push({ x: cx, z: cz - 10.8 });
      });
    });

    const pylonCount = pylonPositions.length;
    const pylonPillarGeo = new THREE.CylinderGeometry(0.18, 0.28, 5.4, 6);
    const pylonPillarMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    this.instancedStreetPylons = new THREE.InstancedMesh(pylonPillarGeo, pylonPillarMat, pylonCount);

    const pylonLampGeo = new THREE.BoxGeometry(0.75, 0.22, 0.75);
    const pylonLampMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    this.instancedPylonLamps = new THREE.InstancedMesh(pylonLampGeo, pylonLampMat, pylonCount);

    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyEuler = new THREE.Euler();
    const dummyScale = new THREE.Vector3(1, 1, 1);

    pylonPositions.forEach((pos, idx) => {
      // Base pillar
      dummyPos.set(pos.x, 2.7, pos.z);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedStreetPylons!.setMatrixAt(idx, dummyMatrix);

      // Warm daylight lamp head
      dummyPos.set(pos.x, 5.45, pos.z);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedPylonLamps!.setMatrixAt(idx, dummyMatrix);
    });

    this.instancedStreetPylons.instanceMatrix.needsUpdate = true;
    this.instancedPylonLamps.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedStreetPylons);
    this.scene.add(this.instancedPylonLamps);

    // 2. Instanced Modern Aero Shuttles / Sky Cruisers (1 Single Draw Call for 16 Flying Crafts)
    const cruiserCount = 16;
    const cruiserGeo = new THREE.ConeGeometry(0.85, 3.4, 5);
    cruiserGeo.rotateX(Math.PI / 2);
    const cruiserMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    this.instancedSkyCruisers = new THREE.InstancedMesh(cruiserGeo, cruiserMat, cruiserCount);

    this.skyCruiserFlightPaths = [
      // Orbit lane 1: Inner lower patrol
      { radius: 50, height: 36, speed: 0.16, angle: 0.0, tilt: -0.15, dir: 1 },
      { radius: 50, height: 38, speed: 0.16, angle: Math.PI * 0.5, tilt: -0.15, dir: 1 },
      { radius: 50, height: 36, speed: 0.16, angle: Math.PI, tilt: -0.15, dir: 1 },
      { radius: 50, height: 38, speed: 0.16, angle: Math.PI * 1.5, tilt: -0.15, dir: 1 },

      // Orbit lane 2: Mid-altitude counter-orbit
      { radius: 80, height: 50, speed: -0.12, angle: 0.2, tilt: 0.14, dir: -1 },
      { radius: 80, height: 52, speed: -0.12, angle: 0.2 + Math.PI * 0.5, tilt: 0.14, dir: -1 },
      { radius: 80, height: 50, speed: -0.12, angle: 0.2 + Math.PI, tilt: 0.14, dir: -1 },
      { radius: 80, height: 52, speed: -0.12, angle: 0.2 + Math.PI * 1.5, tilt: 0.14, dir: -1 },

      // Orbit lane 3: High sky highway
      { radius: 115, height: 68, speed: 0.09, angle: 0.4, tilt: -0.12, dir: 1 },
      { radius: 115, height: 70, speed: 0.09, angle: 0.4 + Math.PI * 0.5, tilt: -0.12, dir: 1 },
      { radius: 115, height: 68, speed: 0.09, angle: 0.4 + Math.PI, tilt: -0.12, dir: 1 },
      { radius: 115, height: 70, speed: 0.09, angle: 0.4 + Math.PI * 1.5, tilt: -0.12, dir: 1 },

      // Orbit lane 4: Stratospheric heavy transport
      { radius: 155, height: 86, speed: -0.07, angle: 0.6, tilt: 0.10, dir: -1 },
      { radius: 155, height: 88, speed: -0.07, angle: 0.6 + Math.PI * 0.5, tilt: 0.10, dir: -1 },
      { radius: 155, height: 86, speed: -0.07, angle: 0.6 + Math.PI, tilt: 0.10, dir: -1 },
      { radius: 155, height: 88, speed: -0.07, angle: 0.6 + Math.PI * 1.5, tilt: 0.10, dir: -1 },
    ];

    this.scene.add(this.instancedSkyCruisers);

    // 3. Instanced Navigational Airway Crystals (1 Single Draw Call for 24 Waypoint Beacons)
    const dataCubeCount = 24;
    const cubeGeo = new THREE.OctahedronGeometry(1.1, 0);
    const cubeMat = new THREE.MeshBasicMaterial({ 
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.85
    });
    this.instancedDataCubes = new THREE.InstancedMesh(cubeGeo, cubeMat, dataCubeCount);

    this.dataCubeConfigs = [];
    const relayOrigins = [
      { x: -30, y: 22, z: -40 },
      { x: 30, y: 24, z: -40 },
      { x: -35, y: 32, z: 20 },
      { x: 35, y: 30, z: 20 },
      { x: 0, y: 18, z: -60 },
      { x: 0, y: 28, z: -60 },
      { x: -18, y: 14, z: 0 },
      { x: 18, y: 14, z: 0 },
      { x: -60, y: 26, z: -80 },
      { x: 60, y: 26, z: -80 },
      { x: -50, y: 38, z: 60 },
      { x: 50, y: 38, z: 60 },
      { x: -25, y: 44, z: -70 },
      { x: 25, y: 44, z: -70 },
      { x: -75, y: 20, z: 0 },
      { x: 75, y: 20, z: 0 },
      { x: 0, y: 40, z: 45 },
      { x: 0, y: 55, z: -30 },
      { x: -40, y: 16, z: -15 },
      { x: 40, y: 16, z: -15 },
      { x: -15, y: 25, z: 75 },
      { x: 15, y: 25, z: 75 },
      { x: -65, y: 48, z: 30 },
      { x: 65, y: 48, z: 30 }
    ];

    relayOrigins.forEach((orig, idx) => {
      this.dataCubeConfigs.push({
        origin: new THREE.Vector3(orig.x, orig.y, orig.z),
        floatSpeed: 1.2 + (idx % 4) * 0.3,
        rotSpeed: 0.8 + (idx % 3) * 0.4,
        radius: 0.5 + (idx % 2) * 0.3,
        phase: idx * 0.6
      });
    });

    this.scene.add(this.instancedDataCubes);

    // 4. Instanced Horizon Megacity Modern Skyline Towers (Surrounding Perimeter, 0 Per-frame CPU Overhead, 2 Draw Calls)
    const towerCount = 48;
    const towerGeo = new THREE.BoxGeometry(1, 1, 1);
    const towerMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    this.instancedMegacityTowers = new THREE.InstancedMesh(towerGeo, towerMat, towerCount);

    const beaconGeo = new THREE.BoxGeometry(1, 1, 1);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    this.instancedMegacityBeacons = new THREE.InstancedMesh(beaconGeo, beaconMat, towerCount);

    for (let i = 0; i < towerCount; i++) {
      const angle = (i / towerCount) * Math.PI * 2 + (i % 3) * 0.04;
      const dist = 205 + (i % 6) * 18;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;
      const th = 60 + (i % 7) * 16 + (i % 3) * 22;
      const tw = 16 + (i % 4) * 6;
      const td = 16 + ((i + 2) % 4) * 6;

      // Tower body
      dummyPos.set(tx, th / 2, tz);
      dummyScale.set(tw, th, td);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedMegacityTowers.setMatrixAt(i, dummyMatrix);

      // Top beacon
      dummyPos.set(tx, th + 0.6, tz);
      dummyScale.set(tw * 0.35, 1.2, td * 0.35);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedMegacityBeacons.setMatrixAt(i, dummyMatrix);

      // Register Megacity Perimeter Tower Collision Box
      this.buildingBoxes.push(
        new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(tx, th / 2, tz),
          new THREE.Vector3(tw, th, td)
        )
      );
    }

    this.instancedMegacityTowers.instanceMatrix.needsUpdate = true;
    this.instancedMegacityBeacons.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedMegacityTowers);
    this.scene.add(this.instancedMegacityBeacons);

    // 5. Massive Instanced Forest & Street Trees (Cleanly Placed in Outer Park Zones, Zero Middle Road Obstruction)
    const treePositions: { x: number; z: number; isPine: boolean; scale: number }[] = [];

    // (a) Outer East Eco Nature Park & Lake Shoreline (x: 88 to 152, z: -45 to 20)
    for (let lx = 88; lx <= 152; lx += 10) {
      for (let lz = -45; lz <= 20; lz += 10) {
        const distToLake = Math.sqrt((lx - 120) * (lx - 120) + (lz + 15) * (lz + 15));
        if (distToLake >= 34 && distToLake <= 58) {
          treePositions.push({
            x: lx + (Math.sin(lx * 2.1 + lz) * 1.5),
            z: lz + (Math.cos(lz * 1.8 + lx) * 1.5),
            isPine: ((lx + lz) % 2 === 0),
            scale: 0.95 + (Math.abs(lx) % 3) * 0.15
          });
        }
      }
    }

    // (b) Far West Airport Perimeter Green Buffer (x: -180 to -145, z: -20 to 15)
    for (let wx = -180; wx <= -145; wx += 9) {
      for (let wz = -20; wz <= 15; wz += 9) {
        treePositions.push({
          x: wx,
          z: wz,
          isPine: (Math.abs(wx) % 2 === 0),
          scale: 1.0 + (Math.abs(wz) % 3) * 0.12
        });
      }
    }

    // (c) Far East-West Outer Crossways (Only at outer edges |x| >= 48)
    [-60, -20, 30].forEach(cz => {
      [-75, -60, 60, 75].forEach(x => {
        treePositions.push({ x, z: cz + 13.5, isPine: false, scale: 0.85 });
        treePositions.push({ x, z: cz - 13.5, isPine: true, scale: 0.9 });
      });
    });

    // (d) Riverside Promenade Trees along North Embankment (z: 102) and South (z: 148) (Only far outer edges |x| > 45)
    for (let rx = -180; rx <= 180; rx += 14) {
      if (Math.abs(rx) > 45 && Math.abs(rx - 110) > 10 && Math.abs(rx + 110) > 10) {
        treePositions.push({ x: rx, z: 102, isPine: false, scale: 0.95 });
        treePositions.push({ x: rx, z: 148, isPine: true, scale: 1.05 });
      }
    }

    // (e) Sports Complex & Stadium Perimeter Trees
    for (let sx = 72; sx <= 138; sx += 12) {
      treePositions.push({ x: sx, z: -52, isPine: true, scale: 1.0 });
      treePositions.push({ x: sx, z: -8, isPine: false, scale: 0.95 });
    }

    // (f) Residential Neighborhood Garden Trees (Outer East x: 95 to 155)
    for (let vx = 95; vx <= 155; vx += 14) {
      for (let vz = 55; vz <= 95; vz += 14) {
        treePositions.push({ x: vx + 2, z: vz + 2, isPine: false, scale: 0.85 + (vx % 3) * 0.15 });
      }
    }

    // (g) National Assembly Grand Lawn Garden Trees (국회의사당 바로 앞 잔디광장 전면 조경수)
    // Symmetrical landscaped flowerbed & lawn trees flanking the plaza & approach
    [-42, -30, -18].forEach(gx => {
      [-118, -106, -94].forEach(gz => {
        treePositions.push({
          x: gx,
          z: gz,
          isPine: ((Math.abs(gx) + Math.abs(gz)) % 2 === 0),
          scale: 0.82 + (Math.abs(gx) % 3) * 0.08
        });
      });
    });

    [18, 30, 42].forEach(gx => {
      [-118, -106, -94].forEach(gz => {
        treePositions.push({
          x: gx,
          z: gz,
          isPine: ((Math.abs(gx) + Math.abs(gz)) % 2 === 0),
          scale: 0.82 + (Math.abs(gx) % 3) * 0.08
        });
      });
    });

    // Outer lawn boundary perimeter evergreen trees
    [-55, 55].forEach(bx => {
      [-130, -118, -106, -94, -82].forEach(bz => {
        treePositions.push({
          x: bx,
          z: bz,
          isPine: true,
          scale: 0.95
        });
      });
    });

    const oakTrees = treePositions.filter(t => !t.isPine);
    const pineTrees = treePositions.filter(t => t.isPine);

    // Instanced Trunks
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.5, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    this.instancedTreeTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);

    treePositions.forEach((t, idx) => {
      dummyPos.set(t.x, 1.25 * t.scale, t.z);
      dummyScale.set(t.scale, t.scale, t.scale);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedTreeTrunks!.setMatrixAt(idx, dummyMatrix);
    });
    this.instancedTreeTrunks.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedTreeTrunks);

    // Instanced Oak Foliage
    if (oakTrees.length > 0) {
      const oakGeo = new THREE.SphereGeometry(2.2, 6, 5);
      const oakMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
      this.instancedTreeOakFoliage = new THREE.InstancedMesh(oakGeo, oakMat, oakTrees.length);

      oakTrees.forEach((t, idx) => {
        dummyPos.set(t.x, 3.6 * t.scale, t.z);
        dummyScale.set(t.scale, t.scale, t.scale);
        dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
        this.instancedTreeOakFoliage!.setMatrixAt(idx, dummyMatrix);
      });
      this.instancedTreeOakFoliage.instanceMatrix.needsUpdate = true;
      this.scene.add(this.instancedTreeOakFoliage);
    }

    // Instanced Pine Foliage
    if (pineTrees.length > 0) {
      const pineGeo = new THREE.ConeGeometry(2.4, 4.5, 5);
      const pineMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
      this.instancedTreePineFoliage = new THREE.InstancedMesh(pineGeo, pineMat, pineTrees.length);

      pineTrees.forEach((t, idx) => {
        dummyPos.set(t.x, 4.0 * t.scale, t.z);
        dummyScale.set(t.scale, t.scale, t.scale);
        dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
        this.instancedTreePineFoliage!.setMatrixAt(idx, dummyMatrix);
      });
      this.instancedTreePineFoliage.instanceMatrix.needsUpdate = true;
      this.scene.add(this.instancedTreePineFoliage);
    }

    // 6. Instanced Parked Vehicles (80+ Cars Across City Lots, 2 Draw Calls Total)
    const vehiclePositions: { x: number; z: number; rotY: number; colorHex: number }[] = [];
    const carColors = [0xf8fafc, 0x0284c7, 0xdc2626, 0x475569, 0xfacc15, 0x1e293b, 0x16a34a, 0xe2e8f0];

    // Alpha Lot
    for (let c = 0; c < 12; c++) {
      vehiclePositions.push({
        x: -64 + (c % 6) * 3.6,
        z: c < 6 ? -40 : -30,
        rotY: 0,
        colorHex: carColors[c % carColors.length]
      });
    }

    // Commercial Lot
    for (let c = 0; c < 12; c++) {
      vehiclePositions.push({
        x: 46 + (c % 6) * 3.6,
        z: c < 6 ? -40 : -30,
        rotY: 0,
        colorHex: carColors[(c + 2) % carColors.length]
      });
    }

    // Hospital Lot
    for (let c = 0; c < 14; c++) {
      vehiclePositions.push({
        x: 77 + (c % 7) * 3.4,
        z: c < 7 ? 20 : 30,
        rotY: 0,
        colorHex: carColors[(c + 4) % carColors.length]
      });
    }

    // Civic Lot
    for (let c = 0; c < 10; c++) {
      vehiclePositions.push({
        x: -38 + (c % 5) * 3.6,
        z: c < 5 ? 20 : 29,
        rotY: 0,
        colorHex: carColors[(c + 1) % carColors.length]
      });
    }

    // West Logistics Yard
    for (let c = 0; c < 12; c++) {
      vehiclePositions.push({
        x: -125 + (c % 6) * 4.2,
        z: c < 6 ? -50 : -22,
        rotY: Math.PI / 2,
        colorHex: carColors[(c + 3) % carColors.length]
      });
    }

    // Residential Driveways
    for (let c = 0; c < 16; c++) {
      vehiclePositions.push({
        x: 102 + (c % 4) * 14,
        z: 60 + Math.floor(c / 4) * 10,
        rotY: 0,
        colorHex: carColors[(c + 5) % carColors.length]
      });
    }

    const vBodyGeo = new THREE.BoxGeometry(3.6, 0.9, 1.8);
    const vBodyMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    this.instancedVehicles = new THREE.InstancedMesh(vBodyGeo, vBodyMat, vehiclePositions.length);

    const vTopGeo = new THREE.BoxGeometry(2.0, 0.7, 1.5);
    const vTopMat = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Tinted glass cabin
    this.instancedVehicleTops = new THREE.InstancedMesh(vTopGeo, vTopMat, vehiclePositions.length);

    vehiclePositions.forEach((v, idx) => {
      dummyEuler.set(0, v.rotY, 0);
      dummyQuat.setFromEuler(dummyEuler);

      // Body
      dummyPos.set(v.x, 0.5, v.z);
      dummyScale.set(1, 1, 1);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedVehicles!.setMatrixAt(idx, dummyMatrix);

      // Cabin
      dummyPos.set(v.x, 1.25, v.z);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedVehicleTops!.setMatrixAt(idx, dummyMatrix);
    });

    this.instancedVehicles.instanceMatrix.needsUpdate = true;
    this.instancedVehicleTops.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedVehicles);
    this.scene.add(this.instancedVehicleTops);

    // 7. Instanced Photovoltaic Solar Panel Arrays (West Clean Energy Eco-District, 1 Draw Call)
    const solarCount = 32;
    const solarGeo = new THREE.PlaneGeometry(4.2, 2.6);
    const solarMat = new THREE.MeshLambertMaterial({ color: 0x0284c7, side: THREE.DoubleSide });
    this.instancedSolarPanels = new THREE.InstancedMesh(solarGeo, solarMat, solarCount);

    for (let s = 0; s < solarCount; s++) {
      const row = Math.floor(s / 8);
      const col = s % 8;
      const sx = -160 + col * 4.8;
      const sz = -85 + row * 6.5;

      dummyEuler.set(-Math.PI / 3, 0, 0); // Angled 30 degrees to the sun
      dummyQuat.setFromEuler(dummyEuler);
      dummyPos.set(sx, 1.4, sz);
      dummyScale.set(1, 1, 1);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedSolarPanels.setMatrixAt(s, dummyMatrix);
    }
    this.instancedSolarPanels.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedSolarPanels);

    // 8. Instanced Mid-Rise Urban Skyline Towers & Rich Architectural Details (Perimeter Skyline Only - Zero Overlaps)
    const towerColors = [
      new THREE.Color(0x334155), // Slate dark
      new THREE.Color(0x0284c7), // Ocean glass
      new THREE.Color(0x475569), // Steel blue-grey
      new THREE.Color(0xf1f5f9), // Modern platinum
      new THREE.Color(0x1e293b), // Deep midnight navy
      new THREE.Color(0x38bdf8), // Sky blue glass
      new THREE.Color(0x64748b), // Cool urban grey
      new THREE.Color(0x0f766e), // Emerald eco tower
    ];

    const rawMidRiseTotal = 40;
    const midRiseConfigs: {
      mx: number;
      mz: number;
      mh: number;
      mw: number;
      md: number;
      angle: number;
      color: THREE.Color;
    }[] = [];

    for (let m = 0; m < rawMidRiseTotal; m++) {
      const angle = (m / rawMidRiseTotal) * Math.PI * 2 + (m % 4) * 0.08;
      const dist = 135 + (m % 5) * 12;
      const mx = Math.cos(angle) * dist;
      const mz = Math.sin(angle) * dist;

      // 1. Ensure National Assembly district (x: -90..90, z: -210..-60) and central sightlines remain completely unobstructed
      const distToAssembly = Math.hypot(mx, mz + 160);
      if (distToAssembly < 95 || (Math.abs(mx) < 55 && mz < -50)) {
        continue;
      }

      // 2. Clear South Yeouido Landmarks (63 Building, Parc.1, LG, IFC, Mapo Bridge)
      if (mz > 65 && Math.abs(mx) < 130) {
        continue;
      }

      // 3. Clear Southwest International Airport & Hangars
      if (mx < -85 && mz > 15) {
        continue;
      }

      // 4. Clear East Sports Complex & Stadiums
      if (mx > 70 && mz > -55 && mz < 55) {
        continue;
      }

      // 5. Clear West Logistics & Wind Turbine Energy Park
      if (mx < -75 && mz < 0 && mz > -110) {
        continue;
      }

      // 6. Clear Downtown Tech & Commercial Grids
      if (Math.abs(mx) < 95 && Math.abs(mz) < 70) {
        continue;
      }

      const mh = 22 + (m % 6) * 6 + (m % 3) * 8;
      const mw = 14 + (m % 3) * 5;
      const md = 14 + ((m + 1) % 3) * 5;

      midRiseConfigs.push({
        mx,
        mz,
        mh,
        mw,
        md,
        angle,
        color: towerColors[m % towerColors.length]
      });
    }

    const midRiseCount = midRiseConfigs.length;
    const midRiseGeo = new THREE.BoxGeometry(1, 1, 1);
    const midRiseMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.instancedMidRiseBlocks = new THREE.InstancedMesh(midRiseGeo, midRiseMat, midRiseCount);

    // (a) Foundation Plaza Pads under each tower (Covers raw ground completely)
    const padGeo = new THREE.BoxGeometry(1, 0.3, 1);
    const padMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    this.instancedMidRisePads = new THREE.InstancedMesh(padGeo, padMat, midRiseCount);

    // (b) Glass Window Ribbon Bands (4 ribbon strips per tower)
    const windowStripsPerTower = 4;
    const windowCount = midRiseCount * windowStripsPerTower;
    const winGeo = new THREE.BoxGeometry(1.02, 1.2, 1.02);
    const winMat = new THREE.MeshLambertMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.85 });
    this.instancedMidRiseWindows = new THREE.InstancedMesh(winGeo, winMat, windowCount);

    // (c) Rooftop HVAC Industrial Chillers (2 units per tower)
    const hvacCount = midRiseCount * 2;
    const rHvacGeo = new THREE.BoxGeometry(3.2, 1.8, 2.6);
    const rHvacMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    this.instancedRoofHVAC = new THREE.InstancedMesh(rHvacGeo, rHvacMat, hvacCount);

    // (d) Rooftop Communication Antenna Masts
    const antGeo = new THREE.CylinderGeometry(0.1, 0.2, 7.0, 6);
    const antMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    this.instancedRoofAntennas = new THREE.InstancedMesh(antGeo, antMat, midRiseCount);

    // (e) Ground-Level Entrance Canopies
    const canGeo = new THREE.BoxGeometry(6.5, 0.4, 3.2);
    const canMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    this.instancedEntranceAwnings = new THREE.InstancedMesh(canGeo, canMat, midRiseCount);

    let winIdx = 0;
    let hvacIdx = 0;

    midRiseConfigs.forEach((cfg, m) => {
      const { mx, mz, mh, mw, md, angle, color } = cfg;

      dummyEuler.set(0, angle * 0.5, 0);
      dummyQuat.setFromEuler(dummyEuler);

      // 1. Foundation Plaza Pad (wider than building, covers grass)
      dummyPos.set(mx, 0.15, mz);
      dummyScale.set(mw + 8, 1, md + 8);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedMidRisePads.setMatrixAt(m, dummyMatrix);

      // 2. Tower Main Body with individual color
      dummyPos.set(mx, mh / 2, mz);
      dummyScale.set(mw, mh, md);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedMidRiseBlocks.setMatrixAt(m, dummyMatrix);
      this.instancedMidRiseBlocks.setColorAt(m, color);

      // 3. Glass Window Ribbon Strips (4 levels)
      for (let s = 1; s <= windowStripsPerTower; s++) {
        const ribbonY = (mh / (windowStripsPerTower + 1)) * s;
        dummyPos.set(mx, ribbonY, mz);
        dummyScale.set(mw, 1, md);
        dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
        this.instancedMidRiseWindows.setMatrixAt(winIdx++, dummyMatrix);
      }

      // 4. Rooftop HVAC Units (2 units per tower)
      const hvacOffX = mw * 0.22;
      const hvacOffZ = md * 0.22;

      // Unit 1
      dummyPos.set(mx - hvacOffX, mh + 0.9, mz - hvacOffZ);
      dummyScale.set(1, 1, 1);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedRoofHVAC.setMatrixAt(hvacIdx++, dummyMatrix);

      // Unit 2
      dummyPos.set(mx + hvacOffX, mh + 0.9, mz + hvacOffZ);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedRoofHVAC.setMatrixAt(hvacIdx++, dummyMatrix);

      // 5. Rooftop Communication Antenna
      dummyPos.set(mx, mh + 3.5, mz);
      dummyScale.set(1, 1, 1);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedRoofAntennas.setMatrixAt(m, dummyMatrix);

      // 6. Ground-Level Entrance Canopy
      const canopyDist = md / 2 + 1.6;
      dummyPos.set(mx, 3.8, mz + canopyDist);
      dummyScale.set(1, 1, 1);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedEntranceAwnings.setMatrixAt(m, dummyMatrix);

      // Register collision bounding box
      const box = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(mx, mh / 2, mz),
        new THREE.Vector3(mw, mh, md)
      );
      this.buildingBoxes.push(box);
    });

    this.instancedMidRisePads.instanceMatrix.needsUpdate = true;
    this.instancedMidRiseBlocks.instanceMatrix.needsUpdate = true;
    if (this.instancedMidRiseBlocks.instanceColor) {
      this.instancedMidRiseBlocks.instanceColor.needsUpdate = true;
    }
    this.instancedMidRiseWindows.instanceMatrix.needsUpdate = true;
    this.instancedRoofHVAC.instanceMatrix.needsUpdate = true;
    this.instancedRoofAntennas.instanceMatrix.needsUpdate = true;
    this.instancedEntranceAwnings.instanceMatrix.needsUpdate = true;

    this.scene.add(this.instancedMidRisePads);
    this.scene.add(this.instancedMidRiseBlocks);
    this.scene.add(this.instancedMidRiseWindows);
    this.scene.add(this.instancedRoofHVAC);
    this.scene.add(this.instancedRoofAntennas);
    this.scene.add(this.instancedEntranceAwnings);

    // 10. Instanced Urban Street Lamp Posts (Zero-Lag Modern LED Streetlamps)
    const lampPositions: { x: number; z: number; rotY: number }[] = [];
    
    // Main Boulevard Sidewalks
    for (let lz = -90; lz <= 90; lz += 20) {
      if (Math.abs(lz) > 6) {
        lampPositions.push({ x: -14.8, z: lz, rotY: Math.PI / 2 });
        lampPositions.push({ x: 14.8, z: lz, rotY: -Math.PI / 2 });
      }
    }

    // East-West Crossways
    const streetCrossZs = [-60, -20, 30];
    streetCrossZs.forEach(cz => {
      for (let lx = -60; lx <= 60; lx += 24) {
        if (Math.abs(lx) > 16) {
          lampPositions.push({ x: lx, z: cz - 9.2, rotY: 0 });
          lampPositions.push({ x: lx, z: cz + 9.2, rotY: Math.PI });
        }
      }
    });

    // South Bridge Approaches
    [-45, 0, 45].forEach(bx => {
      lampPositions.push({ x: bx - 7.5, z: 104, rotY: Math.PI / 2 });
      lampPositions.push({ x: bx + 7.5, z: 104, rotY: -Math.PI / 2 });
      lampPositions.push({ x: bx - 7.5, z: 146, rotY: Math.PI / 2 });
      lampPositions.push({ x: bx + 7.5, z: 146, rotY: -Math.PI / 2 });
    });

    const lampCount = lampPositions.length;
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.2, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    this.instancedStreetPoles = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);

    const lanternGeo = new THREE.BoxGeometry(0.5, 0.25, 0.9);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Warm luminous street glow
    this.instancedStreetLanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, lampCount);

    lampPositions.forEach((lp, idx) => {
      dummyEuler.set(0, lp.rotY, 0);
      dummyQuat.setFromEuler(dummyEuler);

      // Pole transform
      dummyPos.set(lp.x, 2.6, lp.z);
      dummyScale.set(1, 1, 1);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedStreetPoles!.setMatrixAt(idx, dummyMatrix);

      // Lantern luminaire head
      dummyPos.set(lp.x, 5.1, lp.z);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      this.instancedStreetLanterns!.setMatrixAt(idx, dummyMatrix);
    });

    this.instancedStreetPoles.instanceMatrix.needsUpdate = true;
    this.instancedStreetLanterns.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedStreetPoles);
    this.scene.add(this.instancedStreetLanterns);
  }

  private updateEnvironment(dt: number) {
    const time = performance.now() * 0.001;

    // 1. Hot Air Balloons Floating and Swaying
    this.hotAirBalloons.forEach(b => {
      b.group.position.y = b.baseY + Math.sin(time * b.speed + b.phase) * 1.8;
      b.group.rotation.y += b.rotSpeed * dt;
      b.group.rotation.z = Math.sin(time * 0.5 + b.phase) * 0.03;
    });

    // 2. Pedestrians Walking Animation (Optimized: full limb kinematics when near ground, lightweight when flying high)
    const isCloseToGround = this.position.y < 16;
    this.animatedPedestrians.forEach(p => {
      p.walkPhase += dt * p.speed * 3.5;
      if (isCloseToGround) {
        const swing = Math.sin(p.walkPhase) * 0.45;
        p.leftLeg.rotation.x = swing;
        p.rightLeg.rotation.x = -swing;
        p.leftArm.rotation.x = -swing * 0.8;
        p.rightArm.rotation.x = swing * 0.8;
      }

      if (p.isX) {
        p.group.position.x += p.dir * p.speed * dt;
        if (p.group.position.x > p.maxVal) {
          p.group.position.x = p.maxVal;
          p.dir = -1;
          p.group.rotation.y = -Math.PI / 2;
        } else if (p.group.position.x < p.minVal) {
          p.group.position.x = p.minVal;
          p.dir = 1;
          p.group.rotation.y = Math.PI / 2;
        }
      } else {
        p.group.position.z += p.dir * p.speed * dt;
        if (p.group.position.z > p.maxVal) {
          p.group.position.z = p.maxVal;
          p.dir = -1;
          p.group.rotation.y = Math.PI;
        } else if (p.group.position.z < p.minVal) {
          p.group.position.z = p.minVal;
          p.dir = 1;
          p.group.rotation.y = 0;
        }
      }
    });

    // 2.5. Dynamic City Traffic with Smart Traffic Light Coordination & Headway Control (100% Collision-Free)
    const trafficCycle = (time % 16.0); // 16-second complete light cycle (8s North-South Green, 8s East-West Green)
    const isNsGreen = trafficCycle < 8.0;

    // Update 3D Traffic Light Signal Emissive Colors
    this.trafficLightMeshes.forEach(tl => {
      const nsRedMat = tl.nsRedMesh.material as THREE.MeshBasicMaterial;
      const nsGreenMat = tl.nsGreenMesh.material as THREE.MeshBasicMaterial;
      const ewRedMat = tl.ewRedMesh.material as THREE.MeshBasicMaterial;
      const ewGreenMat = tl.ewGreenMesh.material as THREE.MeshBasicMaterial;

      if (isNsGreen) {
        nsGreenMat.color.setHex(0x22c55e); // Bright Green
        nsRedMat.color.setHex(0x450a0a);   // Dim Red
        ewGreenMat.color.setHex(0x052e16); // Dim Green
        ewRedMat.color.setHex(0xef4444);   // Bright Red
      } else {
        nsGreenMat.color.setHex(0x052e16); // Dim Green
        nsRedMat.color.setHex(0xef4444);   // Bright Red
        ewGreenMat.color.setHex(0x22c55e); // Bright Green
        ewRedMat.color.setHex(0x450a0a);   // Dim Red
      }
    });

    const crosswayZs = [30, -20, -60];

    for (let i = 0; i < this.dynamicVehicles.length; i++) {
      const v = this.dynamicVehicles[i];
      let currentSpeed = v.speed;

      // Check distance to preceding vehicle in the exact same lane & direction
      let minAheadDist = 999;
      for (let j = 0; j < this.dynamicVehicles.length; j++) {
        if (i === j) continue;
        const other = this.dynamicVehicles[j];
        if (other.isX !== v.isX || other.dir !== v.dir) continue;

        if (v.isX) {
          // Check lateral lane alignment (same Z lane)
          if (Math.abs(other.group.position.z - v.group.position.z) < 1.8) {
            const forwardDelta = (other.group.position.x - v.group.position.x) * v.dir;
            if (forwardDelta > 0 && forwardDelta < minAheadDist) {
              minAheadDist = forwardDelta;
            }
          }
        } else {
          // Check lateral lane alignment (same X lane)
          if (Math.abs(other.group.position.x - v.group.position.x) < 1.8) {
            const forwardDelta = (other.group.position.z - v.group.position.z) * v.dir;
            if (forwardDelta > 0 && forwardDelta < minAheadDist) {
              minAheadDist = forwardDelta;
            }
          }
        }
      }

      // Traffic Light Stop Line Logic
      if (!v.isX) {
        // North-South vehicle (traveling along Z)
        if (!isNsGreen) {
          // Red light for North-South
          crosswayZs.forEach(cz => {
            const stopZ = cz - v.dir * 10.5; // Stop line before crosswalk
            const distToStop = (stopZ - v.group.position.z) * v.dir;
            if (distToStop > 0 && distToStop < 12.0) {
              if (distToStop < 2.5) {
                currentSpeed = 0;
              } else {
                currentSpeed = Math.min(currentSpeed, v.speed * (distToStop / 12.0));
              }
            }
          });
        }
      } else {
        // East-West vehicle (traveling along X)
        if (isNsGreen) {
          // Red light for East-West crossways
          if (Math.abs(v.group.position.z) < 90) { // On downtown crossway intersections
            const stopX = -v.dir * 13.0; // Stop line before central boulevard
            const distToStop = (stopX - v.group.position.x) * v.dir;
            if (distToStop > 0 && distToStop < 12.0) {
              if (distToStop < 2.5) {
                currentSpeed = 0;
              } else {
                currentSpeed = Math.min(currentSpeed, v.speed * (distToStop / 12.0));
              }
            }
          }
        }
      }

      // Safe headway control: slow down or stop if another vehicle is ahead
      if (minAheadDist < 7.5) {
        currentSpeed = 0; // Complete stop to prevent overlap
      } else if (minAheadDist < 14.0) {
        currentSpeed = Math.min(currentSpeed, v.speed * 0.45); // Match pace and decelerate
      }

      // Pedestrian & Animal Safety Yield System: check if any pedestrian or animal is within vehicle forward path
      const vPos = v.group.position;
      for (let pIdx = 0; pIdx < this.animatedPedestrians.length; pIdx++) {
        const pedPos = this.animatedPedestrians[pIdx].group.position;
        if (v.isX) {
          if (Math.abs(pedPos.z - vPos.z) < 2.2) {
            const forwardPedDist = (pedPos.x - vPos.x) * v.dir;
            if (forwardPedDist > 0 && forwardPedDist < 8.0) {
              currentSpeed = 0; // Complete stop for pedestrian
              break;
            }
          }
        } else {
          if (Math.abs(pedPos.x - vPos.x) < 2.2) {
            const forwardPedDist = (pedPos.z - vPos.z) * v.dir;
            if (forwardPedDist > 0 && forwardPedDist < 8.0) {
              currentSpeed = 0; // Complete stop for pedestrian
              break;
            }
          }
        }
      }

      // Animal (Park Dog) Safety Yield
      if (this.parkDog) {
        const dogPos = this.parkDog.group.position;
        if (v.isX) {
          if (Math.abs(dogPos.z - vPos.z) < 2.0) {
            const forwardDogDist = (dogPos.x - vPos.x) * v.dir;
            if (forwardDogDist > 0 && forwardDogDist < 7.0) {
              currentSpeed = 0; // Complete stop for animal
            }
          }
        } else {
          if (Math.abs(dogPos.x - vPos.x) < 2.0) {
            const forwardDogDist = (dogPos.z - vPos.z) * v.dir;
            if (forwardDogDist > 0 && forwardDogDist < 7.0) {
              currentSpeed = 0; // Complete stop for animal
            }
          }
        }
      }

      if (v.isX) {
        v.group.position.x += v.dir * currentSpeed * dt;
        if (v.dir > 0 && v.group.position.x > v.maxVal) {
          v.group.position.x = v.minVal;
        } else if (v.dir < 0 && v.group.position.x < v.minVal) {
          v.group.position.x = v.maxVal;
        }
      } else {
        v.group.position.z += v.dir * currentSpeed * dt;
        if (v.dir > 0 && v.group.position.z > v.maxVal) {
          v.group.position.z = v.minVal;
        } else if (v.dir < 0 && v.group.position.z < v.minVal) {
          v.group.position.z = v.maxVal;
        }
      }

      // Rotate wheels smoothly when close to ground
      if (isCloseToGround && currentSpeed > 0) {
        for (let w = 0; w < v.wheels.length; w++) {
          v.wheels[w].rotation.x += dt * currentSpeed * 2.5;
        }
      }
    }

    // 3. Birds Flock Circling and Wing Flapping
    this.birdFlock.forEach(bird => {
      bird.angle += bird.speed * dt;
      const x = bird.center.x + Math.cos(bird.angle) * bird.radius;
      const z = bird.center.z + Math.sin(bird.angle) * bird.radius;
      const y = bird.height + Math.sin(time * 1.5 + bird.flapPhase) * 1.2;

      bird.group.position.set(x, y, z);
      bird.group.rotation.y = -bird.angle + Math.PI / 2;
      bird.group.rotation.z = -0.22; // Banking roll into curve

      const wingFlap = Math.sin(time * bird.flapSpeed + bird.flapPhase) * 0.45;
      bird.leftWing.rotation.y = wingFlap;
      bird.rightWing.rotation.y = -wingFlap;
    });

    // 4. Park Dog Trotting and Wagging Tail
    if (this.parkDog) {
      const dog = this.parkDog;
      if (isCloseToGround) {
        dog.walkPhase += dt * dog.speed * 5.0;
        dog.tail.rotation.y = Math.sin(time * 12) * 0.6; // Energetic tail wag
        dog.head.rotation.y = Math.sin(time * 3) * 0.15;

        const legSwing = Math.sin(dog.walkPhase) * 0.4;
        dog.legs[0].rotation.x = legSwing;
        dog.legs[1].rotation.x = -legSwing;
        dog.legs[2].rotation.x = -legSwing;
        dog.legs[3].rotation.x = legSwing;
      }

      dog.group.position.x += dog.dir * dog.speed * dt;
      if (dog.group.position.x > dog.maxX) {
        dog.group.position.x = dog.maxX;
        dog.dir = -1;
        dog.group.rotation.y = -Math.PI / 2;
      } else if (dog.group.position.x < dog.minX) {
        dog.group.position.x = dog.minX;
        dog.dir = 1;
        dog.group.rotation.y = Math.PI / 2;
      }
    }

    // 5. Red Aviation Warning Lights Blinking
    const beaconBlink = Math.sin(time * 3.5) > 0.1;
    this.redWarningLights.forEach(light => {
      light.visible = beaconBlink;
    });

    // 6. Fountain Water Shimmer Rotation
    if (this.fountainWater) {
      this.fountainWater.rotation.z += dt * 0.5;
    }

    // 7. Cyber Moon Orbital Rings & Satellite Revolution
    if (this.cyberMoonRings.length > 0) {
      this.cyberMoonRings[0].rotation.z += dt * 0.25;
      if (this.cyberMoonRings[1]) {
        this.cyberMoonRings[1].rotation.z -= dt * 0.20;
      }
    }

    // 8. Towering Sky Beacon Laser Searchlights Pulsing & Beam Sway
    this.skyBeacons.forEach((beacon) => {
      const pulse = Math.sin(time * beacon.pulseSpeed);
      const targetOpacity = beacon.baseOpacity * (0.8 + 0.3 * pulse);
      (beacon.mesh.material as THREE.MeshBasicMaterial).opacity = targetOpacity;
      if (beacon.light) {
        beacon.light.intensity = 1.4 + 0.6 * pulse;
      }
    });

    // 9. Heavy Sci-Fi Cargo Skycruisers Cruising with Banking Roll & Strobe Blinks
    const strobeBlink = Math.sin(time * 6.0) > 0.3;
    this.skyCruisers.forEach((cruiser) => {
      cruiser.angle += cruiser.speed * dt;
      const cx = Math.cos(cruiser.angle) * cruiser.radius;
      const cz = Math.sin(cruiser.angle) * cruiser.radius;
      const cy = cruiser.height + Math.sin(time * 0.8 + cruiser.radius) * 1.5;

      cruiser.group.position.set(cx, cy, cz);
      
      // Face flight direction and bank realistically into turns
      if (cruiser.speed > 0) {
        cruiser.group.rotation.y = -cruiser.angle + Math.PI / 2;
        cruiser.group.rotation.z = -0.15; // Inward bank
      } else {
        cruiser.group.rotation.y = -cruiser.angle - Math.PI / 2;
        cruiser.group.rotation.z = 0.15; // Inward bank
      }

      // Blink navigation strobes
      cruiser.strobes.forEach((strobe) => {
        strobe.visible = strobeBlink;
      });
    });

    // 10. Floating Holographic Data Relays (Gentle Levitating Bob and Double Ring Counter-Rotation)
    this.floatingDataRelays.forEach((relay) => {
      relay.group.position.y = relay.baseY + Math.sin(time * relay.floatSpeed) * 1.8;
      relay.innerRing.rotation.x += dt * relay.rotSpeed;
      relay.innerRing.rotation.y += dt * relay.rotSpeed * 0.7;
      relay.outerRing.rotation.y -= dt * relay.rotSpeed * 0.8;
      relay.outerRing.rotation.z += dt * relay.rotSpeed * 0.5;
    });

    // 11. Instanced Autonomous Sky Cruisers Orbit Animation (1 Single Draw Call update)
    if (this.instancedSkyCruisers && this.skyCruiserFlightPaths.length > 0) {
      this.skyCruiserFlightPaths.forEach((path, i) => {
        path.angle += path.speed * dt;
        const cx = Math.cos(path.angle) * path.radius;
        const cz = Math.sin(path.angle) * path.radius;
        const cy = path.height + Math.sin(time * 0.8 + path.radius) * 1.2;

        this._instPos.set(cx, cy, cz);
        const yaw = path.dir > 0 ? -path.angle + Math.PI / 2 : -path.angle - Math.PI / 2;
        this._instEuler.set(0, yaw, path.tilt, 'YXZ');
        this._instQuat.setFromEuler(this._instEuler);
        this._instScale.set(1, 1, 1);
        this._instMatrix.compose(this._instPos, this._instQuat, this._instScale);
        this.instancedSkyCruisers!.setMatrixAt(i, this._instMatrix);
      });
      this.instancedSkyCruisers.instanceMatrix.needsUpdate = true;
    }

    // 12. Instanced Floating Hologram Data Cubes Animation (1 Single Draw Call update)
    if (this.instancedDataCubes && this.dataCubeConfigs.length > 0) {
      this.dataCubeConfigs.forEach((cfg, i) => {
        const floatY = cfg.origin.y + Math.sin(time * cfg.floatSpeed + cfg.phase) * 0.9;
        this._instPos.set(cfg.origin.x, floatY, cfg.origin.z);
        this._instEuler.set(time * cfg.rotSpeed, time * cfg.rotSpeed * 0.8, time * cfg.rotSpeed * 0.5);
        this._instQuat.setFromEuler(this._instEuler);
        this._instScale.set(1, 1, 1);
        this._instMatrix.compose(this._instPos, this._instQuat, this._instScale);
        this.instancedDataCubes!.setMatrixAt(i, this._instMatrix);
      });
      this.instancedDataCubes.instanceMatrix.needsUpdate = true;
    }

    // 13. Clean Energy Wind Turbines Aerodynamic Rotor Blades Spin
    this.windTurbineRotors.forEach(r => {
      r.rotation.z += 1.4 * dt;
    });

    // 14. 63 Building Stage 5 Rescue Mission Beacon & Hologram Effects Animation (미션 활성화 시에만 동작)
    if (this.bldg63MissionEffectGroup) {
      const isRescueActive =
        (this.currentStage?.type === 'RESCUE' ||
          this.currentStage?.id === 'stage-5' ||
          this.currentStage?.id === 'rescue-1') &&
        !this.rescueTarget?.pickedUp;

      this.bldg63MissionEffectGroup.visible = isRescueActive;

      if (isRescueActive) {
        // Ascending pulsating golden target wave rings
        this.bldg63BeaconRings.forEach((ring, idx) => {
          const ringY = ((time * 24 + idx * 22) % 65) + 4;
          ring.position.y = ringY;
          const progress = (ringY - 4) / 65;
          const scale = 1.0 + progress * 2.2;
          ring.scale.set(scale, scale, scale);
          (ring.material as THREE.MeshBasicMaterial).opacity = (1.0 - progress) * 0.9;
        });

        // Floating emergency mission hologram signboard gentle floating bob and facing drone
        if (this.bldg63HoloSign) {
          this.bldg63HoloSign.position.y = 16.0 + Math.sin(time * 3.0) * 1.2;
          // Rotate smoothly to face the drone
          const dx = this.position.x - 46.5;
          const dz = this.position.z - 95.0;
          this.bldg63HoloSign.rotation.y = Math.atan2(dx, dz);
        }

        // Rotating golden searchlight sweeps
        this.bldg63Searchlights.forEach((sCone, sIdx) => {
          const sAngle = time * 2.2 + sIdx * (Math.PI / 2);
          sCone.rotation.x = Math.sin(sAngle) * 0.35;
          sCone.rotation.z = Math.cos(sAngle) * 0.35;
        });
      }
    }
  }

  private buildDustRing() {
    const geo = new THREE.RingGeometry(0.8, 1.4, 24);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.0, 
      side: THREE.DoubleSide 
    });
    this.dustRing = new THREE.Mesh(geo, mat);
    this.dustRing.rotation.x = -Math.PI / 2;
    this.dustRing.position.y = 0.05;
    this.scene.add(this.dustRing);
  }

  public updateSkin(skin: DroneSkin) {
    this.currentSkin = skin;
    this.buildDroneModel();
  }

  private buildDroneModel() {
    // Remove old
    if (this.droneGroup) {
      this.scene.remove(this.droneGroup);
    }

    this.droneGroup = new THREE.Group();
    this.droneModelHolder = new THREE.Group();
    // Invert 180° so the nose/canopy/headlights face forward (-Z in flight coordinates)
    this.droneModelHolder.rotation.y = Math.PI;
    this.droneGroup.add(this.droneModelHolder);

    this.propMeshes = [];
    this.ledLights = [];
    this.jetFlameMeshes = [];

    const primaryColor = new THREE.Color(this.currentSkin.primaryColor);
    const secondaryColor = new THREE.Color(this.currentSkin.secondaryColor);
    const propColor = new THREE.Color(this.currentSkin.propColor);
    const ledColor = new THREE.Color(this.currentSkin.ledColor);

    // Lightweight mobile-optimized materials (Zero heavy transmission passes)
    const bodyMat = new THREE.MeshLambertMaterial({ 
      color: primaryColor
    });
    const accentMat = new THREE.MeshLambertMaterial({ 
      color: secondaryColor
    });
    const carbonMat = new THREE.MeshLambertMaterial({ 
      color: 0x1e293b
    });
    const canopyMat = new THREE.MeshLambertMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.85
    });

    switch (this.currentSkin.modelType) {
      case 'HEXA_RESCUE':
        this.buildHexaRescueModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'TWIN_RACER':
        this.buildTwinRacerModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'OCTA_EXPLORER':
        this.buildOctaExplorerModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'CYBER_JET':
        this.buildCyberJetModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'STEALTH_ACE':
        this.buildStealthAceModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
      case 'QUAD_PROBE':
      default:
        this.buildQuadProbeModel(bodyMat, accentMat, carbonMat, canopyMat, propColor, ledColor);
        break;
    }

    // Magnetic Rescue Tractor Beam (Invisible by default, glows when active)
    const beamGeo = new THREE.ConeGeometry(0.6, 2.2, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ 
      color: 0x38bdf8, 
      transparent: true, 
      opacity: 0.0, 
      side: THREE.DoubleSide 
    });
    this.tractorBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.tractorBeamMesh.rotation.x = Math.PI;
    this.tractorBeamMesh.position.y = -1.1;
    this.droneGroup.add(this.tractorBeamMesh);

    this.droneGroup.position.copy(this.position);
    this.scene.add(this.droneGroup);
  }

  // 1. Classic Quad Probe X-4 (X-Quad with Safety Ring Duct Guards & Front Camera Eye)
  private buildQuadProbeModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    const coreGeo = new THREE.SphereGeometry(0.42, 24, 18);
    coreGeo.scale(1.2, 0.75, 1.3);
    this.droneBodyMesh = new THREE.Mesh(coreGeo, bodyMat);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    const visorGeo = new THREE.SphereGeometry(0.28, 16, 16);
    visorGeo.scale(1.0, 0.6, 1.1);
    const visor = new THREE.Mesh(visorGeo, canopyMat);
    visor.position.set(0, 0.1, 0.22);
    this.droneModelHolder.add(visor);

    const eyeGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.08, 0.45);
    this.droneModelHolder.add(eye);

    const armDistance = 0.68;
    const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    armAngles.forEach((angle, idx) => {
      const armLength = armDistance;
      const x = Math.cos(angle) * armLength;
      const z = Math.sin(angle) * armLength;

      const armGeo = new THREE.CylinderGeometry(0.045, 0.045, armLength, 8);
      const arm = new THREE.Mesh(armGeo, carbonMat);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -angle;
      arm.position.set(x / 2, 0, z / 2);
      this.droneModelHolder.add(arm);

      const motorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16);
      const motor = new THREE.Mesh(motorGeo, accentMat);
      motor.position.set(x, 0.05, z);
      motor.castShadow = true;
      this.droneModelHolder.add(motor);

      const ringGeo = new THREE.TorusGeometry(0.32, 0.025, 8, 24);
      const guard = new THREE.Mesh(ringGeo, accentMat);
      guard.rotation.x = Math.PI / 2;
      guard.position.set(x, 0.14, z);
      this.droneModelHolder.add(guard);

      const propGroup = new THREE.Group();
      propGroup.position.set(x, 0.16, z);

      const bladeGeo = new THREE.BoxGeometry(0.56, 0.012, 0.06);
      const bladeMat = new THREE.MeshLambertMaterial({ color: propColor });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      propGroup.add(blade);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), accentMat);
      propGroup.add(hub);

      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);

      const ledColorHex = (idx === 0 || idx === 3) ? 0x22c55e : 0xef4444;
      const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: ledColorHex }));
      ledMesh.position.set(x, -0.06, z);
      this.droneModelHolder.add(ledMesh);
    });

    // Landing skids
    const skidMat = carbonMat;
    const skidLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.7), skidMat);
    skidLeft.position.set(-0.32, -0.22, 0);
    this.droneModelHolder.add(skidLeft);

    const skidRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.7), skidMat);
    skidRight.position.set(0.32, -0.22, 0);
    this.droneModelHolder.add(skidRight);

    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8);
    [-0.32, 0.32].forEach(lx => {
      [-0.2, 0.2].forEach(lz => {
        const leg = new THREE.Mesh(legGeo, skidMat);
        leg.position.set(lx, -0.11, lz);
        this.droneModelHolder.add(leg);
      });
    });
  }

  // 2. Heavy Hexacopter Rescue Frame (6 Motors, Flashing Emergency Siren Lightbar, Dual Searchlights)
  private buildHexaRescueModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Rugged Hexagonal Core Fuselage
    const hexaGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.35, 6);
    this.droneBodyMesh = new THREE.Mesh(hexaGeo, bodyMat);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // High-visibility Emergency Hazard Stripes on Roof
    const stripeGeo = new THREE.BoxGeometry(0.8, 0.02, 0.12);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe1.position.set(0, 0.18, 0.15);
    this.droneModelHolder.add(stripe1);

    const stripe2 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe2.position.set(0, 0.18, -0.15);
    this.droneModelHolder.add(stripe2);

    // Rooftop Flashing Emergency Lightbar (Red + Blue)
    const lightbarBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.08, 0.16),
      new THREE.MeshLambertMaterial({ color: 0x0f172a })
    );
    lightbarBase.position.set(0, 0.22, 0);
    this.droneModelHolder.add(lightbarBase);

    const redSiren = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    redSiren.position.set(-0.12, 0.28, 0);
    this.droneModelHolder.add(redSiren);

    const blueSiren = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
    );
    blueSiren.position.set(0.12, 0.28, 0);
    this.droneModelHolder.add(blueSiren);

    // Dual Forward High-Beam LED Searchlights
    [-0.22, 0.22].forEach(hx => {
      const searchLightGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 12);
      const searchLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const slMesh = new THREE.Mesh(searchLightGeo, searchLightMat);
      slMesh.rotation.x = Math.PI / 2;
      slMesh.position.set(hx, 0.02, 0.45);
      this.droneModelHolder.add(slMesh);
    });

    // 6 Hexacopter Carbon Motor Arms (Every 60 degrees!)
    const armDistance = 0.78;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = Math.cos(angle) * armDistance;
      const z = Math.sin(angle) * armDistance;

      // Heavy dual truss arm
      const armGeo = new THREE.CylinderGeometry(0.04, 0.04, armDistance, 8);
      const arm = new THREE.Mesh(armGeo, carbonMat);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -angle;
      arm.position.set(x / 2, 0, z / 2);
      this.droneModelHolder.add(arm);

      // Heavy motor mount
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 16), accentMat);
      motor.position.set(x, 0.08, z);
      this.droneModelHolder.add(motor);

      // Hexa Propeller
      const propGroup = new THREE.Group();
      propGroup.position.set(x, 0.19, z);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.012, 0.065),
        new THREE.MeshLambertMaterial({ color: propColor })
      );
      propGroup.add(blade);
      propGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), accentMat));
      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);

      // Arm navigation LEDs
      const isFront = (i === 0 || i === 5 || i === 1);
      const ledColorHex = isFront ? 0xef4444 : 0xfbbf24;
      const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: ledColorHex }));
      ledMesh.position.set(x, -0.08, z);
      this.droneModelHolder.add(ledMesh);
    }

    // Heavy Rescue Triangular Base Skids
    const heavySkidGeo = new THREE.BoxGeometry(0.06, 0.04, 0.85);
    const s1 = new THREE.Mesh(heavySkidGeo, carbonMat);
    s1.position.set(-0.38, -0.24, 0);
    this.droneModelHolder.add(s1);

    const s2 = new THREE.Mesh(heavySkidGeo, carbonMat);
    s2.position.set(0.38, -0.24, 0);
    this.droneModelHolder.add(s2);
  }

  // 3. Twin-Boom Racing Speedster (Aerodynamic Canard Wings, Twin Longitudinal Carbon Booms, Racing Spoiler)
  private buildTwinRacerModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Ultra-low Wedge Racing Fuselage
    const fuselageGeo = new THREE.BoxGeometry(0.36, 0.18, 1.1);
    this.droneBodyMesh = new THREE.Mesh(fuselageGeo, bodyMat);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // Aerodynamic Cockpit Bubble
    const canopyGeo = new THREE.SphereGeometry(0.2, 16, 12);
    canopyGeo.scale(0.8, 0.5, 2.2);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.1, -0.05);
    this.droneModelHolder.add(canopy);

    // Front Canard Downforce Wings
    const canardGeo = new THREE.BoxGeometry(0.9, 0.02, 0.2);
    const canard = new THREE.Mesh(canardGeo, accentMat);
    canard.position.set(0, 0.02, 0.25);
    this.droneModelHolder.add(canard);

    // Twin Longitudinal Carbon Booms (Left & Right Spars)
    const boomGeo = new THREE.BoxGeometry(0.06, 0.06, 1.3);
    const boomL = new THREE.Mesh(boomGeo, carbonMat);
    boomL.position.set(-0.42, 0, 0);
    this.droneModelHolder.add(boomL);

    const boomR = new THREE.Mesh(boomGeo, carbonMat);
    boomR.position.set(0.42, 0, 0);
    this.droneModelHolder.add(boomR);

    // Rear Aerodynamic Racing Downforce Spoiler
    const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.22), accentMat);
    spoilerWing.position.set(0, 0.22, -0.48);
    this.droneModelHolder.add(spoilerWing);

    // Spoiler Endplates
    const endplateGeo = new THREE.BoxGeometry(0.02, 0.18, 0.24);
    const endplateL = new THREE.Mesh(endplateGeo, bodyMat);
    endplateL.position.set(-0.5, 0.22, -0.48);
    this.droneModelHolder.add(endplateL);

    const endplateR = new THREE.Mesh(endplateGeo, bodyMat);
    endplateR.position.set(0.5, 0.22, -0.48);
    this.droneModelHolder.add(endplateR);

    // 4 High-Pitch Racing Motors at Boom Ends
    const motorPositions = [
      { x: -0.42, z: 0.52 },
      { x: 0.42, z: 0.52 },
      { x: -0.42, z: -0.52 },
      { x: 0.42, z: -0.52 }
    ];

    motorPositions.forEach((mp, idx) => {
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 16), accentMat);
      motor.position.set(mp.x, 0.08, mp.z);
      this.droneModelHolder.add(motor);

      // Oversized 3-Blade Racing Propellers
      const propGroup = new THREE.Group();
      propGroup.position.set(mp.x, 0.18, mp.z);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.012, 0.08),
        new THREE.MeshLambertMaterial({ color: propColor })
      );
      propGroup.add(blade);
      propGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), bodyMat));
      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);

      const ledColorHex = mp.z > 0 ? 0xfacc15 : 0xef4444;
      const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: ledColorHex }));
      ledMesh.position.set(mp.x, -0.06, mp.z);
      this.droneModelHolder.add(ledMesh);
    });

    // Low-profile racing skids
    const rskidL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.6), carbonMat);
    rskidL.position.set(-0.25, -0.16, 0);
    this.droneModelHolder.add(rskidL);

    const rskidR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.6), carbonMat);
    rskidR.position.set(0.25, -0.16, 0);
    this.droneModelHolder.add(rskidR);
  }

  // 4. Heavy Octa Explorer (8 Coaxial Counter-Rotating Rotors, 3-Axis 4K Camera Gimbal, Expedition Base)
  private buildOctaExplorerModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Octagonal Expedition Body
    const octGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 8);
    this.droneBodyMesh = new THREE.Mesh(octGeo, bodyMat);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // Top Satellite GPS Antenna Mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8), carbonMat);
    mast.position.set(0, 0.3, -0.1);
    this.droneModelHolder.add(mast);

    const gpsDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), accentMat);
    gpsDisc.position.set(0, 0.44, -0.1);
    this.droneModelHolder.add(gpsDisc);

    // Bottom 3-Axis Gyro Gimbal 4K Optical Sphere Camera
    const gimbalArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), carbonMat);
    gimbalArm.position.set(0, -0.22, 0.18);
    this.droneModelHolder.add(gimbalArm);

    const cameraSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshLambertMaterial({ color: 0x0f172a })
    );
    cameraSphere.position.set(0, -0.32, 0.22);
    this.droneModelHolder.add(cameraSphere);

    // Glowing Optical Camera Lens
    const lens = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.1, 16),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
    );
    lens.position.set(0, -0.32, 0.38);
    this.droneModelHolder.add(lens);

    // 4 Heavy Coaxial Motor Arms carrying 8 counter-rotating propellers!
    const armDistance = 0.72;
    const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    armAngles.forEach((angle, idx) => {
      const x = Math.cos(angle) * armDistance;
      const z = Math.sin(angle) * armDistance;

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, armDistance, 8), carbonMat);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -angle;
      arm.position.set(x / 2, 0, z / 2);
      this.droneModelHolder.add(arm);

      // Dual Coaxial Motor Mount (Upper & Lower)
      const motorHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 16), accentMat);
      motorHousing.position.set(x, 0.02, z);
      this.droneModelHolder.add(motorHousing);

      // Upper Propeller (Clockwise)
      const topPropGroup = new THREE.Group();
      topPropGroup.position.set(x, 0.20, z);
      const topBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.012, 0.06),
        new THREE.MeshLambertMaterial({ color: propColor })
      );
      topPropGroup.add(topBlade);
      this.droneModelHolder.add(topPropGroup);
      this.propMeshes.push(topBlade);

      // Lower Propeller (Counter-Clockwise)
      const btmPropGroup = new THREE.Group();
      btmPropGroup.position.set(x, -0.16, z);
      const btmBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.012, 0.06),
        new THREE.MeshLambertMaterial({ color: propColor })
      );
      btmPropGroup.add(btmBlade);
      this.droneModelHolder.add(btmPropGroup);
      this.propMeshes.push(btmBlade);

      const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      ledMesh.position.set(x, 0, z);
      this.droneModelHolder.add(ledMesh);
    });

    // 4 Wide Expedition Shock-Absorbing Landing Feet
    armAngles.forEach(angle => {
      const fx = Math.cos(angle) * 0.48;
      const fz = Math.sin(angle) * 0.48;

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 8), carbonMat);
      leg.position.set(fx, -0.22, fz);
      this.droneModelHolder.add(leg);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), accentMat);
      foot.position.set(fx, -0.34, fz);
      this.droneModelHolder.add(foot);
    });
  }

  // 5. Cyber Jet Quad (Futuristic Delta-Wing Aero Fuselage, Neon Light Strips, Plasma Jet Nozzles)
  private buildCyberJetModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Sharp Futuristic Delta Wing Body
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.65);       // Nose
    wingShape.lineTo(0.62, -0.45);   // Right wingtip
    wingShape.lineTo(0.35, -0.55);   // Right engine notch
    wingShape.lineTo(0, -0.42);      // Rear center
    wingShape.lineTo(-0.35, -0.55);  // Left engine notch
    wingShape.lineTo(-0.62, -0.45);  // Left wingtip
    wingShape.closePath();

    const extrudeSettings = { depth: 0.14, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.center();
    this.droneBodyMesh = new THREE.Mesh(wingGeo, bodyMat);
    this.droneBodyMesh.rotation.x = Math.PI / 2;
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // Glowing Neon Edge Piping along Delta Wings (Cyan & Magenta Cyberpunk Glow)
    const neonEdgeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.2), neonEdgeMat);
    edgeL.rotation.y = -Math.PI / 6;
    edgeL.position.set(-0.32, 0.06, 0.05);
    this.droneModelHolder.add(edgeL);

    const edgeR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.2), neonEdgeMat);
    edgeR.rotation.y = Math.PI / 6;
    edgeR.position.set(0.32, 0.06, 0.05);
    this.droneModelHolder.add(edgeR);

    // Streamlined Stealth Canopy
    const jetCanopyGeo = new THREE.SphereGeometry(0.18, 16, 12);
    jetCanopyGeo.scale(0.7, 0.45, 2.4);
    const jetCanopy = new THREE.Mesh(jetCanopyGeo, canopyMat);
    jetCanopy.position.set(0, 0.12, 0.08);
    this.droneModelHolder.add(jetCanopy);

    // Twin Rear Cylindrical Plasma Jet Exhaust Thrusters
    [-0.22, 0.22].forEach(jx => {
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.28, 16),
        new THREE.MeshLambertMaterial({ color: 0x0f172a })
      );
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(jx, 0.02, -0.48);
      this.droneModelHolder.add(nozzle);

      // Glowing Blue/Purple Plasma Core Disc
      const plasmaDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.09, 16),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
      );
      plasmaDisc.position.set(jx, 0.02, -0.63);
      this.droneModelHolder.add(plasmaDisc);
      this.jetFlameMeshes.push(plasmaDisc);
    });

    // 4 Enclosed Turbine Ducts & Propellers
    const ductPositions = [
      { x: -0.44, z: 0.28 },
      { x: 0.44, z: 0.28 },
      { x: -0.44, z: -0.28 },
      { x: 0.44, z: -0.28 }
    ];

    ductPositions.forEach(dp => {
      // Carbon turbine duct
      const duct = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 20), carbonMat);
      duct.rotation.x = Math.PI / 2;
      duct.position.set(dp.x, 0.08, dp.z);
      this.droneModelHolder.add(duct);

      const propGroup = new THREE.Group();
      propGroup.position.set(dp.x, 0.08, dp.z);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.50, 0.012, 0.06),
        new THREE.MeshLambertMaterial({ color: propColor })
      );
      propGroup.add(blade);
      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);
    });
  }

  // 6. Stealth Phantom Night Wing (Radar-Evading Diamond Fuselage, Twin Canted Tailfins, Stealth Laser Sensor)
  private buildStealthAceModel(
    bodyMat: THREE.Material, 
    accentMat: THREE.Material, 
    carbonMat: THREE.Material, 
    canopyMat: THREE.Material, 
    propColor: THREE.Color,
    ledColor: THREE.Color
  ) {
    // Faceted Diamond Stealth Body
    const stealthGeo = new THREE.ConeGeometry(0.55, 1.2, 4);
    this.droneBodyMesh = new THREE.Mesh(stealthGeo, bodyMat);
    this.droneBodyMesh.rotation.x = Math.PI / 2;
    this.droneBodyMesh.scale.set(1.2, 1.0, 0.4);
    this.droneBodyMesh.castShadow = true;
    this.droneModelHolder.add(this.droneBodyMesh);

    // Twin Canted Vertical Stabilizer Tailfins (Stealth Angle)
    const finGeo = new THREE.BoxGeometry(0.03, 0.35, 0.4);
    const finL = new THREE.Mesh(finGeo, accentMat);
    finL.position.set(-0.28, 0.18, -0.38);
    finL.rotation.z = -Math.PI / 8;
    this.droneModelHolder.add(finL);

    const finR = new THREE.Mesh(finGeo, accentMat);
    finR.position.set(0.28, 0.18, -0.38);
    finR.rotation.z = Math.PI / 8;
    this.droneModelHolder.add(finR);

    // Glowing Cyan Pulsating Stealth Eye Slit
    const sensorSlit = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.03, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    sensorSlit.position.set(0, 0.04, 0.52);
    this.droneModelHolder.add(sensorSlit);

    // 4 Low-Noise Stealth Motor Arms
    const armDistance = 0.65;
    const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    armAngles.forEach((angle, idx) => {
      const x = Math.cos(angle) * armDistance;
      const z = Math.sin(angle) * armDistance;

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, armDistance), carbonMat);
      arm.rotation.y = -angle;
      arm.position.set(x / 2, 0, z / 2);
      this.droneModelHolder.add(arm);

      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.14, 16), carbonMat);
      motor.position.set(x, 0.06, z);
      this.droneModelHolder.add(motor);

      // Stealth Matte Propellers with Glowing Tip Trim
      const propGroup = new THREE.Group();
      propGroup.position.set(x, 0.14, z);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.01, 0.055),
        new THREE.MeshLambertMaterial({ color: 0x0f172a })
      );
      propGroup.add(blade);

      // Cyan blade tips
      const tip1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.056), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
      tip1.position.x = 0.25;
      propGroup.add(tip1);

      const tip2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.056), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
      tip2.position.x = -0.25;
      propGroup.add(tip2);

      this.droneModelHolder.add(propGroup);
      this.propMeshes.push(blade);

      const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
      ledMesh.position.set(x, -0.05, z);
      this.droneModelHolder.add(ledMesh);
    });

    // Integrated low drag stealth skids
    const skidGeo = new THREE.BoxGeometry(0.04, 0.02, 0.5);
    const skL = new THREE.Mesh(skidGeo, carbonMat);
    skL.position.set(-0.28, -0.15, 0);
    this.droneModelHolder.add(skL);

    const skR = new THREE.Mesh(skidGeo, carbonMat);
    skR.position.set(0.28, -0.15, 0);
    this.droneModelHolder.add(skR);
  }

  // AI Drone Setup
  public setupAiDrone() {
    if (this.aiDroneGroup) {
      this.scene.remove(this.aiDroneGroup);
    }

    this.aiDroneGroup = new THREE.Group();
    this.aiProps = [];

    // High-performance cyber racing drone aesthetics
    const bodyMat = new THREE.MeshLambertMaterial({
      color: 0x6d28d9 // Royal AI Violet
    });
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xec4899 }); // Neon Magenta
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });

    // Sleek Aerodynamic Core Fuselage
    const coreGeo = new THREE.CylinderGeometry(0.32, 0.42, 0.22, 16);
    const core = new THREE.Mesh(coreGeo, bodyMat);
    core.castShadow = true;
    this.aiDroneGroup.add(core);

    // Glowing Cyber Sensor Eyes (Front Twin Sensors)
    [-0.12, 0.12].forEach(ox => {
      const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ox, 0.05, 0.38);
      this.aiDroneGroup!.add(eye);
    });

    // Top Aerodynamic Fin
    const finGeo = new THREE.BoxGeometry(0.06, 0.18, 0.5);
    const fin = new THREE.Mesh(finGeo, neonMat);
    fin.position.set(0, 0.18, -0.05);
    this.aiDroneGroup.add(fin);

    // 4 Carbon-Fiber Quad Arms & Glowing Racing Rotors
    const armDistance = 0.55;
    const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    angles.forEach((angle, idx) => {
      const x = Math.cos(angle) * armDistance;
      const z = Math.sin(angle) * armDistance;

      // Arm Spar
      const armGeo = new THREE.BoxGeometry(0.12, 0.06, armDistance);
      const arm = new THREE.Mesh(armGeo, goldMat);
      arm.position.set(x * 0.5, 0, z * 0.5);
      arm.rotation.y = -angle + Math.PI / 2;
      this.aiDroneGroup!.add(arm);

      // Motor Pod
      const podGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12);
      const pod = new THREE.Mesh(podGeo, bodyMat);
      pod.position.set(x, 0.04, z);
      this.aiDroneGroup!.add(pod);

      // Motor LED Ring
      const ringGeo = new THREE.RingGeometry(0.1, 0.14, 12);
      const motorRing = new THREE.Mesh(ringGeo, neonMat);
      motorRing.rotation.x = -Math.PI / 2;
      motorRing.position.set(x, 0.12, z);
      this.aiDroneGroup!.add(motorRing);

      // Propellers
      const propGeo = new THREE.BoxGeometry(0.46, 0.015, 0.06);
      const propMat = new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0xf43f5e : 0xec4899 });
      const prop = new THREE.Mesh(propGeo, propMat);
      prop.position.set(x, 0.14, z);
      this.aiDroneGroup!.add(prop);
      this.aiProps.push(prop);
    });

    // AI Drone floating position at start line (Right grid slot beside player)
    this.aiDroneGroup.position.set(2.5, 0.4, 0);
    this.scene.add(this.aiDroneGroup);

    this.aiRacerState = {
      position: { x: 2.5, y: 0.4, z: 0 },
      currentWaypointIdx: 1, // Start aiming immediately at Central Park Arch (Waypoint 1)
      speed: 0,
      lap: 1,
      finished: false,
      finishTimeSec: null
    };
  }

  // Mission Loading
  public loadMission(stage: MissionStage) {
    this.currentStage = stage;
    this.isRaceReady = false;
    this.clearMissionObjects();
    this.resetDronePosition();

    // Stage 6: Strictly lock speed gear to 2 (Sport Mode) for both AI and Player
    // Also remove the yellow landing pad specifically for Stage 6 race grid
    const isStage6 = stage.type === 'AI_RACING';
    if (isStage6) {
      this.speedGear = 2;
    }
    if (this.baseHelipadMesh) {
      this.baseHelipadMesh.visible = !isStage6;
    }

    if (stage.type === 'COIN_HUNT') {
      this.spawnCoins();
    } else if (stage.type === 'RING_RACE') {
      this.spawnRings();
    } else if (stage.type === 'RESCUE') {
      this.spawnRescueMission();
    } else if (stage.type === 'AI_RACING') {
      this.spawnAiRacingTrack();
    } else if (stage.type === 'TUTORIAL') {
      this.spawnTutorialObjects();
    }
  }

  private clearMissionObjects() {
    this.ringMeshes.forEach(mesh => this.scene.remove(mesh));
    this.ringMeshes = [];
    this.rings = [];

    if (this.missionGuidanceGroup) {
      this.missionGuidanceGroup.visible = false;
    }
    if (this.guidanceBeaconGroup) {
      this.guidanceBeaconGroup.visible = false;
    }

    this.coinMeshes.forEach(mesh => {
      if (mesh.parent) {
        this.scene.remove(mesh.parent);
      } else {
        this.scene.remove(mesh);
      }
    });
    this.coinMeshes = [];
    this.coins = [];

    if (this.rescuePatientMesh) {
      this.scene.remove(this.rescuePatientMesh);
      this.rescuePatientMesh = null;
    }
    this.rescueTarget = null;
    this.rescueDelivered = false;
    this.patientAttached = false;
    this.isTransferringPatientToOR = false;
    this.transferORProgress = 0;

    // Reset OR doors if present
    if (this.hospitalORDoorLeft && this.hospitalORDoorRight) {
      this.hospitalORDoorLeft.position.x = -0.8;
      this.hospitalORDoorRight.position.x = 0.8;
    }

    if (this.raceTrackGroup) {
      this.scene.remove(this.raceTrackGroup);
      this.raceTrackGroup = null;
    }

    if (this.aiDroneGroup) {
      this.scene.remove(this.aiDroneGroup);
      this.aiDroneGroup = null;
    }
    this.aiProps = [];
    this.aiRacerState = null;
    this.raceActive = false;
    this.raceFinished = false;

    // Clear Stage 2 Dynamic Obstacles
    this.stage2Obstacles.forEach(obs => {
      this.scene.remove(obs.group);
    });
    this.stage2Obstacles = [];
    this.stage2LandingReady = false;
  }

  private spawnCoins() {
    // Tightly grouped, flowing central park layout (within 8~18m of takeoff pad)
    const coinPositions: [number, number, number][] = [
      [0, 2.2, -12],
      [-8, 2.6, -18],
      [-15, 3.2, -8],
      [-10, 2.5, 8],
      [0, 3.4, 16],
      [10, 2.6, 10],
      [15, 3.0, -6],
      [8, 2.2, -16]
    ];

    // Shared high-performance pure vibrant gold materials
    const coinMat = new THREE.MeshLambertMaterial({ 
      color: 0xffd700
    });

    const coinRimMat = new THREE.MeshLambertMaterial({
      color: 0xffea00
    });

    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    coinPositions.forEach((pos, idx) => {
      this.coins.push({ id: idx + 1, position: pos, collected: false });

      const coinGroup = new THREE.Group();
      coinGroup.position.set(...pos);

      // Main Gold coin cylinder
      const coinGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.14, 32);
      const coinMesh = new THREE.Mesh(coinGeo, coinMat);
      coinMesh.rotation.x = Math.PI / 2;
      coinGroup.add(coinMesh);

      // Gold Coin Embossed Outer Rim
      const rimGeo = new THREE.TorusGeometry(0.72, 0.05, 12, 32);
      const rimFront = new THREE.Mesh(rimGeo, coinRimMat);
      rimFront.position.z = 0.07;
      coinGroup.add(rimFront);

      const rimBack = new THREE.Mesh(rimGeo, coinRimMat);
      rimBack.position.z = -0.07;
      coinGroup.add(rimBack);

      // Double-sided Star Emblem inside coin
      const starMesh1 = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.45, 5), starMat);
      starMesh1.position.z = 0.08;
      coinGroup.add(starMesh1);

      const starMesh2 = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.45, 5), starMat);
      starMesh2.position.z = -0.08;
      coinGroup.add(starMesh2);

      // Outer luminous halo ring (Warm golden glow)
      const haloGeo = new THREE.RingGeometry(0.85, 1.05, 32);
      const haloMat = new THREE.MeshBasicMaterial({ 
        color: 0xffdf00, 
        transparent: true, 
        opacity: 0.65, 
        side: THREE.DoubleSide 
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      coinGroup.add(halo);

      this.scene.add(coinGroup);
      this.coinMeshes.push(coinMesh);
    });
  }

  private spawnRings() {
    const isStage4 = this.currentStage?.id === 'ring-race-1' || this.currentStage?.id === 'stage-4' || this.currentStage?.type === 'RING_RACE';

    if (isStage4) {
      // Stage 4: 9 Complete Building Penetration & Skyway Portals
      const tunnelSpecs: { 
        pos: [number, number, number]; 
        rotY: number; 
        w: number; 
        h: number; 
        radius: number; 
        name: string; 
      }[] = [
        { pos: [0, 6.0, -45], rotY: 0, w: 14.0, h: 8.0, radius: 5.5, name: '1번: 여의대로 국회의사당 진입 아치' },
        { pos: [0, 8.0, -95], rotY: 0, w: 16.0, h: 9.0, radius: 6.0, name: '2번: 국회의사당 잔디광장 분수대 게이트' },
        { pos: [-35, 12.0, -52], rotY: Math.PI, w: 14.0, h: 8.0, radius: 5.5, name: '3번: 알파 빌딩 16m 관통 터널 진입' },
        { pos: [-70, 20.0, -32], rotY: Math.PI, w: 14.0, h: 8.0, radius: 5.5, name: '4번: 트윈 타워 스카이브릿지 관통 진입' },
        { pos: [-20, 16.0, 60], rotY: -Math.PI / 2, w: 14.0, h: 8.0, radius: 5.5, name: '5번: 북측 스카이라인 연결 회랑 게이트' },
        { pos: [15, 14.0, 60], rotY: -Math.PI / 2, w: 14.0, h: 8.0, radius: 5.5, name: '6번: 동측 테크 타워 고속 진입 게이트' },
        { pos: [35, 14.0, 52], rotY: 0, w: 14.0, h: 8.0, radius: 5.5, name: '7번: 감마 빌딩 16m 관통 터널 진입' },
        { pos: [15, 8.0, 15], rotY: Math.PI / 4, w: 14.0, h: 8.0, radius: 5.5, name: '8번: 남동측 개방 회랑 복귀 아치' },
        { pos: [0, 5.0, 12], rotY: Math.PI, w: 14.0, h: 8.0, radius: 5.5, name: '9번: 피니시 네온 게이트 관통' }
      ];

      tunnelSpecs.forEach((spec, idx) => {
        const tunnelId = idx + 1;
        const isActive = idx === 0;
        const isFinish = idx === tunnelSpecs.length - 1;

        this.rings.push({
          id: tunnelId,
          position: spec.pos,
          rotationY: spec.rotY,
          radius: spec.radius,
          passed: false,
          active: isActive
        });

        // Build Rectangular Building Penetration Gate Portal Mesh
        const portalGroup = new THREE.Group();
        portalGroup.position.set(...spec.pos);
        portalGroup.rotation.y = spec.rotY;

        // 1. Heavy Rectangular Framework Beams (Top, Bottom, Left, Right)
        const frameMat = new THREE.MeshLambertMaterial({
          color: isActive ? 0xef4444 : (isFinish ? 0xfacc15 : 0x334155)
        });

        const beamThickness = 0.45;
        // Top Horizontal Beam
        const beamTop = new THREE.Mesh(new THREE.BoxGeometry(spec.w, beamThickness, beamThickness), frameMat);
        beamTop.position.y = spec.h / 2;
        portalGroup.add(beamTop);

        // Bottom Horizontal Beam
        const beamBtm = new THREE.Mesh(new THREE.BoxGeometry(spec.w, beamThickness, beamThickness), frameMat);
        beamBtm.position.y = -spec.h / 2;
        portalGroup.add(beamBtm);

        // Left Vertical Pillar
        const beamLeft = new THREE.Mesh(new THREE.BoxGeometry(beamThickness, spec.h, beamThickness), frameMat);
        beamLeft.position.x = -spec.w / 2;
        portalGroup.add(beamLeft);

        // Right Vertical Pillar
        const beamRight = new THREE.Mesh(new THREE.BoxGeometry(beamThickness, spec.h, beamThickness), frameMat);
        beamRight.position.x = spec.w / 2;
        portalGroup.add(beamRight);

        // 2. High-Tech Corner L-Brackets with Pulsing Glow
        const cornerMat = new THREE.MeshBasicMaterial({ color: isActive ? 0xff0033 : 0x00f0ff });
        const corners = [
          [-spec.w / 2, spec.h / 2],
          [spec.w / 2, spec.h / 2],
          [-spec.w / 2, -spec.h / 2],
          [spec.w / 2, -spec.h / 2]
        ];
        corners.forEach(([cx, cy]) => {
          const cBox = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, beamThickness + 0.1), cornerMat);
          cBox.position.set(cx, cy, 0);
          portalGroup.add(cBox);
        });

        // 3. Directional Runway Chevron Arrows (Inside tunnel border pointing forward)
        const chevronMat = new THREE.MeshBasicMaterial({ color: isActive ? 0xff0033 : 0x00f0ff });
        [-spec.w / 3, 0, spec.w / 3].forEach(cx => {
          const arrowMesh = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 4), chevronMat);
          arrowMesh.position.set(cx, spec.h / 2 + 0.7, 0);
          arrowMesh.rotation.x = Math.PI; // Pointing downward into the opening
          portalGroup.add(arrowMesh);
        });

        // 3D Entrance Signboard above portal frame (Front face)
        const inGateSign = createSignBoardMesh(
          isFinish ? '[ GOAL ▶ 피니시 게이트 ]' : `[ IN ▶ ${idx + 1}번 입구 진입 ]`,
          !isFinish,
          spec.w - 1.0,
          1.2
        );
        inGateSign.position.set(0, spec.h / 2 + 1.25, 0.1);
        portalGroup.add(inGateSign);

        // 3D Signboard (Rear face)
        const inGateSignBack = inGateSign.clone();
        inGateSignBack.position.set(0, spec.h / 2 + 1.25, -0.1);
        inGateSignBack.rotation.y = Math.PI;
        portalGroup.add(inGateSignBack);

        // 4. Semi-transparent Holographic Entrance Curtain
        const curtainGeo = new THREE.PlaneGeometry(spec.w - 0.2, spec.h - 0.2);
        const curtainMat = new THREE.MeshBasicMaterial({
          color: isActive ? 0xef4444 : (isFinish ? 0xfef08a : 0x0284c7),
          transparent: true,
          opacity: isActive ? 0.28 : 0.06,
          side: THREE.DoubleSide
        });
        const curtain = new THREE.Mesh(curtainGeo, curtainMat);
        portalGroup.add(curtain);

        // 5. Vertical Sky Beacon Laser Pillar
        const beaconGeo = new THREE.CylinderGeometry(0.18, 0.18, 45, 12);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: isActive ? 0xff0033 : (isFinish ? 0xfacc15 : 0x00f0ff),
          transparent: true,
          opacity: isActive ? 0.6 : 0.05
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 23;
        portalGroup.add(beacon);

        this.scene.add(portalGroup);
        this.ringMeshes.push(portalGroup);
      });
      return;
    }

    // Default open race track (if not stage 4)
    const ringPositions: { pos: [number, number, number]; rotY: number; radius: number }[] = [
      { pos: [0, 3.5, -20], rotY: 0, radius: 2.8 },
      { pos: [-15, 5.5, -48], rotY: Math.PI / 6, radius: 3.0 },
      { pos: [-38, 7.0, -42], rotY: Math.PI / 2, radius: 3.2 },
      { pos: [-48, 6.0, -5], rotY: (2 * Math.PI) / 3, radius: 3.0 },
      { pos: [-32, 4.5, 30], rotY: Math.PI, radius: 3.0 },
      { pos: [-10, 5.0, 42], rotY: -Math.PI / 3, radius: 3.0 },
      { pos: [0, 3.2, 16], rotY: 0, radius: 2.8 }
    ];

    ringPositions.forEach((item, idx) => {
      const ringId = idx + 1;
      const isActive = idx === 0;
      const isFinish = idx === ringPositions.length - 1;

      this.rings.push({
        id: ringId,
        position: item.pos,
        rotationY: item.rotY,
        radius: item.radius,
        passed: false,
        active: isActive
      });

      const rGroup = new THREE.Group();
      rGroup.position.set(...item.pos);
      rGroup.rotation.y = item.rotY;

      // 1. Main Luminous Torus Ring
      const torusGeo = new THREE.TorusGeometry(item.radius, 0.22, 16, 36);
      const torusMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0xfacc15 : (isActive ? 0xff0033 : 0x00f0ff)
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      rGroup.add(torus);

      // 2. Outer Luminous Halo Glow Ring
      const haloGeo = new THREE.RingGeometry(item.radius + 0.08, item.radius + 0.35, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0xfef08a : (isActive ? 0xff0033 : 0x38bdf8),
        transparent: true,
        opacity: isActive ? 0.65 : 0.35,
        side: THREE.DoubleSide
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      rGroup.add(halo);

      // 3. Semi-transparent Holographic Pass Disk
      const passDiskGeo = new THREE.CircleGeometry(item.radius - 0.08, 24);
      const passDiskMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0xfacc15 : (isActive ? 0xff0033 : 0x00f0ff),
        transparent: true,
        opacity: isActive ? 0.25 : 0.08,
        side: THREE.DoubleSide
      });
      const passDisk = new THREE.Mesh(passDiskGeo, passDiskMat);
      rGroup.add(passDisk);

      // 4. Directional Chevron Arrow (pointing into ring)
      const arrowGeo = new THREE.ConeGeometry(0.35, 0.7, 4);
      const arrowMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0xfacc15 : (isActive ? 0xff0033 : 0x00f0ff)
      });
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      arrowMesh.position.set(0, item.radius + 0.6, 0);
      arrowMesh.rotation.x = Math.PI; // Pointing downward into opening
      rGroup.add(arrowMesh);

      // 5. Vertical Sky Beacon Laser Pillar
      const beaconGeo = new THREE.CylinderGeometry(0.15, 0.15, 45, 12);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0xfacc15 : (isActive ? 0xff0033 : 0x00f0ff),
        transparent: true,
        opacity: isActive ? 0.6 : 0.08
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 22.5;
      rGroup.add(beacon);

      this.scene.add(rGroup);
      this.ringMeshes.push(rGroup);
    });
  }

  private spawnRescueMission() {
    // Rooftop coordinates for patient (63 Golden Square Tower at 45, 78.5, 95) and hospital (70, 24.8, -20)
    const patientPos: [number, number, number] = [45, 78.5, 95];
    const hospitalPos: [number, number, number] = [70, 24.8, -20];

    this.rescueTarget = {
      id: 'patient-rescue-1',
      patientPosition: patientPos,
      hospitalPosition: hospitalPos,
      pickedUp: false,
      delivered: false,
      name: '63빌딩 긴급 구조 환자'
    };

    // Build Realistic 3D Patient Character on Medical Rescue Stretcher
    this.rescuePatientMesh = new THREE.Group();
    this.rescuePatientMesh.position.set(...patientPos);

    // 1. Rescue Stretcher Frame (Orange safety metal gurney)
    const gurneyFrameGeo = new THREE.BoxGeometry(1.0, 0.25, 2.2);
    const gurneyFrameMat = new THREE.MeshLambertMaterial({
      color: 0xf97316 // Emergency Orange
    });
    const gurneyFrame = new THREE.Mesh(gurneyFrameGeo, gurneyFrameMat);
    gurneyFrame.position.y = 0.2;
    this.rescuePatientMesh.add(gurneyFrame);

    // Gurney White Medical Mattress
    const mattressGeo = new THREE.BoxGeometry(0.85, 0.18, 2.0);
    const mattressMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mattress = new THREE.Mesh(mattressGeo, mattressMat);
    mattress.position.y = 0.38;
    this.rescuePatientMesh.add(mattress);

    // 2. 3D Humanoid Patient Body Lying Down
    // Patient Gown Torso & Legs
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.26, 1.4);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 }); // Light blue hospital gown
    const patientBody = new THREE.Mesh(bodyGeo, bodyMat);
    patientBody.position.set(0, 0.52, -0.1);
    this.rescuePatientMesh.add(patientBody);

    // Patient Head with Medical Bandage Wrap
    const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xfde047 }); // Skin tone
    const patientHead = new THREE.Mesh(headGeo, headMat);
    patientHead.position.set(0, 0.58, -0.85);
    this.rescuePatientMesh.add(patientHead);

    // Head Bandage
    const bandageGeo = new THREE.TorusGeometry(0.22, 0.05, 8, 16);
    const bandageMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bandage = new THREE.Mesh(bandageGeo, bandageMat);
    bandage.position.set(0, 0.62, -0.85);
    bandage.rotation.x = Math.PI / 4;
    this.rescuePatientMesh.add(bandage);

    // Animated Waving Right Arm (Requesting emergency airlift rescue)
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 8);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
    this.patientWavingArm = new THREE.Mesh(armGeo, armMat);
    this.patientWavingArm.position.set(0.42, 0.65, -0.4);
    this.patientWavingArm.rotation.z = Math.PI / 3;
    this.rescuePatientMesh.add(this.patientWavingArm);

    // Medical Stretcher Safety Harness Straps
    const strapGeo = new THREE.BoxGeometry(0.88, 0.04, 0.1);
    const strapMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const strap1 = new THREE.Mesh(strapGeo, strapMat);
    strap1.position.set(0, 0.66, 0.1);
    this.rescuePatientMesh.add(strap1);

    const strap2 = new THREE.Mesh(strapGeo, strapMat);
    strap2.position.set(0, 0.66, -0.4);
    this.rescuePatientMesh.add(strap2);

    // High Visibility Pulsing Emergency Landing Ring at Patient Rooftop
    const ringGroundGeo = new THREE.RingGeometry(2.0, 2.3, 32);
    const ringGroundMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const ringGround = new THREE.Mesh(ringGroundGeo, ringGroundMat);
    ringGround.rotation.x = -Math.PI / 2;
    ringGround.position.y = 0.05;
    this.rescuePatientMesh.add(ringGround);

    // Emergency Flashing Beacon & Luminous Signal Beam
    const beaconGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.4, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 1.2, 0);
    this.rescuePatientMesh.add(beacon);

    // High Altitude Vertical Sky Rescue Beam (visible across entire map!)
    const skyBeamGeo = new THREE.CylinderGeometry(0.3, 0.3, 60, 12);
    const skyBeamMat = new THREE.MeshBasicMaterial({
      color: 0xff0033,
      transparent: true,
      opacity: 0.65
    });
    const skyBeam = new THREE.Mesh(skyBeamGeo, skyBeamMat);
    skyBeam.position.y = 30;
    this.rescuePatientMesh.add(skyBeam);

    this.scene.add(this.rescuePatientMesh);
  }

  private spawnAiRacingTrack() {
    this.setupAiDrone();
    this.raceActive = true;
    this.raceFinished = false;
    this.currentLap = 1;
    this.totalRaceLaps = this.currentStage?.targetCount || 2;
    this.raceStartTime = performance.now();

    // Clear any previous mission objects / obstacles so no collision barriers block the circuit
    this.stage2Obstacles.forEach(obs => this.scene.remove(obs.group));
    this.stage2Obstacles = [];

    // Sensible, High-Speed Building Penetration Grand Prix Circuit (Flies through Alpha Tunnel, Skybridge, Gamma Tunnel)
    const isLevel2 = this.currentStage?.id === 'ai-racing-2';

    if (isLevel2) {
      // Level 2 (12 Course Gates - Extreme Master Circuit: Dome Climb, S-Bank, Tunnels & Water Slalom)
      this.raceWaypoints = [
        new THREE.Vector3(0, 4.0, 0),           // 0: Start Gantry (메인 출발선)
        new THREE.Vector3(0, 6.0, -45.0),       // 1: [중앙대로] 국회의사당 진입 아치 게이트
        new THREE.Vector3(0, 18.0, -95.0),      // 2: [국회의사당 돔] 18m 상공 급상승 게이트
        new THREE.Vector3(-45.0, 12.0, -75.0),  // 3: [서측 금융타워] S자 급강하 뱅크 게이트
        new THREE.Vector3(-35.0, 12.0, -52.0),  // 4: [알파 빌딩] 16m 와이드 관통 터널 진입
        new THREE.Vector3(-70.0, 20.0, -32.0),  // 5: [스카이브릿지] 트윈 타워 공중 구름다리 관통 진입
        new THREE.Vector3(-70.0, 20.0, 42.0),   // 6: [트윈타워 북측] 고속 뱅크 게이트
        new THREE.Vector3(-20.0, 16.0, 60.0),   // 7: [북측 스카이라인] 연결 회랑 고속 활주 게이트
        new THREE.Vector3(15.0, 14.0, 60.0),    // 8: [동측 테크타워] 고속 진입 게이트
        new THREE.Vector3(35.0, 14.0, 52.0),    // 9: [감마 빌딩] 16m 와이드 관통 터널 진입
        new THREE.Vector3(35.0, 6.0, -10.0),    // 10: [한강 수변] 롱스트레이트 저고도 슬라롬
        new THREE.Vector3(15.0, 8.0, 15.0),     // 11: [남동측 개방회랑] 복귀 아치 게이트
        new THREE.Vector3(0.0, 5.0, 12.0),      // 12: [피니시 게이트] 피니시 네온 게이트
        new THREE.Vector3(0, 4.0, 0)            // 13: [결승선] 스타트/피니시 골인
      ];

      // Dense, wall-collision-free trajectory for AI Drone (Level 2)
      this.aiFlightWaypoints = [
        new THREE.Vector3(0, 4.0, 0),           // 0: Start Gantry
        new THREE.Vector3(0, 6.0, -45.0),       // 1: Boulevard Arch
        new THREE.Vector3(0, 18.0, -95.0),      // 2: Assembly Dome Climb (18m)
        new THREE.Vector3(-45.0, 12.0, -75.0),  // 3: West Banking S-Curve
        new THREE.Vector3(-35.0, 12.0, -52.0),  // 4: Alpha Tunnel North Entrance
        new THREE.Vector3(-35.0, 12.0, -40.0),  // Inside Alpha Tunnel (Mid)
        new THREE.Vector3(-35.0, 12.0, -28.0),  // Alpha Tunnel South Exit
        new THREE.Vector3(-55.0, 16.0, -30.0),  // Turn towards Twin Tower
        new THREE.Vector3(-70.0, 20.0, -32.0),  // 5: Twin Tower South Entrance
        new THREE.Vector3(-70.0, 20.0, 5.0),    // Inside Skybridge (Mid)
        new THREE.Vector3(-70.0, 20.0, 42.0),   // 6: Twin Tower North Exit
        new THREE.Vector3(-45.0, 18.0, 60.0),   // Turn towards East
        new THREE.Vector3(-20.0, 16.0, 60.0),   // 7: North Skyline Gate
        new THREE.Vector3(15.0, 14.0, 60.0),    // 8: Tech Tower Gate
        new THREE.Vector3(35.0, 14.0, 60.0),    // Gamma North Approach
        new THREE.Vector3(35.0, 14.0, 52.0),    // 9: Gamma Tunnel North Entrance
        new THREE.Vector3(35.0, 14.0, 40.0),    // Inside Gamma Tunnel (Mid)
        new THREE.Vector3(35.0, 14.0, 28.0),    // Gamma Tunnel South Exit
        new THREE.Vector3(35.0, 6.0, -10.0),    // 10: River Waterfront Slalom
        new THREE.Vector3(25.0, 7.0, 5.0),      // Water return curve
        new THREE.Vector3(15.0, 8.0, 15.0),     // 11: South Waterfront Arch Gate
        new THREE.Vector3(5.0, 6.0, 12.0),      // Approach
        new THREE.Vector3(0.0, 5.0, 12.0),      // 12: Finish Gate
        new THREE.Vector3(0.0, 4.0, 0.0)        // 13: Start Line / Lap Milestone
      ];
    } else {
      // Level 1 (9 Course Gates - Flowing Grand Prix Circuit)
      this.raceWaypoints = [
        new THREE.Vector3(0, 4.0, 0),           // 0: Start Gantry (메인 출발선)
        new THREE.Vector3(0, 6.0, -45.0),       // 1: [중앙대로] 국회의사당 진입 아치 게이트
        new THREE.Vector3(0, 8.0, -95.0),       // 2: [북측 광장] 국회의사당 분수대 앞 게이트
        new THREE.Vector3(-35.0, 12.0, -52.0),  // 3: [알파 빌딩] 16m 와이드 관통 터널 진입
        new THREE.Vector3(-70.0, 20.0, -32.0),  // 4: [스카이브릿지] 트윈 타워 공중 구름다리 관통 진입
        new THREE.Vector3(-20.0, 16.0, 60.0),   // 5: [북측 스카이라인] 연결 회랑 고속 활주 게이트
        new THREE.Vector3(15.0, 14.0, 60.0),    // 6: [동측 테크타워] 고속 진입 게이트
        new THREE.Vector3(35.0, 14.0, 52.0),    // 7: [감마 빌딩] 16m 와이드 관통 터널 진입
        new THREE.Vector3(15.0, 8.0, 15.0),     // 8: [남동측 개방회랑] 복귀 아치 게이트
        new THREE.Vector3(0.0, 5.0, 12.0),      // 9: [피니시 게이트] 피니시 네온 게이트
        new THREE.Vector3(0, 4.0, 0)            // 10: [결승선] 스타트/피니시 골인
      ];

      // Dense, wall-collision-free trajectory for AI Drone (Level 1)
      this.aiFlightWaypoints = [
        new THREE.Vector3(0, 4.0, 0),           // 0: 출발선
        new THREE.Vector3(0, 6.0, -45.0),       // 1: 중앙대로 아치
        new THREE.Vector3(0, 8.0, -95.0),       // 2: 국회의사당 분수대
        new THREE.Vector3(-35.0, 10.0, -75.0),  // 완만한 선회
        new THREE.Vector3(-35.0, 12.0, -52.0),  // 3: 알파 빌딩 터널 입구
        new THREE.Vector3(-35.0, 12.0, -40.0),  // 알파 빌딩 터널 내부 (Mid)
        new THREE.Vector3(-35.0, 12.0, -28.0),  // 알파 빌딩 터널 출구
        new THREE.Vector3(-55.0, 16.0, -30.0),  // 트윈타워 진입 코너
        new THREE.Vector3(-70.0, 20.0, -32.0),  // 4: 트윈타워 남측 입구
        new THREE.Vector3(-70.0, 20.0, -10.0),  // 남측 타워 내부
        new THREE.Vector3(-70.0, 20.0, 5.0),    // 스카이브릿지 내부 (Mid)
        new THREE.Vector3(-70.0, 20.0, 25.0),   // 북측 타워 내부
        new THREE.Vector3(-70.0, 20.0, 42.0),   // 북측 타워 출구
        new THREE.Vector3(-45.0, 18.0, 60.0),   // 북측 회랑 진입 코너
        new THREE.Vector3(-20.0, 16.0, 60.0),   // 5: 북측 스카이라인 회랑
        new THREE.Vector3(15.0, 14.0, 60.0),    // 6: 동측 테크타워
        new THREE.Vector3(35.0, 14.0, 60.0),    // 감마 빌딩 진입 코너
        new THREE.Vector3(35.0, 14.0, 52.0),    // 7: 감마 빌딩 터널 입구
        new THREE.Vector3(35.0, 14.0, 40.0),    // 감마 빌딩 터널 내부 (Mid)
        new THREE.Vector3(35.0, 14.0, 28.0),    // 감마 빌딩 터널 출구
        new THREE.Vector3(25.0, 10.0, 20.0),    // 남동측 완만한 선회
        new THREE.Vector3(15.0, 8.0, 15.0),     // 8: 남동측 개방 아치
        new THREE.Vector3(5.0, 6.0, 12.0),      // 피니시 진입로
        new THREE.Vector3(0.0, 5.0, 12.0),      // 9: 피니시 게이트
        new THREE.Vector3(0.0, 4.0, 0.0)        // 10: 결승선
      ];
    }

    // Build Grand Prix Circuit Visual Ribbon & Props
    this.raceTrackGroup = new THREE.Group();

    // 1. Continuous Asphalt Track Ribbon connecting waypoints
    for (let i = 0; i < this.raceWaypoints.length; i++) {
      const p1 = this.raceWaypoints[i];
      const p2 = this.raceWaypoints[(i + 1) % this.raceWaypoints.length];

      const dir = p2.clone().sub(p1);
      const len = dir.length();
      const mid = p1.clone().add(p2).multiplyScalar(0.5);

      // Ground Track Surface (Wide 9.0m track)
      const roadGeo = new THREE.PlaneGeometry(9.0, len);
      const roadMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(mid.x, 0.08, mid.z);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = -Math.atan2(dir.x, dir.z);
      this.raceTrackGroup.add(road);

      // Neon Cyan Dashed Center Line
      const lineGeo = new THREE.PlaneGeometry(0.4, len);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(mid.x, 0.09, mid.z);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = -Math.atan2(dir.x, dir.z);
      this.raceTrackGroup.add(line);
    }

    // 2. Start / Finish Metal Truss Gantry Arch
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, 0);

    const pillarGeo = new THREE.BoxGeometry(0.9, 6.5, 0.9);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const pL = new THREE.Mesh(pillarGeo, pillarMat);
    pL.position.set(-6.0, 3.25, 0);
    gantry.add(pL);

    const pR = new THREE.Mesh(pillarGeo, pillarMat);
    pR.position.set(6.0, 3.25, 0);
    gantry.add(pR);

    const headTruss = new THREE.Mesh(
      new THREE.BoxGeometry(13.0, 1.5, 1.3),
      new THREE.MeshLambertMaterial({ color: 0x0f172a })
    );
    headTruss.position.set(0, 6.2, 0);
    gantry.add(headTruss);

    const signBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(10.5, 1.1),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    signBoard.position.set(0, 6.2, 0.7);
    gantry.add(signBoard);

    const checkBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(10.5, 0.7),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    checkBanner.position.set(0, 5.1, 0.7);
    gantry.add(checkBanner);

    this.raceTrackGroup.add(gantry);

    // 3. Grandstand structure (Placed safely at x: 8, z: -10, clear of 0,0)
    const grandstand = new THREE.Group();
    grandstand.position.set(10.0, 0, -10.0);
    grandstand.rotation.y = -Math.PI / 2;

    const gsBase = new THREE.Mesh(
      new THREE.BoxGeometry(15.0, 2.5, 3.6),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    gsBase.position.y = 1.25;
    grandstand.add(gsBase);

    const crowdRow1 = new THREE.Mesh(
      new THREE.BoxGeometry(13.0, 0.6, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
    );
    crowdRow1.position.set(0, 2.8, -0.6);
    grandstand.add(crowdRow1);

    const crowdRow2 = new THREE.Mesh(
      new THREE.BoxGeometry(13.0, 0.6, 0.8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    crowdRow2.position.set(0, 3.3, 0.4);
    grandstand.add(crowdRow2);

    this.raceTrackGroup.add(grandstand);
    this.scene.add(this.raceTrackGroup);

    // 4. Register Neon Race Ring Gates along Track Waypoints (Spacious 3.8m Radius)
    const activeTorusMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const finishTorusMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const defaultTorusMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const torusGeo = new THREE.TorusGeometry(3.6, 0.24, 14, 28);

    this.raceWaypoints.forEach((wp, idx) => {
      if (idx === 0) return;

      const ringId = idx;
      const isActive = idx === 1;
      const isFinish = idx === this.raceWaypoints.length - 1;

      const prevWp = this.raceWaypoints[idx - 1] || new THREE.Vector3(0, 4.0, 0);
      const approachVec = wp.clone().sub(prevWp).normalize();
      const rotY = Math.atan2(approachVec.x, approachVec.z);

      this.rings.push({
        id: ringId,
        position: [wp.x, wp.y, wp.z],
        rotationY: rotY,
        radius: 3.8,
        passed: false,
        active: isActive
      });

      const rGroup = new THREE.Group();
      rGroup.position.copy(wp);

      if (approachVec.lengthSq() > 0.0001) {
        rGroup.lookAt(wp.clone().add(approachVec));
      }

      const mat = isActive ? activeTorusMat : (isFinish ? finishTorusMat : defaultTorusMat);
      const torus = new THREE.Mesh(torusGeo, mat);
      rGroup.add(torus);

      // Semi-transparent glowing holographic center disk
      const diskGeo = new THREE.CircleGeometry(3.5, 24);
      const diskMat = new THREE.MeshBasicMaterial({
        color: isActive ? 0xef4444 : (isFinish ? 0xfacc15 : 0x00f0ff),
        transparent: true,
        opacity: isActive ? 0.25 : 0.08,
        side: THREE.DoubleSide
      });
      const disk = new THREE.Mesh(diskGeo, diskMat);
      rGroup.add(disk);

      this.scene.add(rGroup);
      this.ringMeshes.push(rGroup);
    });

    // 5. Spawn Golden Bonus Coins along the Optimal Racing Line (24 Coins total)
    const racingCoinPositions: [number, number, number][] = [
      // Straight 0 -> 1 (Central Avenue)
      [0, 4.5, -15],
      [0, 5.2, -28],
      [0, 5.8, -40],
      // Straight 1 -> 2 (Long Speed Straight towards Assembly Plaza)
      [0, 6.8, -60],
      [0, 7.4, -75],
      [0, 8.0, -90],
      // Arc 2 -> 3 (Assembly Plaza to Alpha Tunnel Entrance)
      [-12, 9.5, -85],
      [-24, 11.0, -70],
      [-35, 12.0, -58],
      // Alpha Tunnel Interior 3 -> 4
      [-35, 12.0, -40],
      [-35, 12.0, -28],
      [-50, 16.0, -30],
      // Twin Tower Skybridge Corridor 4 -> 5
      [-70, 20.0, -15],
      [-70, 20.0, 5],
      [-70, 20.0, 25],
      // Skybridge Exit to North Crossway 5 -> 6
      [-45, 18.0, 55],
      [-20, 16.0, 64],
      [10, 15.0, 60],
      // Gamma Tunnel Interior 6 -> 7
      [35, 14.0, 40],
      [35, 14.0, 28],
      [20, 10.0, 20],
      // Final Home Straight 7 -> 8 (South Central back to Gantry)
      [0, 5.0, 12],
      [0, 4.5, 6],
      [0, 4.0, 2]
    ];

    const coinMat = new THREE.MeshLambertMaterial({ color: 0xffd700 });
    const coinRimMat = new THREE.MeshLambertMaterial({ color: 0xffea00 });
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    racingCoinPositions.forEach((pos, idx) => {
      this.coins.push({ id: idx + 1, position: pos, collected: false });

      const coinGroup = new THREE.Group();
      coinGroup.position.set(...pos);

      // Main Gold coin cylinder
      const coinGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.12, 24);
      const coinMesh = new THREE.Mesh(coinGeo, coinMat);
      coinMesh.rotation.x = Math.PI / 2;
      coinGroup.add(coinMesh);

      // Gold Coin Embossed Outer Rim
      const rimGeo = new THREE.TorusGeometry(0.68, 0.05, 10, 24);
      const rimFront = new THREE.Mesh(rimGeo, coinRimMat);
      rimFront.position.z = 0.06;
      coinGroup.add(rimFront);

      const rimBack = new THREE.Mesh(rimGeo, coinRimMat);
      rimBack.position.z = -0.06;
      coinGroup.add(rimBack);

      // Double-sided Star Emblem inside coin
      const starMesh1 = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.42, 5), starMat);
      starMesh1.position.z = 0.07;
      coinGroup.add(starMesh1);

      const starMesh2 = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.42, 5), starMat);
      starMesh2.position.z = -0.07;
      coinGroup.add(starMesh2);

      // Outer luminous halo ring (Warm golden glow)
      const haloGeo = new THREE.RingGeometry(0.75, 0.95, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffdf00,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      coinGroup.add(halo);

      this.scene.add(coinGroup);
      this.coinMeshes.push(coinMesh);
    });
  }

  private spawnTutorialObjects() {
    if (this.currentStage?.id === 'tutorial-2') {
      const ringPositions: { pos: [number, number, number]; rotY: number }[] = [
        { pos: [0, 3.2, -15], rotY: 0 },
        { pos: [-8, 3.5, -35], rotY: Math.PI / 4 },
        { pos: [0, 3.0, -6], rotY: Math.PI }
      ];

      ringPositions.forEach((item, idx) => {
        const ringId = idx + 1;
        const isActive = idx === 0;
        this.rings.push({
          id: ringId,
          position: item.pos,
          rotationY: item.rotY,
          radius: 2.4,
          passed: false,
          active: isActive
        });

        const rGroup = new THREE.Group();
        rGroup.position.set(...item.pos);
        rGroup.rotation.y = item.rotY;

        const torusGeo = new THREE.TorusGeometry(2.4, 0.16, 16, 32);
        const torusMat = new THREE.MeshLambertMaterial({
          color: isActive ? 0x22d3ee : 0x64748b
        });
        const torus = new THREE.Mesh(torusGeo, torusMat);
        rGroup.add(torus);

        const passDiskGeo = new THREE.CircleGeometry(2.3, 24);
        const passDiskMat = new THREE.MeshBasicMaterial({
          color: isActive ? 0x38bdf8 : 0x475569,
          transparent: true,
          opacity: isActive ? 0.25 : 0.08,
          side: THREE.DoubleSide
        });
        const passDisk = new THREE.Mesh(passDiskGeo, passDiskMat);
        rGroup.add(passDisk);

        this.scene.add(rGroup);
        this.ringMeshes.push(rGroup);
      });

      // Spawn 2 High-Visibility Dynamic Obstacles for Stage 2
      this.stage2Obstacles = [];
      this.stage2LandingReady = false;

      // Obstacle 1: Mid-turn Cyber Laser Barricade (positioned safely in open plaza space)
      const obs1Group = new THREE.Group();
      obs1Group.position.set(-4.0, 0, -25.5);

      // Warning Pillar Post
      const pillar1Geo = new THREE.CylinderGeometry(0.35, 0.45, 6.4, 16);
      const pillar1Mat = new THREE.MeshLambertMaterial({
        color: 0xf59e0b
      });
      const pillar1 = new THREE.Mesh(pillar1Geo, pillar1Mat);
      pillar1.position.y = 3.2;
      obs1Group.add(pillar1);

      // Rotating Laser Cross Wings
      const rotor1Group = new THREE.Group();
      rotor1Group.position.set(0, 3.2, 0);

      const wing1Geo = new THREE.BoxGeometry(4.4, 0.22, 0.22);
      const wing1Mat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
      const wing1A = new THREE.Mesh(wing1Geo, wing1Mat);
      rotor1Group.add(wing1A);

      const wing1B = new THREE.Mesh(wing1Geo, wing1Mat);
      wing1B.rotation.y = Math.PI / 2;
      rotor1Group.add(wing1B);

      // Warning Beacon Cap
      const cap1 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
      cap1.position.set(0, 6.5, 0);
      obs1Group.add(cap1);

      obs1Group.add(rotor1Group);
      this.scene.add(obs1Group);
      this.stage2Obstacles.push({
        group: obs1Group,
        position: new THREE.Vector3(-4.0, 3.2, -25.5),
        radius: 2.3,
        rotor: rotor1Group
      });

      // Obstacle 2: Return Approach Cyber Barricade (positioned safely in open lane)
      const obs2Group = new THREE.Group();
      obs2Group.position.set(-4.0, 0, -14.0);

      const pillar2Geo = new THREE.CylinderGeometry(0.35, 0.45, 6.0, 16);
      const pillar2Mat = new THREE.MeshLambertMaterial({
        color: 0xef4444
      });
      const pillar2 = new THREE.Mesh(pillar2Geo, pillar2Mat);
      pillar2.position.y = 3.0;
      obs2Group.add(pillar2);

      const rotor2Group = new THREE.Group();
      rotor2Group.position.set(0, 3.0, 0);

      const wing2Geo = new THREE.BoxGeometry(4.6, 0.25, 0.25);
      const wing2Mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Neon Yellow
      const wing2 = new THREE.Mesh(wing2Geo, wing2Mat);
      rotor2Group.add(wing2);

      const cap2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      cap2.position.set(0, 6.1, 0);
      obs2Group.add(cap2);

      obs2Group.add(rotor2Group);
      this.scene.add(obs2Group);
      this.stage2Obstacles.push({
        group: obs2Group,
        position: new THREE.Vector3(-4.0, 3.0, -14.0),
        radius: 2.4,
        rotor: rotor2Group
      });

      return;
    }

    // Target hover height marker for tutorial-1
    const markerGroup = new THREE.Group();
    markerGroup.position.set(0, 3.0, 0);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = -Math.PI / 2;
    markerGroup.add(ring);

    this.scene.add(markerGroup);
    this.ringMeshes.push(markerGroup);
  }

  // Controls API
  public setControlInput(input: DroneControlInput) {
    const fixedSens = 0.7;
    this.currentInput = {
      throttle: input.throttle * fixedSens,
      yaw: input.yaw * fixedSens,
      pitch: (this.invertPitch ? -input.pitch : input.pitch) * fixedSens,
      roll: input.roll * fixedSens
    };
  }

  public setAssistLevel(level: AssistLevel) {
    this.assistLevel = level;
  }

  public setCameraView(view: CameraView) {
    this.cameraView = view;
  }

  public setSensitivity(_val: number) {
    this.sensitivity = 0.7; // Locked to 0.7
  }

  public setInvertPitch(invert: boolean) {
    this.invertPitch = invert;
  }

  public setSpeedGear(gear: SpeedGear) {
    if (this.currentStage?.type === 'AI_RACING' || this.currentStage?.id === 'ai-racing-1' || this.currentStage?.id === 'stage-6') {
      this.speedGear = 2; // Locked to Sport mode in Stage 6 Grand Prix Circuit
      return;
    }
    this.speedGear = gear;
  }

  public setRaceReady(ready: boolean) {
    this.isRaceReady = ready;
    if (ready) {
      this.raceStartTime = performance.now();
      if (this.aiRacerState) {
        this.aiRacerState.speed = 0;
      }
    } else {
      if (this.aiRacerState) {
        this.aiRacerState.speed = 0;
        this.aiRacerState.position = { x: 2.5, y: 0.4, z: 0 };
        this.aiRacerState.currentWaypointIdx = 1;
        this.aiRacerState.lap = 1;
        this.aiRacerState.finished = false;
      }
      if (this.aiDroneGroup) {
        this.aiDroneGroup.position.set(2.5, 0.4, 0);
        this.aiDroneGroup.rotation.set(0, 0, 0);
      }
    }
  }

  public triggerAutoTakeoffLanding() {
    if (this.hasCrashed) return;

    if (this.isGrounded || this.position.y <= 0.45) {
      // Initiate One-Touch Auto Takeoff to 2.8m comfortable hover altitude
      this.autoFlightState = 'TAKEOFF';
      this.isGrounded = false;
      this.armed = true;
      soundManager.playCountdownBeep(false);
    } else {
      // Initiate One-Touch Auto Landing down to ground
      this.autoFlightState = 'LANDING';
      soundManager.playCountdownBeep(false);
    }
  }

  public getAutoFlightState(): 'TAKEOFF' | 'LANDING' | 'NONE' {
    return this.autoFlightState;
  }

  public resetDronePosition() {
    this.autoFlightState = 'NONE';
    this.position.set(0, 0.35, 0);
    this.velocity.set(0, 0, 0);
    this.rotation.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.hasCrashed = false;
    this.isGrounded = true;
    this.patientAttached = false;
    this.hoverTimeTracker = 0;
    if (this.rescuePatientMesh && this.rescueTarget) {
      this.rescuePatientMesh.position.set(...this.rescueTarget.patientPosition);
    }
  }

  // Main Loop (Silky Smooth 60 FPS for Tablet Hardware)
  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const elapsed = now - this.lastTime;
    this.lastTime = now;

    // Smooth delta time capped at 50ms (20fps floor) to prevent physics leaps
    const dt = Math.min(elapsed / 1000, 0.05);

    this.updatePhysics(dt);
    this.updateMission(dt);
    this.updateAiDrone(dt);
    this.updateEnvironment(dt);
    this.updateParticles(dt);
    this.updateCamera();
    this.sendTelemetry();

    this.renderer.render(this.scene, this.camera);
  };

  private updatePhysics(dt: number) {
    if (!this.isRaceReady) {
      // Hold firmly on start pad until countdown says GO!
      this.position.set(0, 0.35, 0);
      this.velocity.set(0, 0, 0);
      this.rotation.set(0, 0, 0);
      this.droneGroup.position.copy(this.position);
      this.droneGroup.rotation.copy(this.rotation);
      this.propMeshes.forEach((prop, idx) => {
        const dir = idx % 2 === 0 ? 1 : -1;
        prop.rotation.y += dir * 12 * dt;
      });
      return;
    }

    if (this.hasCrashed) {
      // Drone tumbling on ground if crashed
      this.velocity.y -= 9.81 * dt;
      this.position.addScaledVector(this.velocity, dt);
      if (this.position.y < 0.35) {
        this.position.y = 0.35;
        this.velocity.set(0, 0, 0);
      }
      this.droneGroup.position.copy(this.position);
      return;
    }

    // Input values
    const { throttle, yaw, pitch, roll } = this.currentInput;

    // 1. Drone Skin Specific Stats (1 to 5)
    const skinTopSpeed = this.currentSkin?.stats?.topSpeed ?? 3;
    const skinAgility = this.currentSkin?.stats?.agility ?? 3;
    const skinStability = this.currentSkin?.stats?.stability ?? 3;

    // Stat multipliers
    const skinSpeedMult = 0.85 + (skinTopSpeed / 5) * 0.35; // 0.92 (spd 1) to 1.20 (spd 5)
    const skinAgilityMult = 0.85 + (skinAgility / 5) * 0.35;
    const skinStabilityMult = 0.85 + (skinStability / 5) * 0.30;

    // 2. Speed Gear Multipliers (1 = 36 km/h Cruise, 2 = 76 km/h Sport, 3 = 140 km/h Turbo)
    let targetMaxSpeedMps = 10.0; // 36 km/h (1단 순항)
    let horizontalDrag = 1.8;
    let maxTiltAngle = 0.35; // rad

    if (this.speedGear === 2) {
      targetMaxSpeedMps = 21.0; // 75.6 km/h (2단 스포츠)
      horizontalDrag = 1.4;
      maxTiltAngle = 0.58;
    } else if (this.speedGear === 3) {
      targetMaxSpeedMps = 38.0; // 136.8 km/h (3단 터보)
      horizontalDrag = 1.0;
      maxTiltAngle = 0.80;
    }

    // Apply skin stat to top speed & agility
    targetMaxSpeedMps *= skinSpeedMult;
    maxTiltAngle *= skinAgilityMult;
    const maxHorizontalAccel = targetMaxSpeedMps * horizontalDrag;

    // Motor prop spin animation
    const gearPropMult = this.speedGear === 1 ? 1.0 : this.speedGear === 2 ? 1.7 : 2.5;
    const propRpmSpeed = (this.isGrounded && Math.abs(throttle) < 0.05) ? 5 : (30 + Math.abs(throttle) * 40 + Math.hypot(pitch, roll) * 35) * gearPropMult;
    this.propMeshes.forEach((prop, idx) => {
      const dir = idx % 2 === 0 ? 1 : -1;
      prop.rotation.y += propRpmSpeed * dt * dir;
    });

    // Plasma exhaust glow for CyberJet or high speed gears
    if (this.jetFlameMeshes.length > 0) {
      const flameScale = this.speedGear === 3 ? 1.8 : (this.speedGear === 2 ? 1.2 : 0.8);
      this.jetFlameMeshes.forEach(mesh => {
        mesh.scale.setScalar(flameScale * (0.85 + Math.sin(performance.now() * 0.02) * 0.25));
      });
    }

    // Target Pitch & Roll (visual and aerodynamic orientation)
    const targetPitch = -pitch * maxTiltAngle; // Forward stick tilts nose down (-X)
    const targetRoll = -roll * maxTiltAngle;   // Right stick tilts right (+Z)

    // Smooth Euler Rotation Updates
    const levelSpeed = 12.0 * skinStabilityMult;
    this.rotation.x += (targetPitch - this.rotation.x) * levelSpeed * dt;
    this.rotation.z += (targetRoll - this.rotation.z) * levelSpeed * dt;
    
    const yawTurnRate = (this.speedGear === 1 ? 2.4 : this.speedGear === 2 ? 3.4 : 4.6) * skinAgilityMult;
    this.rotation.y += -yaw * yawTurnRate * dt;

    // Acceleration Vector Calculation
    const acceleration = this._tempVecA.set(0, 0, 0);

    // 1) Horizontal Propulsion (Mode 2 Right Stick Forward/Backward & Left/Right)
    const yawAngle = this.rotation.y;
    const forwardX = -Math.sin(yawAngle);
    const forwardZ = -Math.cos(yawAngle);
    const rightX = Math.cos(yawAngle);
    const rightZ = -Math.sin(yawAngle);

    // Forward/Backward acceleration from Pitch input
    acceleration.x += (forwardX * pitch * maxHorizontalAccel);
    acceleration.z += (forwardZ * pitch * maxHorizontalAccel);

    // Left/Right strafe acceleration from Roll input
    acceleration.x += (rightX * roll * maxHorizontalAccel);
    acceleration.z += (rightZ * roll * maxHorizontalAccel);

    // Apply horizontal aerodynamic drag with active braking when sticks are released
    const stickMagnitude = Math.hypot(pitch, roll);
    const effectiveDrag = stickMagnitude < 0.05 
      ? (horizontalDrag * 2.2 * skinStabilityMult) // Crisp automatic active braking
      : horizontalDrag;

    acceleration.x -= this.velocity.x * effectiveDrag;
    acceleration.z -= this.velocity.z * effectiveDrag;

    // 2) Vertical Altitude Control (Auto-Altitude Hold with Zero Tilt Drop & Butter-Smooth Ascent/Descent)
    let targetClimbRate = 0;
    const maxClimbMps = (this.speedGear === 1 ? 4.8 : this.speedGear === 2 ? 9.0 : 15.0) * skinSpeedMult;
    const maxDescendMps = (this.speedGear === 1 ? 3.8 : this.speedGear === 2 ? 7.0 : 11.5);

    // Cancel Auto Takeoff/Landing if user manually inputs significant stick control
    if (Math.abs(throttle) > 0.15 || stickMagnitude > 0.20) {
      this.autoFlightState = 'NONE';
    }

    if (this.autoFlightState === 'TAKEOFF') {
      if (this.position.y < 2.8) {
        targetClimbRate = 2.6;
        // Damp horizontal drift during auto takeoff
        acceleration.x -= this.velocity.x * 3.5;
        acceleration.z -= this.velocity.z * 3.5;
      } else {
        this.autoFlightState = 'NONE';
      }
    } else if (this.autoFlightState === 'LANDING') {
      if (this.position.y > 0.38 && !this.isGrounded) {
        targetClimbRate = -1.2;
        // Strong horizontal brake for safe vertical touchdown
        acceleration.x -= this.velocity.x * 4.5;
        acceleration.z -= this.velocity.z * 4.5;
      } else {
        this.position.y = 0.35;
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.autoFlightState = 'NONE';
      }
    } else {
      if (throttle > 0.04) {
        // Soft cubic easing on throttle stick to prevent abrupt vertical jerk
        const smoothThrottle = Math.pow(throttle, 1.25);
        targetClimbRate = smoothThrottle * maxClimbMps;
      } else if (throttle < -0.04) {
        const smoothThrottle = -Math.pow(-throttle, 1.25);
        targetClimbRate = smoothThrottle * maxDescendMps;
      }
    }

    // High-precision critical damping for silky vertical transitions without overshoot or oscillation
    const verticalDamper = 8.5 * skinStabilityMult;
    acceleration.y = (targetClimbRate - this.velocity.y) * verticalDamper;

    // Integrate Velocity & Position
    this.velocity.addScaledVector(acceleration, dt);
    this.position.addScaledVector(this.velocity, dt);

    // Building Solid Collision Detection & High-Impact Spark Bounce (Broadphase optimized, zero allocation)
    const droneRadius = 0.52; // Full radius covering drone frame & props
    const checkMargin = droneRadius + 0.8;
    const px = this.position.x;
    const py = this.position.y;
    const pz = this.position.z;

    for (let i = 0; i < this.buildingBoxes.length; i++) {
      const bBox = this.buildingBoxes[i];
      // Fast AABB broadphase skip: reject distant buildings with pure float comparisons
      if (px < bBox.min.x - checkMargin || px > bBox.max.x + checkMargin ||
          py < bBox.min.y - checkMargin || py > bBox.max.y + checkMargin ||
          pz < bBox.min.z - checkMargin || pz > bBox.max.z + checkMargin) {
        continue;
      }

      bBox.clampPoint(this.position, this._tempClosestPoint);
      const isInside = bBox.containsPoint(this.position);
      const dist = this.position.distanceTo(this._tempClosestPoint);

      if (isInside || dist < droneRadius) {
        const normal = this._tempNormal;
        if (isInside) {
          // Eject out of closest bounding face
          const dMinX = Math.abs(this.position.x - bBox.min.x);
          const dMaxX = Math.abs(this.position.x - bBox.max.x);
          const dMinY = Math.abs(this.position.y - bBox.min.y);
          const dMaxY = Math.abs(this.position.y - bBox.max.y);
          const dMinZ = Math.abs(this.position.z - bBox.min.z);
          const dMaxZ = Math.abs(this.position.z - bBox.max.z);

          const minD = Math.min(dMinX, dMaxX, dMinY, dMaxY, dMinZ, dMaxZ);
          if (minD === dMinX) normal.set(-1, 0, 0);
          else if (minD === dMaxX) normal.set(1, 0, 0);
          else if (minD === dMinY) normal.set(0, -1, 0);
          else if (minD === dMaxY) normal.set(0, 1, 0);
          else if (minD === dMinZ) normal.set(0, 0, -1);
          else normal.set(0, 0, 1);

          this.position.copy(this._tempClosestPoint).addScaledVector(normal, droneRadius + 0.05);
        } else {
          this._tempDiff.subVectors(this.position, this._tempClosestPoint);
          if (this._tempDiff.lengthSq() > 0.0001) {
            normal.copy(this._tempDiff.normalize());
          } else {
            normal.set(0, 1, 0);
          }
          this.position.copy(this._tempClosestPoint).addScaledVector(normal, droneRadius + 0.02);
        }

        // Relative velocity heading towards wall surface
        const vDotN = this.velocity.dot(normal);
        if (vDotN < 0) {
          const impactSpeed = Math.abs(vDotN);
          const totalSpeed = this.velocity.length();

          // Elastic bounce with realistic restitution
          this.velocity.addScaledVector(normal, -vDotN * (1 + 0.62));
          this.velocity.multiplyScalar(0.84); // Tangential friction damping

          // Angular recoil impulse
          this.rotation.x += (Math.random() - 0.5) * 0.45;
          this.rotation.z += (Math.random() - 0.5) * 0.45;

          // Vivid Sparks Particle Burst at impact contact point
          this.spawnCollisionSparks(this._tempClosestPoint, normal, Math.max(impactSpeed, totalSpeed * 0.6));

          // Camera shake trauma
          this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + Math.min(totalSpeed * 0.07 + 0.15, 0.55));

          // Sound impact effect
          const now = performance.now();
          if (now - this.lastImpactSoundTime > 90) {
            soundManager.playSparkImpact(totalSpeed);
            this.lastImpactSoundTime = now;
          }
        }
      }
    }

    // Ground Collision & Landing Check
    const minGroundY = 0.35;
    if (this.position.y <= minGroundY) {
      this.position.y = minGroundY;
      const verticalImpactSpeed = Math.abs(this.velocity.y);

      if (verticalImpactSpeed > 2.5) {
        // High energy ground bump with sparks and rebound
        this._tempVecA.set(this.position.x, 0.08, this.position.z);
        this._tempVecB.set(0, 1, 0);
        this.spawnCollisionSparks(
          this._tempVecA,
          this._tempVecB,
          verticalImpactSpeed
        );
        this.cameraShakeTrauma = Math.min(0.5, this.cameraShakeTrauma + verticalImpactSpeed * 0.06);

        const now = performance.now();
        if (now - this.lastImpactSoundTime > 90) {
          soundManager.playSparkImpact(verticalImpactSpeed);
          this.lastImpactSoundTime = now;
        }

        this.velocity.y = -this.velocity.y * 0.35;
        this.velocity.x *= 0.80;
        this.velocity.z *= 0.80;
      } else {
        // Soft touch down / landing
        this.velocity.y = 0;
        this.velocity.x *= 0.85; // Ground friction
        this.velocity.z *= 0.85;
        this.isGrounded = true;
      }
    } else {
      this.isGrounded = false;
    }

    // Update 3D drone mesh transforms
    this.droneGroup.position.copy(this.position);
    this.droneGroup.rotation.copy(this.rotation);

    // Dust ring effect under drone when hovering near ground
    if (this.dustRing) {
      if (this.position.y < 3.5 && !this.isGrounded) {
        const intensity = (1 - (this.position.y / 3.5)) * Math.min(0.8 + Math.abs(throttle) * 0.4, 1);
        (this.dustRing.material as THREE.MeshBasicMaterial).opacity = intensity * 0.4;
        this.dustRing.position.set(this.position.x, 0.05, this.position.z);
        this.dustRing.scale.setScalar(1 + (this.position.y * 0.4));
      } else {
        (this.dustRing.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  }

  private triggerCrash(impactSpeed: number) {
    if (this.hasCrashed) return;
    this.hasCrashed = true;
    this.spawnSparks(this.position.clone());
    this.callbacks.onCrash(impactSpeed);
  }

  private updateMission(dt: number) {
    if (!this.currentStage || this.hasCrashed) {
      if (this.missionGuidanceGroup) this.missionGuidanceGroup.visible = false;
      if (this.guidanceBeaconGroup) this.guidanceBeaconGroup.visible = false;
      return;
    }

    let activeTargetPos: THREE.Vector3 | null = null;
    let guidanceColor = 0xff0033; // Default red guidance

    // 1. Tutorial 1 (Hover & Landing)
    if (this.currentStage.id === 'tutorial-1') {
      const targetHoverY = 3.0;
      if (this.hoverTimeTracker < 3.0) {
        activeTargetPos = this._scratchTargetPos.set(0, targetHoverY, 0);
      } else {
        activeTargetPos = this._scratchTargetPos.set(0, 0.35, 0); // Landing target
        guidanceColor = 0x10b981;
      }
    }

    // 2. Coin Collection (Coin Hunt & AI Racing Bonus Coins)
    if (this.currentStage.type === 'COIN_HUNT' || this.currentStage.type === 'AI_RACING') {
      let nearestDist = Infinity;
      this.coins.forEach((coin, idx) => {
        if (!coin.collected) {
          const coinPos = this._scratchCoinPos.set(coin.position[0], coin.position[1], coin.position[2]);
          if (this.coinMeshes[idx]) {
            this.coinMeshes[idx].rotation.z += 2.8 * dt;
          }
          const d = this.position.distanceTo(coinPos);
          if (this.currentStage?.type === 'COIN_HUNT' && d < nearestDist) {
            nearestDist = d;
            activeTargetPos = this._scratchTargetPos.copy(coinPos);
          }
          if (d < 2.4) {
            coin.collected = true;
            if (this.coinMeshes[idx]?.parent) {
              this.scene.remove(this.coinMeshes[idx].parent!);
            } else if (this.coinMeshes[idx]) {
              this.scene.remove(this.coinMeshes[idx]);
            }
            this.spawnSparks(coinPos, 0xfacc15);

            // Forward speed surge in AI Racing
            if (this.currentStage?.type === 'AI_RACING') {
              const forwardX = -Math.sin(this.rotation.y);
              const forwardZ = -Math.cos(this.rotation.y);
              this.velocity.x += forwardX * 1.6;
              this.velocity.z += forwardZ * 1.6;
            }

            const totalCollected = this.coins.filter(c => c.collected).length;
            this.callbacks.onCoinCollected(coin.id, totalCollected);
          }
        }
      });
    }

    // 3. Ring Race, Tunnel Penetration (Stage 4), AI Racing (Stage 6), and Tutorial Gates
    const isGateStage = this.currentStage.type === 'RING_RACE' ||
      this.currentStage.type === 'AI_RACING' ||
      this.currentStage.id === 'ring-race-1' ||
      this.currentStage.id === 'ring-race-2' ||
      this.currentStage.id === 'stage-4' ||
      this.currentStage.id === 'stage-6' ||
      this.currentStage.id === 'ai-racing-1' ||
      this.currentStage.id === 'ai-racing-2' ||
      this.currentStage.id === 'tutorial-2';

    if (isGateStage && this.rings.length > 0) {
      const activeIdx = this.rings.findIndex(r => r.active && !r.passed);

      if (activeIdx !== -1 && this.rings[activeIdx]) {
        activeTargetPos = this._scratchTargetPos.set(
          this.rings[activeIdx].position[0],
          this.rings[activeIdx].position[1],
          this.rings[activeIdx].position[2]
        );
        guidanceColor = activeIdx === this.rings.length - 1 ? 0xfacc15 : 0xff0033;
      }

      // High-Intensity Red Blinking Strobe on active target gate across all missions including AI Race
      const isBlinkRed = Math.sin(performance.now() * 0.015) > -0.2;
      const blinkColorHex = isBlinkRed ? 0xff0033 : 0x7f0015;

      this.ringMeshes.forEach((meshGroup, idx) => {
        const ringData = this.rings[idx];
        if (!ringData) return;

        if (idx === activeIdx) {
          // Active Gate / Tunnel: Pulsing Red Strobe Alert!
          meshGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = (child as THREE.Mesh).material;
              if (m && 'color' in m) {
                (m as THREE.MeshBasicMaterial).color.setHex(blinkColorHex);
                if ((m as THREE.MeshBasicMaterial).transparent) {
                  (m as THREE.MeshBasicMaterial).opacity = isBlinkRed ? 0.85 : 0.3;
                }
              }
            }
          });
        } else if (ringData.passed) {
          // Passed Gate: Solid Clear Green
          meshGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = (child as THREE.Mesh).material;
              if (m && 'color' in m) {
                (m as THREE.MeshBasicMaterial).color.setHex(0x10b981);
              }
            }
          });
        } else {
          // Future Gate: Dim Subtle Slate
          meshGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = (child as THREE.Mesh).material;
              if (m && 'color' in m) {
                (m as THREE.MeshBasicMaterial).color.setHex(0x334155);
              }
            }
          });
        }
      });

      // Check Passage through active tunnel / ring
      this.rings.forEach(ring => {
        if (ring.active && !ring.passed) {
          const ringPos = this._scratchRingPos.set(ring.position[0], ring.position[1], ring.position[2]);
          if (this.position.distanceTo(ringPos) < ring.radius + 1.0) {
            ring.passed = true;
            ring.active = false;
            this.spawnSparks(ringPos, 0x10b981);

            const nextIdx = this.rings.findIndex(r => !r.passed);
            if (nextIdx !== -1) {
              this.rings[nextIdx].active = true;
              this.callbacks.onRingPassed(ring.id, this.rings[nextIdx].id);
            } else {
              // All rings in the circuit passed!
              if (this.currentStage?.id === 'tutorial-2') {
                // Stage 2: Enter Final Landing Phase onto Yellow Base Pad!
                this.stage2LandingReady = true;
                this.callbacks.onRingPassed(ring.id, 4); // Notify UI that landing step is now active
              } else if (this.currentStage?.type === 'AI_RACING' || this.currentStage?.id === 'ai-racing-1' || this.currentStage?.id === 'stage-6') {
                const finishedLap = this.currentLap;
                if (this.currentLap < this.totalRaceLaps) {
                  this.currentLap++;
                  this.rings.forEach((r, idx) => {
                    r.passed = false;
                    r.active = (idx === 0);
                  });

                  // Respawn Golden Bonus Coins for Lap 2
                  this.coins.forEach((c, idx) => {
                    c.collected = false;
                    const mesh = this.coinMeshes[idx];
                    if (mesh) {
                      const parent = mesh.parent || mesh;
                      if (!this.scene.children.includes(parent)) {
                        this.scene.add(parent);
                      }
                    }
                  });

                  // Mathematically determine whether player reached lap milestone ahead of AI
                  const aiCurrentLap = this.aiRacerState?.lap || 1;
                  const playerAhead = !this.aiRacerState?.finished && (
                    finishedLap > aiCurrentLap ||
                    (finishedLap === aiCurrentLap && (this.aiRacerState?.currentWaypointIdx || 0) < 2)
                  );

                  const nowTime = (performance.now() - this.raceStartTime) / 1000;
                  this.callbacks.onLapFinished(finishedLap, this.totalRaceLaps, nowTime, playerAhead);
                  this.callbacks.onRingPassed(ring.id, this.rings[0].id);
                } else {
                  this.raceFinished = true;
                  const nowTime = (performance.now() - this.raceStartTime) / 1000;
                  const playerWon = !this.aiRacerState?.finished || (nowTime < (this.aiRacerState?.finishTimeSec || Infinity));
                  this.callbacks.onRaceFinished(playerWon, nowTime, this.aiRacerState?.finishTimeSec || (nowTime + 4.2));
                }
              } else {
                this.callbacks.onRingPassed(ring.id, 0);
              }
            }
          }
        }
      });
    }

    // 3-B. Stage 2 Dynamic Obstacles Animation & Collision Detection
    if (this.stage2Obstacles.length > 0) {
      this.stage2Obstacles.forEach(obs => {
        obs.rotor.rotation.y += dt * 1.8;

        const dist = this.position.distanceTo(obs.position);
        if (dist < obs.radius) {
          this.spawnSparks(this.position, 0xf97316);
          const pushDir = this._scratchPushDir.copy(this.position).sub(obs.position).normalize();
          pushDir.y = Math.max(pushDir.y, 0.4);
          this.velocity.addScaledVector(pushDir, 5.2);
          this.cameraShakeTrauma = 0.5;
          this.callbacks.onCrash(18);
        }
      });
    }

    // 3-C. Stage 2 Final Landing Check
    if (this.currentStage?.id === 'tutorial-2' && this.stage2LandingReady) {
      activeTargetPos = this._scratchTargetPos.set(0, 0.35, 0);
      guidanceColor = 0x10b981;

      const horizDist = Math.hypot(this.position.x, this.position.z);
      const isLowAltitude = this.position.y <= 0.55;
      const isSlowSpeed = this.velocity.length() < 2.5;

      if (horizDist < 2.0 && isLowAltitude && (this.isGrounded || isSlowSpeed)) {
        this.stage2LandingReady = false;
        this.spawnSparks(activeTargetPos, 0x10b981);
        this.callbacks.onRingPassed(3, 0); // Complete Stage 2!
      }
    }

    // 4. Rescue Mission
    if (this.currentStage.type === 'RESCUE' && this.rescueTarget) {
      const patientPos = this._scratchPatientPos.set(
        this.rescueTarget.patientPosition[0],
        this.rescueTarget.patientPosition[1],
        this.rescueTarget.patientPosition[2]
      );
      const hospitalPos = this._scratchHospitalPos.set(
        this.rescueTarget.hospitalPosition[0],
        this.rescueTarget.hospitalPosition[1],
        this.rescueTarget.hospitalPosition[2]
      );

      // Active Target Guidance: Point to Patient (Red) before pickup; Point to Hospital Helipad (Green) when carrying!
      if (!this.rescueTarget.pickedUp) {
        activeTargetPos = this._scratchTargetPos.copy(patientPos);
        guidanceColor = 0xff0033;
      } else if (!this.rescueTarget.delivered) {
        activeTargetPos = this._scratchTargetPos.copy(hospitalPos);
        guidanceColor = 0x10b981;
      }

      // Patient waving arm animation requesting rescue
      if (this.patientWavingArm && !this.rescueTarget.pickedUp) {
        this.patientWavingArm.rotation.z = Math.PI / 3 + Math.sin(performance.now() * 0.008) * 0.4;
      }

      // Pickup phase
      if (!this.patientAttached && !this.rescueDelivered) {
        const distToPatient = this.position.distanceTo(patientPos);
        if (distToPatient < 3.5 && this.position.y > patientPos.y - 0.5) {
          if (this.tractorBeamMesh) {
            (this.tractorBeamMesh.material as THREE.MeshBasicMaterial).opacity = 0.45;
          }
          if (distToPatient < 2.2) {
            this.patientAttached = true;
            this.rescueTarget.pickedUp = true;
            if (this.tractorBeamMesh) {
              (this.tractorBeamMesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
            }
            this.callbacks.onPatientPickedUp();
          }
        } else if (this.tractorBeamMesh) {
          (this.tractorBeamMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
        }
      }

      // Carry phase
      if (this.patientAttached && this.rescuePatientMesh && !this.rescueDelivered) {
        this.rescuePatientMesh.position.set(this.position.x, this.position.y - 1.2, this.position.z);

        const distToHospital = this.position.distanceTo(hospitalPos);
        if (distToHospital < 3.2 && (this.isGrounded || this.position.y < hospitalPos.y + 1.8)) {
          this.rescueDelivered = true;
          this.patientAttached = false;
          this.rescueTarget.delivered = true;
          this.rescuePatientMesh.position.copy(hospitalPos);
          if (this.tractorBeamMesh) {
            (this.tractorBeamMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
          }
          this.spawnSparks(hospitalPos, 0xef4444);
          this.isTransferringPatientToOR = true;
          this.transferORProgress = 0;
          this.callbacks.onPatientDelivered();
        }
      }

      // Live OR Stretcher Transfer Sequence
      if (this.isTransferringPatientToOR && this.rescuePatientMesh) {
        this.transferORProgress += dt * 0.4;
        const t = Math.min(this.transferORProgress, 1.0);
        const targetORX = 66.0;
        const targetORZ = -29.0;
        this.rescuePatientMesh.position.x = THREE.MathUtils.lerp(70, targetORX, t);
        this.rescuePatientMesh.position.z = THREE.MathUtils.lerp(-20, targetORZ, t);

        this.hospitalDoctors.forEach((doc, idx) => {
          doc.position.x = this.rescuePatientMesh!.position.x + (idx === 0 ? -0.7 : 0.7);
          doc.position.z = this.rescuePatientMesh!.position.z;
          doc.rotation.y = -Math.PI / 2;
          doc.position.y = 24.8 + Math.abs(Math.sin(performance.now() * 0.015)) * 0.15;
        });

        if (t > 0.4 && this.hospitalORDoorLeft && this.hospitalORDoorRight) {
          const doorOpenAmount = Math.min((t - 0.4) * 2.5, 1.0) * 0.8;
          this.hospitalORDoorLeft.position.x = -0.8 - doorOpenAmount;
          this.hospitalORDoorRight.position.x = 0.8 + doorOpenAmount;
        }
      }
    }

    // Universal Dynamic Augmented Reality Guidance Path & 3D Holo-Beacon
    if (activeTargetPos) {
      this.missionGuidanceGroup.visible = true;
      this.guidanceBeaconGroup.visible = true;

      const now = performance.now();
      const forwardDir = this._tempVecA.set(0, 0, 1).applyEuler(this.rotation);
      const startPoint = this._tempVecB.copy(this.position).addScaledVector(forwardDir, 0.6);
      startPoint.y += 0.15;

      const targetChanged = activeTargetPos.distanceToSquared(this.lastQuestGoalPos) > 0.05;
      const droneMovedFar = startPoint.distanceToSquared(this.lastQuestStartPos) > 2.25; // > 1.5m
      const timeElapsed = now - this.lastQuestCalcTime > 120; // Throttled to ~8 Hz for smooth 60fps

      if (targetChanged || (timeElapsed && droneMovedFar) || !this.cachedQuestCurve) {
        this.lastQuestCalcTime = now;
        this.lastQuestStartPos.copy(startPoint);
        this.lastQuestGoalPos.copy(activeTargetPos);

        const questWaypoints = this.cityNavGraph.findQuestPath(startPoint, activeTargetPos, this.buildingBoxes);
        if (questWaypoints.length >= 2) {
          try {
            this.cachedQuestCurve = new THREE.CatmullRomCurve3(questWaypoints, false, 'centripetal', 0.25);
          } catch {
            this.cachedQuestCurve = null;
          }
        } else {
          this.cachedQuestCurve = null;
        }

        // Direct Buffer Update for Guidance Line without GC churn
        const numPoints = 64;
        const lineGeo = this.missionGuidanceLine!.geometry as THREE.BufferGeometry;
        const posAttr = lineGeo.attributes.position as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;

        for (let i = 0; i < numPoints; i++) {
          const t = i / (numPoints - 1);
          if (this.cachedQuestCurve) {
            this.cachedQuestCurve.getPoint(t, this._tempOrbPos);
          } else {
            const pt = getPointAlongPolyline(questWaypoints, t);
            this._tempOrbPos.copy(pt);
          }
          posArray[i * 3] = this._tempOrbPos.x;
          posArray[i * 3 + 1] = this._tempOrbPos.y;
          posArray[i * 3 + 2] = this._tempOrbPos.z;
        }
        posAttr.needsUpdate = true;
      }

      const lineMat = this.missionGuidanceLine!.material as THREE.LineBasicMaterial;
      lineMat.color.setHex(guidanceColor);
      lineMat.opacity = 0.95 + Math.sin(now * 0.008) * 0.05;

      // 2. Animate flowing holographic pulse orbs using cached curve (Zero allocations)
      const pulseTime = (now * 0.0006) % 1.0;
      this.guidancePulseOrbs.forEach((orb, idx) => {
        const t = (pulseTime + idx / 8.0) % 1.0;
        if (this.cachedQuestCurve) {
          this.cachedQuestCurve.getPoint(t, this._tempOrbPos);
          orb.position.copy(this._tempOrbPos);
        }
        (orb.material as THREE.MeshBasicMaterial).color.setHex(guidanceColor);
        const orbScale = Math.sin(t * Math.PI) * 1.3 + 0.3;
        orb.scale.setScalar(orbScale);
      });

      // 3. Update Destination Holo-Beacon
      this.guidanceBeaconGroup.position.copy(activeTargetPos);

      // Pulsing rings
      this.guidanceBeaconRings.forEach((ring, idx) => {
        const ringMat = ring.material as THREE.MeshBasicMaterial;
        ringMat.color.setHex(guidanceColor);
        const ringPulse = 1.0 + 0.25 * Math.sin(performance.now() * 0.006 + idx * 0.8);
        ring.scale.set(ringPulse, ringPulse, 1.0);
      });

      // Bobbing Cone
      if (this.guidanceBeaconCone) {
        (this.guidanceBeaconCone.material as THREE.MeshBasicMaterial).color.setHex(guidanceColor);
        this.guidanceBeaconCone.position.y = 1.8 + Math.sin(performance.now() * 0.005) * 0.35;
      }

      // Sky laser beam
      if (this.guidanceBeaconBeam) {
        (this.guidanceBeaconBeam.material as THREE.MeshBasicMaterial).color.setHex(guidanceColor);
      }

      if (this.guidanceBeaconLight) {
        this.guidanceBeaconLight.color.setHex(guidanceColor);
      }
    } else {
      this.missionGuidanceGroup.visible = false;
      this.guidanceBeaconGroup.visible = false;
    }
  }

  private updateAiDrone(dt: number) {
    if (!this.aiDroneGroup || !this.aiRacerState || !this.raceActive || this.raceFinished) return;

    // AI Propeller spin
    const propSpeed = this.isRaceReady ? 55 : 12;
    this.aiProps.forEach(prop => {
      prop.rotation.y += propSpeed * dt;
    });

    // Hold firmly on start grid while countdown (3, 2, 1) is active
    if (!this.isRaceReady) {
      this.aiDroneGroup.position.set(2.5, 0.4, 0);
      this.aiDroneGroup.rotation.set(0, 0, 0);
      this.aiRacerState.position = { x: 2.5, y: 0.4, z: 0 };
      this.aiRacerState.speed = 0;
      return;
    }

    // AI realistic reaction time & smooth launch spool-up after countdown ends
    const timeSinceStart = (performance.now() - this.raceStartTime) / 1000;
    if (timeSinceStart < 0.4) {
      this.aiDroneGroup.position.set(2.5, 0.4, 0);
      this.aiDroneGroup.rotation.set(0, 0, 0);
      this.aiRacerState.position = { x: 2.5, y: 0.4, z: 0 };
      this.aiRacerState.speed = 0;
      return;
    }

    const waypoints = this.aiFlightWaypoints.length > 0 ? this.aiFlightWaypoints : this.raceWaypoints;
    const targetWp = waypoints[this.aiRacerState.currentWaypointIdx];
    if (!targetWp) return;

    const currentPos = this._scratchAiPos.set(
      this.aiRacerState.position.x,
      this.aiRacerState.position.y,
      this.aiRacerState.position.z
    );

    const toWp = this._scratchToWp.copy(targetWp).sub(currentPos);
    const dist = toWp.length();

    // Advance to next waypoint cleanly (tighter threshold in tunnel corridors for laser accuracy)
    const isTunnelSegment = targetWp.y > 10.0;
    const waypointThreshold = isTunnelSegment ? 3.0 : 4.8;

    if (dist < waypointThreshold) {
      this.aiRacerState.currentWaypointIdx++;
      if (this.aiRacerState.currentWaypointIdx >= waypoints.length) {
        this.aiRacerState.currentWaypointIdx = 0;
        this.aiRacerState.lap++;
        if (this.aiRacerState.lap > this.totalRaceLaps && !this.aiRacerState.finished) {
          this.aiRacerState.finished = true;
          this.aiRacerState.finishTimeSec = (performance.now() - this.raceStartTime) / 1000;
          soundManager.speakGuide('라이벌이 골인했어! 포기하지 말고 끝까지 멋지게 완주하자!');
        }
      }
    }

    const dir = this._scratchDir.copy(toWp).normalize();

    // Balanced & Competitive AI Racer Dynamics based on Level 1 / Level 2 difficulty
    const isLevel1 = this.currentStage?.aiDifficulty === 'LEVEL_1';
    const distToPlayer = currentPos.distanceTo(this.position);
    
    // Level 1: Beginner-friendly rookie AI (~28 - 35 km/h, gentle cornering, generous catchup)
    // Level 2: Veteran pro rival AI (~39 - 47.5 km/h, sharp cornering and aggressive chase)
    const baseAiSpeed = isLevel1 ? 8.2 : 11.2;
    const sprintAiSpeed = isLevel1 ? 9.8 : 13.6;
    const rubberBandCatchupSpeed = isLevel1 ? 6.5 : 8.8;

    // Smooth aerodynamic cornering lookahead
    let cornerFactor = 1.0;
    const nextWpIdx = (this.aiRacerState.currentWaypointIdx + 1) % waypoints.length;
    const nextWp = waypoints[nextWpIdx];
    if (nextWp) {
      const nextDir = this._scratchNextDir.copy(nextWp).sub(targetWp).normalize();
      const dotProd = THREE.MathUtils.clamp(dir.dot(nextDir), -1, 1);
      // Smooth cosine speed curve: maintains momentum through bends (Level 1 slows down slightly more for realism)
      const minCornerLerp = isLevel1 ? 0.60 : 0.72;
      cornerFactor = THREE.MathUtils.lerp(minCornerLerp, 1.0, (dotProd + 1) * 0.5);
    }

    let targetSpeed = baseAiSpeed * cornerFactor;

    // Dynamic racing rivalry:
    const playerIsAhead = this.currentLap > this.aiRacerState.lap || 
      (this.currentLap === this.aiRacerState.lap && this.position.distanceTo(targetWp) < currentPos.distanceTo(targetWp));

    if (playerIsAhead) {
      // Player is ahead -> AI drone gives exciting chase with slight boost
      targetSpeed = sprintAiSpeed * cornerFactor;
    } else if (distToPlayer > (isLevel1 ? 16 : 22) && this.aiRacerState.lap >= this.currentLap) {
      // AI is ahead -> Gentle rubber-banding so player can catch back up
      targetSpeed = rubberBandCatchupSpeed * cornerFactor;
    }

    // Initial motor throttle spool-up curve over first seconds of flight
    const launchDuration = isLevel1 ? 1.6 : 1.2;
    const launchRamp = Math.min(1.0, Math.max(0, (timeSinceStart - 0.4) / launchDuration));
    targetSpeed *= THREE.MathUtils.lerp(0.30, 1.0, launchRamp);

    this.aiRacerState.speed = THREE.MathUtils.lerp(this.aiRacerState.speed, targetSpeed, 3.2 * dt);
    currentPos.addScaledVector(dir, this.aiRacerState.speed * dt);

    this.aiRacerState.position = { x: currentPos.x, y: currentPos.y, z: currentPos.z };
    this.aiDroneGroup.position.copy(currentPos);

    // Dynamic banking, forward pitch & yaw orientation (Ultra-lightweight)
    this.aiDroneGroup.lookAt(targetWp);
    const lateralTurn = targetWp.x - currentPos.x;
    this.aiDroneGroup.rotation.z = -Math.max(-0.55, Math.min(0.55, lateralTurn * 0.07));
    this.aiDroneGroup.rotation.x += 0.22; // Forward racing tilt
  }

  private updateCamera() {
    if (this.cameraView === 'CHASE') {
      // Dynamic chase camera following behind drone with gimbal-stabilized spring lerp (Zero heap allocation)
      this._tempCamOffset.set(0, 2.2, 5.5);
      this._tempRotMat4.makeRotationY(this.rotation.y);
      this._tempCamOffset.applyMatrix4(this._tempRotMat4);

      const targetCamPos = this._tempCamTarget.copy(this.position).add(this._tempCamOffset);
      
      // Decoupled vertical vs horizontal lerp for ultra-smooth altitude climbs
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamPos.x, 0.14);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamPos.y, 0.10);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamPos.z, 0.14);

      // Smooth look-at target with virtual gimbal damping
      this._tempVecA.copy(this.position);
      this._tempVecA.y += 0.6;
      this.currentCameraLookTarget.lerp(this._tempVecA, 0.16);
      this.camera.lookAt(this.currentCameraLookTarget);
    } else if (this.cameraView === 'FPV') {
      // First Person View from Drone Nose Camera (Facing Forward in flight direction -Z)
      this._tempCamOffset.set(0, 0.15, -0.45);
      this._tempRotMat4.makeRotationFromEuler(this.rotation);
      this._tempCamOffset.applyMatrix4(this._tempRotMat4);

      this.camera.position.copy(this.position).add(this._tempCamOffset);

      this._tempVecA.set(0, -0.05, -10);
      this._tempVecA.applyMatrix4(this._tempRotMat4);
      this._tempVecB.copy(this.position).add(this._tempVecA);
      this.camera.lookAt(this._tempVecB);
    } else if (this.cameraView === 'TOP') {
      // Birds-eye overhead tactical view
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.position.x, 0.18);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.position.y + 28, 0.14);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.position.z, 0.18);
      this.camera.lookAt(this.position.x, this.position.y, this.position.z);
    } else if (this.cameraView === 'FOLLOW_FAR') {
      // Cinematic wide angle with stabilized follow
      this._tempCamOffset.set(0, 5.0, 12.0);
      this._tempRotMat4.makeRotationY(this.rotation.y);
      this._tempCamOffset.applyMatrix4(this._tempRotMat4);
      const targetFarPos = this._tempCamTarget.copy(this.position).add(this._tempCamOffset);
      
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetFarPos.x, 0.10);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetFarPos.y, 0.08);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetFarPos.z, 0.10);
      
      this.currentCameraLookTarget.lerp(this.position, 0.12);
      this.camera.lookAt(this.currentCameraLookTarget);
    }

    // Dynamic Camera Impact Shake Trauma (strictly for high-speed wall crashes)
    if (this.cameraShakeTrauma > 0.001) {
      const shakeAmt = this.cameraShakeTrauma * 0.28;
      this.camera.position.x += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.z += (Math.random() - 0.5) * shakeAmt;
      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - 0.045);
    }
  }

  private spawnCollisionSparks(pos: THREE.Vector3, normal: THREE.Vector3, impactSpeed: number = 5) {
    if (this.particlePool.length === 0) return;
    const pSystem = this.particlePool.find(p => !p.active) || this.particlePool[0];
    const count = Math.min(32, Math.max(16, Math.floor(impactSpeed * 3)));
    const baseBurstSpeed = Math.min(16, Math.max(6, impactSpeed * 1.6));

    const positions = pSystem.positions;
    const velocities = pSystem.velocities;

    for (let i = 0; i < 32; i++) {
      if (i < count) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        const spreadX = (Math.random() - 0.5) * 1.6;
        const spreadY = (Math.random() - 0.5) * 1.6;
        const spreadZ = (Math.random() - 0.5) * 1.6;

        const nx = normal.x * 1.2 + spreadX;
        const ny = normal.y * 1.2 + spreadY;
        const nz = normal.z * 1.2 + spreadZ;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

        const pSpeed = baseBurstSpeed * (0.5 + Math.random() * 0.85);
        velocities[i * 3] = (nx / len) * pSpeed;
        velocities[i * 3 + 1] = (ny / len) * pSpeed + Math.random() * 2.5;
        velocities[i * 3 + 2] = (nz / len) * pSpeed;
      } else {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -1000;
        positions[i * 3 + 2] = 0;
        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = 0;
      }
    }

    pSystem.geometry.attributes.position.needsUpdate = true;
    pSystem.material.color.setHex(0xffaa00);
    pSystem.material.opacity = 1.0;
    pSystem.life = 0;
    pSystem.maxLife = 0.50;
    pSystem.active = true;
    pSystem.mesh.visible = true;
  }

  private spawnSparks(pos: THREE.Vector3, colorHex: number = 0xffffff) {
    if (this.particlePool.length === 0) return;
    const pSystem = this.particlePool.find(p => !p.active) || this.particlePool[0];
    const count = 16;
    const positions = pSystem.positions;
    const velocities = pSystem.velocities;

    for (let i = 0; i < 32; i++) {
      if (i < count) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        velocities[i * 3] = (Math.random() - 0.5) * 5;
        velocities[i * 3 + 1] = Math.random() * 5 + 1;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 5;
      } else {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -1000;
        positions[i * 3 + 2] = 0;
        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = 0;
      }
    }

    pSystem.geometry.attributes.position.needsUpdate = true;
    pSystem.material.color.setHex(colorHex);
    pSystem.material.opacity = 0.9;
    pSystem.life = 0;
    pSystem.maxLife = 0.45;
    pSystem.active = true;
    pSystem.mesh.visible = true;
  }

  private updateParticles(dt: number) {
    for (let i = 0; i < this.particlePool.length; i++) {
      const p = this.particlePool[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      const progress = p.life / p.maxLife;
      p.material.opacity = (1 - progress) * 0.95;

      const posArr = p.positions;
      for (let j = 0; j < 32; j++) {
        posArr[j * 3] += p.velocities[j * 3] * dt;
        posArr[j * 3 + 1] += (p.velocities[j * 3 + 1] - 9.81 * dt) * dt;
        posArr[j * 3 + 2] += p.velocities[j * 3 + 2] * dt;
      }
      p.geometry.attributes.position.needsUpdate = true;
    }
  }

  private sendTelemetry() {
    const speedKmh = this.velocity.length() * 3.6;
    const altitudeM = Math.max(0, this.position.y - 0.35);
    const pitchDeg = Math.round(THREE.MathUtils.radToDeg(this.rotation.x));
    const rollDeg = Math.round(THREE.MathUtils.radToDeg(this.rotation.z));
    const yawDeg = Math.round(THREE.MathUtils.radToDeg(this.rotation.y) % 360);

    // Compute exact real-time race rank
    let raceRank: 1 | 2 = 1;
    let aiDistanceM: number | undefined = undefined;
    let aiFinished = false;

    if (this.currentStage?.type === 'AI_RACING' || this.currentStage?.id === 'ai-racing-1' || this.currentStage?.id === 'ai-racing-2' || this.currentStage?.id === 'stage-6') {
      if (this.aiRacerState && this.aiDroneGroup) {
        aiFinished = this.aiRacerState.finished;
        const aiPos = this.aiDroneGroup.position;
        aiDistanceM = Math.round(this.position.distanceTo(aiPos) * 10) / 10;

        if (this.aiRacerState.finished) {
          raceRank = 2; // AI finished first
        } else {
          const playerActiveRingIdx = this.rings.findIndex(r => r.active && !r.passed);
          const playerProgressInLap = playerActiveRingIdx >= 0 ? playerActiveRingIdx : this.rings.length;
          const playerProgressRatio = this.rings.length > 0 ? (playerProgressInLap / this.rings.length) : 0;
          const playerTotalScore = (this.currentLap - 1) + playerProgressRatio;

          const waypoints = this.aiFlightWaypoints.length > 0 ? this.aiFlightWaypoints : this.raceWaypoints;
          const aiWpIdx = this.aiRacerState.currentWaypointIdx;
          const aiProgressRatio = waypoints.length > 0 ? (aiWpIdx / waypoints.length) : 0;
          const aiTotalScore = (this.aiRacerState.lap - 1) + aiProgressRatio;

          if (playerTotalScore > aiTotalScore + 0.02) {
            raceRank = 1;
          } else if (playerTotalScore < aiTotalScore - 0.02) {
            raceRank = 2;
          } else {
            // Very close progress - compare relative distance to the finish line
            const target = this.raceWaypoints[this.raceWaypoints.length - 1] || this.position;
            const pDist = this.position.distanceTo(target);
            const aiDist = aiPos.distanceTo(target);
            raceRank = pDist <= aiDist ? 1 : 2;
          }
        }
      }
    }

    let currentNavGuide: DroneTelemetry['currentNavGuide'] = undefined;
    if (this.rings.length > 0) {
      const activeIdx = this.rings.findIndex(r => r.active && !r.passed);
      if (activeIdx !== -1) {
        const targetRing = this.rings[activeIdx];
        this._tempVecA.set(targetRing.position[0], targetRing.position[1], targetRing.position[2]);
        const distToGate = Math.round(this.position.distanceTo(this._tempVecA) * 10) / 10;
        const isTunnelStage = this.currentStage?.id === 'ring-race-1' || this.currentStage?.id === 'stage-4' || this.currentStage?.type === 'RING_RACE';
        
        let direction: 'ENTER' | 'EXIT' | 'APPROACH' | 'CLIMB' | 'DESCEND' = 'APPROACH';
        let instruction = `[IN] ${activeIdx + 1}번 입구로 접근하세요`;

        const altDiff = this.position.y - targetRing.position[1];
        if (distToGate < 7.0) {
          direction = 'ENTER';
          instruction = `[IN] ${activeIdx + 1}번 입구 진입 완료 ▶ [OUT] 출구로 직진 관통`;
        } else if (distToGate < 15.0 && Math.abs(altDiff) < 2.0) {
          direction = 'ENTER';
          instruction = `[IN] 정면 입구 정렬 완료 ▶ 속도 유지 진입`;
        } else if (altDiff < -2.5) {
          direction = 'CLIMB';
          instruction = `[IN] ${activeIdx + 1}번 입구 높이로 상승하세요 (권장 고도: ${targetRing.position[1].toFixed(1)}m)`;
        } else if (altDiff > 3.5) {
          direction = 'DESCEND';
          instruction = `[IN] ${activeIdx + 1}번 입구 높이로 하강하세요 (권장 고도: ${targetRing.position[1].toFixed(1)}m)`;
        }

        const isFinish = activeIdx === this.rings.length - 1;
        currentNavGuide = {
          stepName: isFinish ? '최종 피니시 게이트' : (isTunnelStage ? `${activeIdx + 1}번 빌딩 관통 터널` : `${activeIdx + 1}번 게이트`),
          direction,
          instruction,
          distanceM: distToGate,
          recommendedAltM: Math.round(targetRing.position[1] * 10) / 10
        };
      }
    } else if (this.rescueTarget) {
      if (!this.rescueTarget.pickedUp) {
        this._tempVecA.set(this.rescueTarget.patientPosition[0], this.rescueTarget.patientPosition[1], this.rescueTarget.patientPosition[2]);
        const dist = Math.round(this.position.distanceTo(this._tempVecA) * 10) / 10;
        currentNavGuide = {
          stepName: '63빌딩 옥상 조난자',
          direction: this.position.y < this.rescueTarget.patientPosition[1] - 3 ? 'CLIMB' : 'APPROACH',
          instruction: '[IN] 63빌딩 옥상 환자에게 접근하여 호버링',
          distanceM: dist,
          recommendedAltM: Math.round(this.rescueTarget.patientPosition[1] * 10) / 10
        };
      } else if (!this.rescueTarget.delivered) {
        this._tempVecA.set(this.rescueTarget.hospitalPosition[0], this.rescueTarget.hospitalPosition[1], this.rescueTarget.hospitalPosition[2]);
        const dist = Math.round(this.position.distanceTo(this._tempVecA) * 10) / 10;
        currentNavGuide = {
          stepName: '종합병원 옥상 헬리패드',
          direction: 'APPROACH',
          instruction: '[OUT] 종합병원 헬리패드로 이송 및 착륙',
          distanceM: dist,
          recommendedAltM: Math.round(this.rescueTarget.hospitalPosition[1] * 10) / 10
        };
      }
    }

    const throttlePct = Math.round(((this.currentInput.throttle + 1) / 2) * 100);

    // Update real-time audio motor sound at full frame rate
    soundManager.updateMotorSound(
      throttlePct,
      Math.round(speedKmh * 10) / 10,
      this.isGrounded
    );

    // Throttle React state dispatch to ~20Hz (every 50ms) to eliminate React reconciliation CPU overhead
    const now = performance.now();
    if (now - this.lastTelemetryTime >= 50 || this.hasCrashed || this.isGrounded !== this.prevIsGrounded) {
      this.lastTelemetryTime = now;
      this.prevIsGrounded = this.isGrounded;

      const telemetry: DroneTelemetry = {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
        speedKmh: Math.round(speedKmh * 10) / 10,
        altitudeM: Math.round(altitudeM * 10) / 10,
        pitchDeg,
        rollDeg,
        yawDeg,
        throttlePct,
        batteryPct: this.batteryPct,
        speedGear: this.speedGear,
        isGrounded: this.isGrounded,
        hasCrashed: this.hasCrashed,
        hasPatient: this.patientAttached,
        propellerRpm: this.isGrounded ? 0 : Math.round(4000 + this.currentInput.throttle * 4000),
        armed: this.armed,
        autoFlightState: this.autoFlightState,
        raceRank,
        aiDistanceM,
        aiFinished,
        currentNavGuide
      };

      this.callbacks.onTelemetry(telemetry);
    }
  }

  public emergencyHoverStop() {
    this.velocity.set(0, 0, 0);
    this.rotation.x = 0;
    this.rotation.z = 0;
    this.currentInput = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(1.0);
  };

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);

    if (this.instancedStreetPylons) {
      this.instancedStreetPylons.geometry.dispose();
      this.instancedStreetPylons.dispose();
    }
    if (this.instancedPylonLamps) {
      this.instancedPylonLamps.geometry.dispose();
      this.instancedPylonLamps.dispose();
    }
    if (this.instancedSkyCruisers) {
      this.instancedSkyCruisers.geometry.dispose();
      this.instancedSkyCruisers.dispose();
    }
    if (this.instancedDataCubes) {
      this.instancedDataCubes.geometry.dispose();
      this.instancedDataCubes.dispose();
    }
    if (this.instancedMegacityTowers) {
      this.instancedMegacityTowers.geometry.dispose();
      this.instancedMegacityTowers.dispose();
    }
    if (this.instancedMegacityBeacons) {
      this.instancedMegacityBeacons.geometry.dispose();
      this.instancedMegacityBeacons.dispose();
    }
    if (this.instancedTreeTrunks) {
      this.instancedTreeTrunks.geometry.dispose();
      this.instancedTreeTrunks.dispose();
    }
    if (this.instancedTreeOakFoliage) {
      this.instancedTreeOakFoliage.geometry.dispose();
      this.instancedTreeOakFoliage.dispose();
    }
    if (this.instancedTreePineFoliage) {
      this.instancedTreePineFoliage.geometry.dispose();
      this.instancedTreePineFoliage.dispose();
    }
    if (this.instancedVehicles) {
      this.instancedVehicles.geometry.dispose();
      this.instancedVehicles.dispose();
    }
    if (this.instancedVehicleTops) {
      this.instancedVehicleTops.geometry.dispose();
      this.instancedVehicleTops.dispose();
    }
    if (this.instancedSolarPanels) {
      this.instancedSolarPanels.geometry.dispose();
      this.instancedSolarPanels.dispose();
    }
    if (this.instancedMidRiseBlocks) {
      this.instancedMidRiseBlocks.geometry.dispose();
      this.instancedMidRiseBlocks.dispose();
    }
    if (this.instancedMidRisePads) {
      this.instancedMidRisePads.geometry.dispose();
      this.instancedMidRisePads.dispose();
    }
    if (this.instancedMidRiseWindows) {
      this.instancedMidRiseWindows.geometry.dispose();
      this.instancedMidRiseWindows.dispose();
    }
    if (this.instancedRoofHVAC) {
      this.instancedRoofHVAC.geometry.dispose();
      this.instancedRoofHVAC.dispose();
    }
    if (this.instancedRoofAntennas) {
      this.instancedRoofAntennas.geometry.dispose();
      this.instancedRoofAntennas.dispose();
    }
    if (this.instancedEntranceAwnings) {
      this.instancedEntranceAwnings.geometry.dispose();
      this.instancedEntranceAwnings.dispose();
    }
    if (this.instancedStreetPoles) {
      this.instancedStreetPoles.geometry.dispose();
      this.instancedStreetPoles.dispose();
    }
    if (this.instancedStreetLanterns) {
      this.instancedStreetLanterns.geometry.dispose();
      this.instancedStreetLanterns.dispose();
    }

    this.dynamicVehicles.forEach(v => {
      this.scene.remove(v.group);
    });
    this.dynamicVehicles = [];

    this.animatedPedestrians.forEach(p => {
      this.scene.remove(p.group);
    });
    this.animatedPedestrians = [];

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
