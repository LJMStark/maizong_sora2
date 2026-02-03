"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AspectRatio, ImageQuality, GenerationResult } from '../types';
import { geminiService, fileToBase64, urlToBase64 } from '../services/gemini-service';
import { IMAGE_PROMPTS, EDIT_PROMPTS, ANALYZE_PROMPTS } from '../utils/prompt-library';
import Lightbox from './lightbox';
import AssetPicker from './asset-picker';
import { useStudio } from '../context/studio-context';

type Mode = 'generate' | 'edit' | 'analyze';

const ImageWorkshop: React.FC = () => {
  const router = useRouter();
  const { state, deductCredits, addToHistory } = useStudio();
  const { credits, history } = state;

  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [quality, setQuality] = useState<ImageQuality>(ImageQuality.STANDARD);
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAction = async () => {
    if (!prompt && mode !== 'analyze') return;
    if (mode === 'analyze' && !refImage && !refImagePreview) {
      alert("Image required for analysis");
      return;
    }
    if (mode === 'edit' && !refImage && !refImagePreview) {
      alert("Image required for editing");
      return;
    }

    const costMap = {
      'generate': quality === ImageQuality.UHD ? 20 : 10,
      'edit': 5,
      'analyze': 2
    };

    const cost = costMap[mode];
    if (credits < cost) {
      alert("Insufficient credits");
      return;
    }

    setLoading(true);
    setGeneratedImage(null);
    setAnalysisResult(null);

    const reason = mode === 'analyze' ? 'Image Analysis' :
      mode === 'edit' ? 'Image Editing' :
        `Image Generation (${quality})`;
    deductCredits(cost, reason);

    try {
      let base64Ref = undefined;

      if (refImage) {
        base64Ref = await fileToBase64(refImage);
      } else if (refImagePreview) {
        base64Ref = await urlToBase64(refImagePreview);
      }

      if (mode === 'analyze') {
        if (!base64Ref) throw new Error("No image");
        const text = await geminiService.analyzeImage(prompt, base64Ref);
        setAnalysisResult(text);
        addToHistory({
          id: Date.now().toString(),
          type: 'analysis',
          text: text,
          url: refImagePreview || undefined,
          prompt: prompt || "Analysis",
          createdAt: new Date(),
          status: 'completed'
        });
      } else {
        const resultBase64 = await geminiService.generateImage(prompt, aspectRatio, quality, base64Ref, mode as 'generate' | 'edit');
        setGeneratedImage(resultBase64);

        addToHistory({
          id: Date.now().toString(),
          type: 'image',
          url: resultBase64,
          prompt: prompt,
          createdAt: new Date(),
          status: 'completed'
        });
      }
    } catch (e) {
      console.error(e);
      alert("Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden font-sans">
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
      <div className="w-[440px] overflow-y-auto border-r border-[#e5e5e1] bg-white p-8 flex flex-col gap-8 custom-scrollbar">

        {/* Mode Switcher */}
        <div className="flex p-1 bg-[#faf9f6] border border-[#e5e5e1] rounded-sm">
          {(['generate', 'edit', 'analyze'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setGeneratedImage(null); setAnalysisResult(null); }}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm ${mode === m ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a]'}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Prompt Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[#1a1a1a] text-[10px] font-bold uppercase tracking-[0.15em]">
                {mode === 'analyze' ? 'Question (Optional)' : mode === 'edit' ? 'Edit Instructions' : 'Descriptive Prompt'}
              </label>
              <button
                onClick={handleRandomPrompt}
                className="text-[#6b7280] hover:text-[#1a1a1a] transition-colors flex items-center justify-center p-1 rounded-full hover:bg-[#faf9f6]"
                title="Surprise me with a prompt"
              >
                <span className="material-symbols-outlined text-sm">casino</span>
              </button>
            </div>
            <span className="text-[10px] text-[#6b7280] tabular-nums">{prompt.length} / 3000</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="group relative">
              <textarea
                className="w-full h-32 p-5 bg-[#faf9f6] border border-[#e5e5e1] rounded-sm text-sm text-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] focus:border-[#1a1a1a] transition-all placeholder:text-[#6b7280]/40 leading-relaxed resize-none focus:outline-none"
                placeholder={
                  mode === 'analyze' ? "Ask about the image (e.g., 'Describe the lighting')..." :
                    mode === 'edit' ? "Tell AI how to change the image (e.g., 'Add a retro filter', 'Remove background')..." :
                      "Describe product, aesthetic, lighting..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            {mode === 'generate' && (
              <div className="flex flex-wrap gap-2">
                {['Studio Lighting', 'Minimalist', 'Nature', 'Luxury', 'Bokeh'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="text-[10px] font-semibold text-[#1a1a1a] bg-[#faf9f6] border border-[#e5e5e1] px-3 py-1.5 rounded-sm tracking-wide hover:border-[#1a1a1a] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Image */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[#1a1a1a] text-[10px] font-bold uppercase tracking-[0.15em]">
              {mode === 'generate' ? 'Reference (Optional)' : 'Input Image (Required)'}
            </h3>
            <div className="flex gap-4">
              <button onClick={() => setPickerOpen(true)} className="text-[10px] text-[#1a1a1a] hover:text-[#2d3436] underline font-medium">History Assets</button>
              {refImagePreview && (
                <button onClick={() => { setRefImage(null); setRefImagePreview(null); }} className="text-[10px] text-[#6b7280] hover:text-[#1a1a1a] underline">Clear</button>
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
                <span className="material-symbols-outlined text-[#6b7280] text-lg">add</span>
              </div>
            )}
          </div>
        </div>

        {/* Parameters (Generate Only) */}
        {mode === 'generate' && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <span className="text-[#1a1a1a] text-[10px] font-bold uppercase tracking-[0.15em]">Dimensions</span>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(AspectRatio).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex flex-col items-center justify-center py-2 border transition-all ${aspectRatio === ratio ? 'border-[#1a1a1a] bg-white text-[#1a1a1a] shadow-sm' : 'border-[#e5e5e1] bg-[#faf9f6] text-[#6b7280] hover:border-[#1a1a1a]'}`}
                  >
                    <span className="text-[9px] font-bold tracking-widest">{ratio}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <span className="text-[#1a1a1a] text-[10px] font-bold uppercase tracking-[0.15em]">Resolution</span>
              <div className="flex border border-[#e5e5e1] p-1 bg-[#faf9f6]">
                {Object.values(ImageQuality).map(q => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest transition-colors ${quality === q ? 'bg-white text-[#1a1a1a] border border-[#e5e5e1] shadow-sm' : 'text-[#6b7280] hover:text-[#1a1a1a]'}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-12 flex flex-col relative bg-[#faf9f6]">
        <div className="flex-1 border border-[#e5e5e1] bg-white flex items-center justify-center relative overflow-hidden shadow-sm p-8">
          {loading ? (
            <div className="flex flex-col items-center text-center animate-soft-pulse">
              <span className="material-symbols-outlined text-4xl text-[#6b7280]/50 mb-4 animate-spin">blur_on</span>
              <p className="font-serif text-xl text-[#1a1a1a] italic">
                {mode === 'analyze' ? 'Analyzing visual data...' : 'Synthesizing...'}
              </p>
            </div>
          ) : analysisResult ? (
            <div className="max-w-2xl w-full h-full overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#e5e5e1]">
                {refImagePreview && <img src={refImagePreview} className="w-16 h-16 object-cover border border-[#e5e5e1]" alt="Analyzed" />}
                <div>
                  <h4 className="font-serif text-2xl text-[#1a1a1a] italic">Analysis Report</h4>
                  <p className="text-xs text-[#6b7280]">Gemini 3 Pro Vision</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-[#1a1a1a] whitespace-pre-wrap font-light">
                {analysisResult}
              </p>
            </div>
          ) : generatedImage ? (
            <div className="relative group cursor-zoom-in h-full flex items-center justify-center" onClick={() => setLightboxOpen(true)}>
              <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain shadow-lg" />

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-8 opacity-0 group-hover:opacity-100">
                <div className="flex gap-4">
                  <button className="bg-white/90 text-[#1a1a1a] px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-lg flex items-center gap-2 hover:bg-white transition-all">
                    <span className="material-symbols-outlined text-base">open_in_full</span>
                    Expand
                  </button>
                  <button
                    onClick={handleToVideo}
                    className="bg-[#1a1a1a]/90 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-lg flex items-center gap-2 hover:bg-[#1a1a1a] transition-all"
                  >
                    <span className="material-symbols-outlined text-base">movie</span>
                    Animate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center max-w-sm gap-6 p-8">
              <div className="w-16 h-16 border border-[#e5e5e1] flex items-center justify-center mb-2 rounded-full">
                <span className="material-symbols-outlined text-3xl text-[#6b7280] font-light">
                  {mode === 'analyze' ? 'search_check' : mode === 'edit' ? 'auto_fix_high' : 'shutter_speed'}
                </span>
              </div>
              <h4 className="font-serif text-2xl text-[#1a1a1a] italic">
                {mode === 'analyze' ? 'Ready to Analyze' : mode === 'edit' ? 'Ready to Edit' : 'Awaiting Composition'}
              </h4>
              <p className="text-xs text-[#6b7280] leading-relaxed max-w-[280px]">
                {mode === 'analyze' ? 'Upload an image to extract insights.' :
                  mode === 'edit' ? 'Upload an image and describe desired changes.' :
                    'Refine your vision in the control panel to generate sophisticated e-commerce imagery.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="absolute bottom-12 right-12 flex items-center gap-10">
          <button
            onClick={handleAction}
            disabled={loading || (mode === 'generate' && !prompt) || (mode !== 'generate' && !refImage && !refImagePreview)}
            className="bg-[#1a1a1a] hover:bg-[#2d3436] disabled:bg-gray-400 text-white px-12 py-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-lg hover:shadow-xl"
          >
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
            {loading ? 'Processing...' : mode === 'analyze' ? 'Analyze Image' : mode === 'edit' ? 'Apply Edits' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageWorkshop;
