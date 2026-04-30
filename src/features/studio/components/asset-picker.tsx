"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, ImageOff, X } from 'lucide-react';
import { GenerationResult } from '../types';

interface Props {
  history: GenerationResult[];
  onSelect: (url: string) => void;
  onClose: () => void;
}

const AssetPicker: React.FC<Props> = ({ history, onSelect, onClose }) => {
  const t = useTranslations('studio.assetPicker');
  const assets = history.filter(item => (item.type === 'image' || item.type === 'analysis') && item.url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm md:p-8" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl md:max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#e5e5e5] bg-white p-4 md:p-6">
          <div>
            <h3 className="text-[22px] font-medium text-[#0d0d0d]">{t('title')}</h3>
            <p className="mt-1 text-sm text-[#777]">{t('subtitle')}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[#777] transition-colors hover:bg-black/5 hover:text-[#0d0d0d]">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white custom-scrollbar">
          {assets.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-[#777]">
              <ImageOff className="mb-4 size-10 opacity-30" strokeWidth={1.9} />
              <p className="text-sm">{t('empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {assets.map(item => (
                <button
                  key={item.id}
                  onClick={() => { if (item.url) { onSelect(item.url); onClose(); } }}
                  className="group relative aspect-square overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-[#f4f4f4] text-left transition-all hover:border-[#b8b8b8] focus:outline-none focus:ring-4 focus:ring-black/10"
                >
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                  <div className="absolute bottom-0 left-0 right-0 translate-y-full border-t border-[#e5e5e5] bg-white/95 p-2 transition-transform duration-200 group-hover:translate-y-0">
                    <p className="truncate text-[11px] font-medium text-[#0d0d0d]">{item.type}</p>
                    <p className="truncate text-[11px] text-[#777]">{item.prompt}</p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 className="size-5 text-white drop-shadow-md" />
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
