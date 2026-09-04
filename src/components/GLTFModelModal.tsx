import React, { useState, useRef } from 'react';
import { 
  GraphicsAtmospherePreset, 
  CustomGLTFModel 
} from '../types';
import { 
  Box, 
  Upload, 
  Sun, 
  Sunset, 
  Moon, 
  Mountain, 
  Trash2, 
  Layers, 
  CheckCircle2, 
  Info, 
  Sparkles,
  Plane,
  Building2,
  Landmark,
  X
} from 'lucide-react';

interface GLTFModelModalProps {
  currentPreset: GraphicsAtmospherePreset;
  loadedModels: CustomGLTFModel[];
  onSelectPreset: (preset: GraphicsAtmospherePreset) => void;
  onUploadGLTF: (file: File) => Promise<void>;
  onRemoveModel: (modelId: string) => void;
  onClearAllModels: () => void;
  onClose: () => void;
}

export const GLTFModelModal: React.FC<GLTFModelModalProps> = ({
  currentPreset,
  loadedModels,
  onSelectPreset,
  onUploadGLTF,
  onRemoveModel,
  onClearAllModels,
  onClose
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      setUploadError('GLB 또는 GLTF 파일 형식(.glb, .gltf)만 지원됩니다.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      await onUploadGLTF(file);
      setUploadSuccess(`"${file.name}" 모델이 성공적으로 로드되어 3D 월드에 배치되었습니다!`);
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      setUploadError(`3D 모델 로딩 실패: ${err?.message || '알 수 없는 오류'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      setUploadError('GLB 또는 GLTF 파일(.glb, .gltf)을 드롭해주세요.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      await onUploadGLTF(file);
      setUploadSuccess(`"${file.name}" 모델이 3D 월드에 배치되었습니다!`);
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      setUploadError(`모델 로드 실패: ${err?.message || '파일 파싱 오류'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const presets: {
    id: GraphicsAtmospherePreset;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    badge: string;
  }[] = [
    {
      id: 'SEOUL_HANRIVER_DAY',
      title: '서울 여의도·한강 대낮 (Yeouido / Han River)',
      subtitle: '63빌딩 골든 파사드, 파크원 붉은 외골격 & 마포대교 한강 수면 반사광',
      icon: <Landmark className="w-5 h-5 text-blue-600" />,
      color: 'border-blue-600 bg-blue-50/80',
      badge: '여의도 실사'
    },
    {
      id: 'GANGNAM_NIGHT',
      title: '강남 테헤란로 네온 야경 (Gangnam Teheran-ro)',
      subtitle: '테헤란로 버스전용차로, 대형 LED 미디어 전광판 & 강남 IT 밸리 조명',
      icon: <Building2 className="w-5 h-5 text-purple-600" />,
      color: 'border-purple-600 bg-purple-50/80',
      badge: '강남 실사 야경'
    },
    {
      id: 'BLENDER_PBR_DAY',
      title: '블렌더 실사 도심 (Blender PBR)',
      subtitle: '유리창 커튼월 반사광 & 자연광 PBR 조명',
      icon: <Sun className="w-5 h-5 text-amber-500" />,
      color: 'border-amber-500 bg-amber-50/70',
      badge: 'PBR 대낮'
    },
    {
      id: 'AIRPORT_SUNSET',
      title: '국제공항 골든 석양 (Airport Sunset)',
      subtitle: '활주로 유도등, 석양 그라데이션 & 주황빛 태양',
      icon: <Sunset className="w-5 h-5 text-orange-500" />,
      color: 'border-orange-500 bg-orange-50/70',
      badge: '시네마틱'
    },
    {
      id: 'CYBERPUNK_NIGHT',
      title: '사이버펑크 네온 나이트 (Night City)',
      subtitle: '야간 활주로 비콘, 네온 스카이라인 & 딥 블루 안개',
      icon: <Moon className="w-5 h-5 text-cyan-400" />,
      color: 'border-cyan-500 bg-cyan-50/70',
      badge: '네온 야경'
    },
    {
      id: 'ALPINE_DAWN',
      title: '여의도 국회의사당 여명 (Yeouido Dawn)',
      subtitle: '국회의사당 청록색 돔 실루엣 & 은은한 새벽 핑크빛 대기',
      icon: <Sparkles className="w-5 h-5 text-emerald-500" />,
      color: 'border-emerald-500 bg-emerald-50/70',
      badge: '여의도 여명'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                3D 그래픽 환경 & GLTF 모델 로더
              </h2>
              <p className="text-xs text-slate-300">
                블렌더 PBR 조명 프리셋 및 직접 제작한 3D 모델(.glb/.gltf) 로딩
              </p>
            </div>
          </div>
          <button
            id="gltf-modal-close"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: Graphics & Atmosphere Lighting Presets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                3D 그래픽 & 대기 조명 프리셋
              </h3>
              <span className="text-xs text-slate-500 font-bold">실시간 즉시 반영</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map(p => {
                const isSelected = currentPreset === p.id;
                return (
                  <button
                    key={p.id}
                    id={`preset-btn-${p.id}`}
                    onClick={() => onSelectPreset(p.id)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                      isSelected
                        ? `${p.color} shadow-md scale-[1.01]`
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white shadow-xs shrink-0 border border-slate-100">
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {p.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                        {p.subtitle}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 absolute top-3 right-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Custom GLTF/GLB 3D Model Uploader */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                커스텀 3D 모델(.glb / .gltf) 로더
              </h3>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Blender / Sketchfab 지원
              </span>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mb-1 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-slate-800">
                {isUploading ? '3D 모델 파싱 및 로딩 중...' : '클릭하여 GLB/GLTF 파일 업로드 또는 여기에 드래그'}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Blender, Sketchfab, Kenney, Poly Pizza에서 내보낸 3D 에셋을 드론 위치에 스폰합니다.
              </p>
            </div>

            {/* Alerts */}
            {uploadError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{uploadError}</span>
              </div>
            )}
            {uploadSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{uploadSuccess}</span>
              </div>
            )}
          </div>

          {/* Section 3: Loaded Models List & Stats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                현재 배치된 커스텀 3D 모델 ({loadedModels.length})
              </h3>
              {loadedModels.length > 0 && (
                <button
                  id="gltf-clear-all"
                  onClick={onClearAllModels}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  전체 삭제
                </button>
              )}
            </div>

            {loadedModels.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-200 text-xs text-slate-500 font-medium">
                배치된 커스텀 GLTF 모델이 없습니다. 위 업로더를 통해 3D 건물을 추가해보세요.
              </div>
            ) : (
              <div className="space-y-2">
                {loadedModels.map(model => (
                  <div
                    key={model.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                        {model.name}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                        정점 수: {model.vertexCount.toLocaleString()}개 | 메시 수: {model.meshCount}개 | 스케일: {model.scale.toFixed(2)}x
                      </p>
                    </div>
                    <button
                      id={`remove-model-${model.id}`}
                      onClick={() => onRemoveModel(model.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="모델 제거"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Plane className="w-3.5 h-3.5 text-blue-500" />
            <span>국제공항 활주로 (X: -160, Z: 90) & 알프스 설산 (North Z: -240)</span>
          </div>
          <button
            id="gltf-modal-done"
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            확인 및 비행 복귀
          </button>
        </div>
      </div>
    </div>
  );
};
