"use client";

import React from 'react';

import { useTranslations } from 'next-intl';
 
 const Subscription: React.FC = () => {
   const t = useTranslations('studio.subscription');
  return (
    <div className="flex-1 overflow-y-auto bg-[#faf9f6] py-20 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h1 className="font-serif text-5xl md:text-6xl mb-6 font-normal tracking-tight text-[#1a1a1a]">{t('title')}</h1>
          <p className="text-[#6b7280] text-lg max-w-xl mx-auto font-light leading-relaxed">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#e5e5e1] bg-white shadow-sm">
          {/* Basic */}
          <div className="p-12 border-r border-[#e5e5e1] flex flex-col">
            <div className="mb-12">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7280] block mb-4">{t('plans.basic.eyebrow')}</span>
              <h3 className="font-serif text-3xl mb-4 italic text-[#1a1a1a]">{t('plans.basic.name')}</h3>
              <div className="flex items-baseline">
                <span className="text-4xl font-light text-[#1a1a1a]">$0</span>
                <span className="text-[#6b7280] text-sm ml-2">{t('period')}</span>
              </div>
            </div>
            <ul className="space-y-5 mb-12 flex-1">
              {[t('plans.basic.features.credits'), t('plans.basic.features.quality'), t('plans.basic.features.gallery')].map(feat => (
                <li key={feat} className="flex items-center gap-4 text-sm font-light text-[#1a1a1a]">
                  <span className="material-symbols-outlined text-[#6b7280] text-lg">check</span>
                  {feat}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 px-6 border border-[#e5e5e1] text-[#6b7280] text-[12px] font-bold uppercase tracking-widest cursor-default">{t('plans.basic.button')}</button>
          </div>

          {/* Pro */}
          <div className="p-12 border-r border-[#e5e5e1] flex flex-col bg-[#faf9f6] relative">
            <div className="absolute top-8 right-12">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 border border-[#8C7355] text-[#8C7355] rounded-full">{t('plans.pro.selected')}</span>
            </div>
            <div className="mb-12">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7280] block mb-4">{t('plans.pro.eyebrow')}</span>
              <h3 className="font-serif text-3xl mb-4 italic text-[#1a1a1a]">{t('plans.pro.name')}</h3>
              <div className="flex items-baseline">
                <span className="text-4xl font-light text-[#1a1a1a]">$49</span>
                <span className="text-[#6b7280] text-sm ml-2">{t('period')}</span>
              </div>
            </div>
            <ul className="space-y-5 mb-12 flex-1">
              {[
                t('plans.pro.features.credits'),
                t('plans.pro.features.quality'),
                t('plans.pro.features.gallery'),
                t('plans.pro.features.priority')
              ].map(feat => (
                <li key={feat} className="flex items-center gap-4 text-sm font-light text-[#1a1a1a]">
                  <span className="material-symbols-outlined text-[#1a1a1a] text-lg">check</span>
                  {feat}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 px-6 bg-[#1a1a1a] text-white text-[12px] font-bold uppercase tracking-widest hover:bg-[#2d3436] transition-colors shadow-lg">{t('plans.pro.button')}</button>
          </div>

          {/* Enterprise */}
          <div className="p-12 flex flex-col">
            <div className="mb-12">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7280] block mb-4">{t('plans.enterprise.eyebrow')}</span>
              <h3 className="font-serif text-3xl mb-4 italic text-[#1a1a1a]">{t('plans.enterprise.name')}</h3>
              <div className="flex items-baseline">
                <span className="text-4xl font-light text-[#1a1a1a]">$199</span>
                <span className="text-[#6b7280] text-sm ml-2">{t('period')}</span>
              </div>
            </div>
            <ul className="space-y-5 mb-12 flex-1">
              {[
                t('plans.enterprise.features.credits'),
                t('plans.enterprise.features.storage'),
                t('plans.enterprise.features.whitelabel'),
                t('plans.enterprise.features.api')
              ].map(feat => (
                <li key={feat} className="flex items-center gap-4 text-sm font-light text-[#1a1a1a]">
                  <span className="material-symbols-outlined text-[#6b7280] text-lg">check</span>
                  {feat}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 px-6 border border-[#1a1a1a] text-[#1a1a1a] text-[12px] font-bold uppercase tracking-widest hover:bg-[#faf9f6] transition-colors">{t('plans.enterprise.button')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
