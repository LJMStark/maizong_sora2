"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AspectRatio, ImageQuality } from '../types';
import { IMAGE_PROMPTS, EDIT_PROMPTS, ANALYZE_PROMPTS } from '../utils/prompt-library';
import Lightbox from './lightbox';
import AssetPicker from './asset-picker';
import ShowcaseGallery from './showcase-gallery';
import { useStudio } from '../context/studio-context';
import { useImageTaskPolling } from '../hooks/use-image-task-polling';
import { useSimulatedProgress } from '../hooks/use-simulated-progress';

type Mode = 'generate' | 'edit' | 'analyze';

const IMAGE_CREDIT_COST = 10;

const ImageWorkshop: React.FC = () => {
  const router = useRouter();
  const t = useTranslations('studio.image');
  const { state, refreshCredits, refreshImageTasks, addToHistory } = useStudio();
  const { credits, history } = state;

  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [quality, setQuality] = useState<ImageQuality>(ImageQuality.STANDARD);
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [taskStatus, setTaskStatus] = useState<"pending" | "running" | "succeeded" | "error">("pending");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Polling for image task status
  useImageTaskPolling({
    taskId: currentTaskId,
    interval: 3000,
    onComplete: (task) => {
      setLoading(false);
      setCurrentTaskId(null);
      setTaskStatus("succeeded");
      if (task.imageUrl) {
        setGeneratedImage(task.imageUrl);
        refreshCredits();
        refreshImageTasks();
      }
    },
    onError: (task) => {
      setLoading(false);
      setCurrentTaskId(null);
      setTaskStatus("error");
      alert(task.errorMessage || t('errors.generationFailed'));
      refreshCredits();
      refreshImageTasks();
    },
  });

  // 模拟进度：30秒，最多到95%
  const simulatedProgress = useSimulatedProgress({
    isRunning: loading,
    actualStatus: taskStatus,
    estimatedDuration: 30000, // 30秒
    maxProgress: 95,
  });

  const progress = taskStatus === "succeeded" ? 100 : simulatedProgress;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRefImage(file);
      const url = URL.createObjectURL(file);
      setRefImagePreview(url);
    }
  };

  const handleAssetSelect = (url: string) => {
    setRefImagePreview(url);
    setRefImage(null);
  };

  const addTag = (tag: string) => {
    setPrompt(prev => {
      if (prev.includes(tag)) return prev;
      return prev ? `${prev}, ${tag}` : tag;
    });
  };

  const handleRandomPrompt = () => {
    const list = mode === 'generate' ? IMAGE_PROMPTS : mode === 'edit' ? EDIT_PROMPTS : ANALYZE_PROMPTS;
    const random = list[Math.floor(Math.random() * list.length)];
    setPrompt(random);
  };

  const handleToVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (generatedImage) {
      router.push(`/studio/video?image=${encodeURIComponent(generatedImage)}`);
    }
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleAction = async () => {
    if (!prompt && mode !== 'analyze') return;
    if (mode === 'analyze') {
      alert(t('errors.analysisNotSupported'));
      return;
    }
    if (mode === 'edit' && !refImage && !refImagePreview) {
      alert(t('errors.imageRequired'));
      return;
    }

    if (credits < IMAGE_CREDIT_COST) {
      alert(t('errors.insufficientCredits'));
      return;
    }

    setLoading(true);
    setGeneratedImage(null);
    setAnalysisResult(null);
    setTaskStatus("pending");

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (refImage) {
        imageBase64 = await fileToBase64(refImage);
        imageMimeType = refImage.type;
      }

      const model = quality === ImageQuality.UHD ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";
      const endpoint = mode === 'edit' ? '/api/image/edit' : '/api/image/generate';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
          aspectRatio,
          imageBase64,
          imageMimeType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('errors.taskCreationFailed'));
      }

      const data = await response.json();
      setCurrentTaskId(data.taskId);
      setTaskStatus("running");
    } catch (e) {
      console.error(e);
      setLoading(false);
      alert(e instanceof Error ? e.message : t('errors.operationFailed'));
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden font-sans">
      {lightboxOpen && generatedImage && (
        <Lightbox src={generatedImage} type="image" onClose={() => setLightboxOpen(false)} />
      )}

      {pickerOpen && (
        <AssetPicker
          history={history}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAssetSelect}
        />
      )}

      {/* Controls Panel */}
      <div className="w-full md:w-[440px] overflow-y-auto border-b md:border-b-0 md:border-r border-[#e5e5e1] bg-white p-4 md:p-8 flex flex-col gap-6 md:gap-8 custom-scrollbar order-1 md:order-1">

        {/* Mode Switcher */}
        <div className="flex p-1 bg-[#faf9f6] border border-[#e5e5e1] rounded-sm">
          {(['generate', 'edit'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setGeneratedImage(null); setAnalysisResult(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-sm ${mode === m ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#4b5563] hover:text-[#1a1a1a]'}`}
            >
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>

        {/* Prompt Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[#1a1a1a] text-xs font-bold uppercase tracking-[0.15em]">
                {mode === 'edit' ? t('prompt.labelEdit') : t('prompt.labelGenerate')}
              </label>
              <button
                onClick={handleRandomPrompt}
                className="text-[#4b5563] hover:text-[#1a1a1a] transition-colors flex items-center justify-center p-1 rounded-full hover:bg-[#faf9f6]"
                title={t('prompt.randomTitle')}
              >
                <span className="material-symbols-outlined text-sm">casino</span>
              </button>
            </div>
            <span className="text-xs text-[#4b5563] tabular-nums">{prompt.length} / 3000</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="group relative">
              <textarea
                className="w-full h-32 p-5 bg-[#faf9f6] border border-[#e5e5e1] rounded-sm text-base text-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] focus:border-[#1a1a1a] transition-all placeholder:text-[#4b5563]/60 leading-relaxed resize-none focus:outline-none"
                placeholder={
                  mode === 'edit' ? t('prompt.placeholderEdit') : t('prompt.placeholder')
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            {mode === 'generate' && (
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'studioLighting', label: t('tags.studioLighting') },
                  { key: 'minimalist', label: t('tags.minimalist') },
                  { key: 'nature', label: t('tags.nature') },
                  { key: 'luxury', label: t('tags.luxury') },
                  { key: 'bokeh', label: t('tags.bokeh') }
                ].map(tag => (
                  <button
                    key={tag.key}
                    onClick={() => addTag(tag.label)}
                    className="text-xs font-semibold text-[#1a1a1a] bg-[#faf9f6] border border-[#e5e5e1] px-3 py-1.5 rounded-sm tracking-wide hover:border-[#1a1a1a] transition-colors"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Image */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[#1a1a1a] text-xs font-bold uppercase tracking-[0.15em]">
              {mode === 'generate' ? t('inputImage.labelOptional') : t('inputImage.labelRequired')}
            </h3>
            <div className="flex gap-4">
              <button onClick={() => setPickerOpen(true)} className="text-xs text-[#1a1a1a] hover:text-[#2d3436] underline font-medium">{t('inputImage.historyAssets')}</button>
              {refImagePreview && (
                <button onClick={() => { setRefImage(null); setRefImagePreview(null); }} className="text-xs text-[#4b5563] hover:text-[#1a1a1a] underline">{t('inputImage.clear')}</button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

            {refImagePreview ? (
              <div
                className="aspect-square bg-center bg-cover border border-[#1a1a1a] relative group cursor-pointer"
                style={{ backgroundImage: `url(${refImagePreview})` }}
              ></div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-square border border-dashed border-[#e5e5e1] hover:border-[#1a1a1a] bg-[#faf9f6] flex flex-col items-center justify-center cursor-pointer transition-all ${mode !== 'generate' && !refImage ? 'border-[#1a1a1a]/50 bg-[#1a1a1a]/5' : ''}`}
              >
                <span className="material-symbols-outlined text-[#4b5563] text-lg">add</span>
              </div>
            )}
          </div>
        </div>

        {/* Parameters (Generate Only) */}
        {mode === 'generate' && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <span className="text-[#1a1a1a] text-xs font-bold uppercase tracking-[0.15em]">{t('dimensions.label')}</span>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(AspectRatio).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex flex-col items-center justify-center py-2 border transition-all ${aspectRatio === ratio ? 'border-[#1a1a1a] bg-white text-[#1a1a1a] shadow-sm' : 'border-[#e5e5e1] bg-[#faf9f6] text-[#4b5563] hover:border-[#1a1a1a]'}`}
                  >
                    <span className="text-[10px] font-bold tracking-widest">{t(`aspectRatio.${ratio.toLowerCase()}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <span className="text-[#1a1a1a] text-xs font-bold uppercase tracking-[0.15em]">{t('quality.label')}</span>
              <div className="flex border border-[#e5e5e1] p-1 bg-[#faf9f6]">
                {Object.values(ImageQuality).map(q => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`flex-1 py-1.5 text-xs font-bold tracking-widest transition-colors ${quality === q ? 'bg-white text-[#1a1a1a] border border-[#e5e5e1] shadow-sm' : 'text-[#4b5563] hover:text-[#1a1a1a]'}`}
                  >
                    {t(`quality.${q.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Credit Cost Info */}
            <div className="p-4 bg-[#faf9f6] border border-[#e5e5e1] rounded-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#4b5563] uppercase tracking-widest">{t('cost.label')}</span>
                <span className="text-sm font-bold text-[#1a1a1a]">{IMAGE_CREDIT_COST} {t('cost.credits')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-auto pt-8 border-t border-[#e5e5e1]">
          <button
            onClick={handleAction}
            disabled={loading || (mode === 'generate' && !prompt) || (mode === 'edit' && !refImage && !refImagePreview)}
            className="w-full bg-[#1a1a1a] text-white py-5 text-sm font-bold uppercase tracking-[0.2em] hover:bg-[#2d3436] disabled:bg-gray-400 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            {loading ? t('actions.processing') : mode === 'edit' ? t('actions.applyEdits') : t('actions.generate')}
          </button>
        </div>

      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-4 md:p-12 flex flex-col relative bg-[#faf9f6] order-2 md:order-2 min-h-[250px] md:min-h-0">
        <div className="flex-1 border border-[#e5e5e1] bg-white flex items-center justify-center relative overflow-hidden shadow-sm p-4 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center text-center animate-soft-pulse">
              <span className="material-symbols-outlined text-4xl text-[#4b5563]/50 mb-4 animate-spin">blur_on</span>
              <p className="font-serif text-xl text-[#1a1a1a] italic">
                {t('canvas.generating')}
              </p>

              <div className="w-64 mt-6">
                <div className="flex justify-between text-xs text-[#4b5563] mb-2">
                  <span>{t('canvas.progress')}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-[#e5e5e1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a1a1a] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-[#4b5563] mt-4">{t('canvas.waitMessage')}</p>
            </div>
          ) : analysisResult ? (
            <div className="max-w-2xl w-full h-full overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#e5e5e1]">
                {refImagePreview && <img src={refImagePreview} className="w-16 h-16 object-cover border border-[#e5e5e1]" alt="已分析" />}
                <div>
                  <h4 className="font-serif text-2xl text-[#1a1a1a] italic">{t('canvas.analysisReport')}</h4>
                  <p className="text-sm text-[#4b5563]">Gemini 3 Pro Vision</p>
                </div>
              </div>
              <p className="text-base leading-relaxed text-[#1a1a1a] whitespace-pre-wrap font-normal">
                {analysisResult}
              </p>
            </div>
          ) : generatedImage ? (
            <div className="relative group cursor-zoom-in h-full flex items-center justify-center" onClick={() => setLightboxOpen(true)}>
              <img src={generatedImage} alt="已生成" className="max-w-full max-h-full object-contain shadow-lg" />

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-8 opacity-0 group-hover:opacity-100">
                <div className="flex gap-4">
                  <button className="bg-white/90 text-[#1a1a1a] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-lg flex items-center gap-2 hover:bg-white transition-all">
                    <span className="material-symbols-outlined text-base">open_in_full</span>
                    {t('canvas.expand')}
                  </button>
                  <button
                    onClick={handleToVideo}
                    className="bg-[#1a1a1a]/90 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-lg flex items-center gap-2 hover:bg-[#1a1a1a] transition-all"
                  >
                    <span className="material-symbols-outlined text-base">movie</span>
                    {t('canvas.animate')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full p-4">
              <ShowcaseGallery onSelectPrompt={(selectedPrompt) => setPrompt(selectedPrompt)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageWorkshop;
