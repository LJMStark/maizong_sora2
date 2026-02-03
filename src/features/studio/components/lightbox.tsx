"use client";

import React, { useEffect } from 'react';

interface Props {
  src: string;
  type: 'image' | 'video' | 'analysis';
  onClose: () => void;
}

const Lightbox: React.FC<Props> = ({ src, type, onClose }) => {
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
        className="w-full h-full flex items-center justify-center p-4 sm:p-8 md:p-12"
        onClick={(e) => e.stopPropagation()}
      >
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
            alt="Fullscreen Preview"
            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm select-none"
          />
        )}
      </div>
    </div>
  );
};

export default Lightbox;
