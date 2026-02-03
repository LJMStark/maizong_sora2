"use client";

import React from 'react';
import { GenerationResult } from '../types';

interface Props {
  history: GenerationResult[];
  onSelect: (url: string) => void;
  onClose: () => void;
}

const AssetPicker: React.FC<Props> = ({ history, onSelect, onClose }) => {
  const assets = history.filter(item => (item.type === 'image' || item.type === 'analysis') && item.url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]/80 backdrop-blur-sm p-8" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl max-h-[80vh] flex flex-col rounded-sm shadow-2xl overflow-hidden animate-[soft-pulse_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[#e5e5e1] flex justify-between items-center bg-[#faf9f6]">
          <div>
            <h3 className="text-xl font-serif italic text-[#1a1a1a]">Asset Library</h3>
            <p className="text-[10px] text-[#6b7280] uppercase tracking-widest mt-1">Select from previously generated content</p>
          </div>
          <button onClick={onClose} className="hover:bg-white p-2 rounded-full transition-colors text-[#6b7280] hover:text-[#1a1a1a]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
          {assets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[#6b7280]">
              <span className="material-symbols-outlined text-4xl mb-4 opacity-20">image_not_supported</span>
              <p className="text-xs uppercase tracking-widest">No valid assets found in history</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {assets.map(item => (
                <button
                  key={item.id}
                  onClick={() => { if (item.url) { onSelect(item.url); onClose(); } }}
                  className="group relative aspect-square border border-[#e5e5e1] bg-[#faf9f6] hover:border-[#1a1a1a] transition-all overflow-hidden text-left focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                >
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#1a1a1a]/0 group-hover:bg-[#1a1a1a]/10 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/95 border-t border-[#e5e5e1] translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                    <p className="text-[9px] text-[#1a1a1a] truncate font-medium uppercase tracking-wide">{item.type}</p>
                    <p className="text-[9px] text-[#6b7280] truncate">{item.prompt}</p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-lg drop-shadow-md">check_circle</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetPicker;
