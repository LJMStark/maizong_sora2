"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AspectRatio, GenerationResult } from '../types';
import { geminiService, fileToBase64, urlToBase64 } from '../services/gemini-service';
import { VIDEO_PROMPTS } from '../utils/prompt-library';
import Lightbox from './lightbox';
import AssetPicker from './asset-picker';
import { useStudio } from '../context/studio-context';

const VideoWorkshop: React.FC = () => {
  const searchParams = useSearchParams();
  const { state, deductCredits, addToHistory } = useStudio();
  const { credits, history } = state;

  const [prompt, setPrompt] = useState('');
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SOCIAL);
  const [mode, setMode] = useState<'Fast' | 'Quality'>('Fast');
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const imageParam = searchParams.get('image');
    if (imageParam) {
      setSourcePreview(decodeURIComponent(imageParam));
    }
  }, [searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceImage(file);
      setSourcePreview(URL.createObjectURL(file));
    }
  };

  const handleAssetSelect = (url: string) => {
    setSourcePreview(url);
    setSourceImage(null);
  };

  const handleRandomPrompt = () => {
    const random = VIDEO_PROMPTS[Math.floor(Math.random() * VIDEO_PROMPTS.length)];
    setPrompt(random);
  };

  const handleGenerate = async () => {
    if (!prompt && !sourceImage && !sourcePreview) {
      alert("Please provide a prompt or an image.");
      return;
    }
    const cost = mode === 'Quality' ? 50 : 25;
    if (credits < cost) {
      alert("Insufficient credits");
      return;
    }

    setLoading(true);
    setGeneratedVideo(null);
    deductCredits(cost, `Video Generation (${mode} Mode)`);

    try {
      let base64Img = undefined;

      if (sourceImage) {
        base64Img = await fileToBase64(sourceImage);
      } else if (sourcePreview) {
        base64Img = await urlToBase64(sourcePreview);
      }

      const videoUrl = await geminiService.generateVideo(
        prompt || "Product showcase, cinematic lighting, 4k",
        base64Img,
        aspectRatio,
        mode === 'Quality'
      );

      setGeneratedVideo(videoUrl);

      addToHistory({
        id: Date.now().toString(),
        type: 'video',
        url: videoUrl,
        prompt: prompt || (sourcePreview ? "Image to Video" : "Video Generation"),
        createdAt: new Date(),
        status: 'completed'
      });
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Video generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden font-sans">
      {lightboxOpen && generatedVideo && (
        <Lightbox src={generatedVideo} type="video" onClose={() => setLightboxOpen(false)} />
      )}

      {pickerOpen && (
        <AssetPicker
          history={history}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAssetSelect}
        />
      )}

      {/* Sidebar Controls */}
      <div className="w-[380px] border-r border-[#e5e5e1] flex flex-col bg-white overflow-y-auto custom-scrollbar p-8 gap-8">
        <div className="border-b border-[#e5e5e1] pb-6">
          <h1 className="text-2xl font-serif italic mb-1 text-[#1a1a1a]">Creation Suite</h1>
          <p className="text-[#6b7280]/60 text-[11px] uppercase tracking-wider">Advanced video synthesis (Veo)</p>
        </div>

        {/* Step 1: Source */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7280]/60">01. Source Material (Optional)</p>
            <div className="flex gap-3">
              <button onClick={() => setPickerOpen(true)} className="text-[9px] underline text-[#1a1a1a] font-bold">History</button>
              {sourcePreview && <button onClick={() => { setSourceImage(null); setSourcePreview(null); }} className="text-[9px] underline text-[#6b7280]">Clear</button>}
            </div>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

          {sourcePreview ? (
            <div className="relative group border border-[#e5e5e1] aspect-[16/9] overflow-hidden bg-[#faf9f6]">
              <img src={sourcePreview} className="w-full h-full object-cover" alt="Source" />
              <button
                onClick={() => { setSourceImage(null); setSourcePreview(null); }}
                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs uppercase tracking-widest font-bold"
              >
                Change Source
              </button>
              {!sourceImage && (
                <div className="absolute top-2 right-2 bg-[#1a1a1a] text-white text-[8px] px-2 py-1 uppercase tracking-widest font-bold">
                  Imported
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group border border-[#e5e5e1] p-8 flex flex-col items-center justify-center gap-3 hover:bg-[#faf9f6] transition-colors cursor-pointer bg-white border-dashed"
            >
              <span className="material-symbols-outlined text-[#6b7280]/40 group-hover:text-[#1a1a1a]">add_photo_alternate</span>
              <p className="text-[11px] uppercase tracking-widest text-[#6b7280] group-hover:text-[#1a1a1a]">Upload Product Asset</p>
            </div>
          )}
        </div>

        {/* Step 2: Format */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7280]/60">02. Frame Format</p>
          <div className="grid grid-cols-2 gap-px bg-[#e5e5e1] border border-[#e5e5e1]">
            <button
              onClick={() => setAspectRatio(AspectRatio.SOCIAL)}
              className={`flex items-center justify-center gap-2 py-4 transition-colors ${aspectRatio === AspectRatio.SOCIAL ? 'bg-[#faf9f6] text-[#1a1a1a] font-bold' : 'bg-white text-[#6b7280]'}`}
            >
              <span className="text-[10px] uppercase tracking-tighter">9:16 Portrait</span>
            </button>
            <button
              onClick={() => setAspectRatio(AspectRatio.LANDSCAPE)}
              className={`flex items-center justify-center gap-2 py-4 transition-colors ${aspectRatio === AspectRatio.LANDSCAPE ? 'bg-[#faf9f6] text-[#1a1a1a] font-bold' : 'bg-white text-[#6b7280]'}`}
            >
              <span className="text-[10px] uppercase tracking-tighter">16:9 Cinema</span>
            </button>
          </div>
        </div>

        {/* Step 3: Prompt */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7280]/60">03. Narrative Prompt</p>
            <button
              onClick={handleRandomPrompt}
              title="Surprise me with a motion prompt"
              className="text-[#6b7280] hover:text-[#1a1a1a] p-1 rounded-full hover:bg-[#faf9f6] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">casino</span>
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 bg-[#faf9f6] border border-[#e5e5e1] focus:ring-1 focus:ring-[#1a1a1a] focus:outline-none p-4 text-xs leading-relaxed placeholder:text-[#6b7280]/40 resize-none"
            placeholder="Define motion parameters (e.g., Slow pan, soft lighting, 10s duration...)"
          />
        </div>

        {/* Step 4: Quality */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7280]/60">04. Render Mode</p>
          <div className="flex border border-[#e5e5e1]">
            <button
              onClick={() => setMode('Fast')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${mode === 'Fast' ? 'bg-[#1a1a1a] text-white' : 'bg-white text-[#6b7280] hover:bg-[#faf9f6]'}`}
            >
              Fast
            </button>
            <button
              onClick={() => setMode('Quality')}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${mode === 'Quality' ? 'bg-[#1a1a1a] text-white' : 'bg-white text-[#6b7280] hover:bg-[#faf9f6]'}`}
            >
              Quality
            </button>
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-[#e5e5e1]">
          <button
            onClick={handleGenerate}
            disabled={loading || (!prompt && !sourceImage && !sourcePreview)}
            className="w-full bg-[#1a1a1a] text-white py-5 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#2d3436] disabled:bg-gray-400 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-sm">movie_filter</span>
            {loading ? 'Rendering...' : 'Initialize Generation'}
          </button>
        </div>
      </div>

      {/* Main Preview */}
      <div className="flex-1 bg-[#faf9f6] overflow-y-auto custom-scrollbar flex flex-col p-12 items-center justify-center">
        <div className="max-w-4xl w-full flex flex-col items-center">
          {loading ? (
            <div className={`bg-white border border-[#e5e5e1] p-1 shadow-sm flex flex-col items-center justify-center ${aspectRatio === AspectRatio.SOCIAL ? 'aspect-[9/16] h-[600px]' : 'aspect-[16/9] w-full'}`}>
              <span className="material-symbols-outlined text-4xl animate-spin text-[#6b7280]/40 mb-6">hourglass_empty</span>
              <h3 className="text-lg font-serif italic mb-2 text-[#1a1a1a]">Rendering Process</h3>
              <p className="text-[#6b7280]/60 text-[11px] leading-relaxed uppercase tracking-widest">Compiling final frames with neural engine</p>
              <p className="text-[10px] text-[#8C7355] mt-4 animate-pulse">This may take a minute...</p>
            </div>
          ) : generatedVideo ? (
            <div className="flex flex-col gap-6 w-full items-center">
              <div className={`relative bg-black ${aspectRatio === AspectRatio.SOCIAL ? 'aspect-[9/16] h-[600px]' : 'aspect-[16/9] w-full'} shadow-2xl group`}>
                <video
                  src={generatedVideo}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80 backdrop-blur-sm transition-all"
                    title="Full Screen"
                  >
                    <span className="material-symbols-outlined text-xl">open_in_full</span>
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <a href={generatedVideo} download="generated_video.mp4" className="px-8 py-3 bg-[#1a1a1a] text-white text-xs uppercase tracking-widest font-bold">Download MP4</a>
              </div>
            </div>
          ) : (
            <div className={`bg-white border border-[#e5e5e1] p-1 shadow-sm flex flex-col items-center justify-center opacity-50 ${aspectRatio === AspectRatio.SOCIAL ? 'aspect-[9/16] h-[600px]' : 'aspect-[16/9] w-full'}`}>
              <span className="material-symbols-outlined text-4xl text-[#6b7280]/20 mb-6">movie</span>
              <p className="text-[#6b7280]/40 text-[11px] uppercase tracking-widest">Preview Window</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoWorkshop;
