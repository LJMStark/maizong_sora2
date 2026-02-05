"use client";

import React, { useEffect } from 'react';

interface Props {
  src: string;
  type: 'image' | 'video' | 'analysis';
  prompt?: string;
  onClose: () => void;
}

const Lightbox: React.FC<Props> = ({ src, type, prompt, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1a1a1a]/95 backdrop-blur-md animate-[soft-pulse_0.2s_ease-out]"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 group"
      >
        <span className="material-symbols-outlined text-2xl opacity-70 group-hover:opacity-100">close</span>
      </button>

      <div
        className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 md:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 flex items-center justify-center w-full min-h-0">
          {type === 'video' ? (
            <video
              src={src}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain shadow-2xl rounded-sm outline-none bg-black"
            />
          ) : (
            <img
              src={src}
              alt="全屏预览"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-sm select-none"
            />
          )}
        </div>
        {prompt && (
          <div className="mt-6 max-w-3xl w-full">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4">
              <p className="text-sm text-white/60 mb-2 uppercase tracking-wider">提示词</p>
              <p className="text-white/90 text-base leading-relaxed">{prompt}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lightbox;
