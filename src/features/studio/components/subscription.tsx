"use client";

import React from 'react';

const Subscription: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#faf9f6] py-20 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h1 className="font-serif text-5xl md:text-6xl mb-6 font-normal tracking-tight text-[#1a1a1a]">Investment Plans</h1>
          <p className="text-[#6b7280] text-lg max-w-xl mx-auto font-light leading-relaxed">Refined generation tools for the modern e-commerce aesthetic.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#e5e5e1] bg-white shadow-sm">
          {/* Basic */}
          <div className="p-12 border-r border-[#e5e5e1] flex flex-col">
            <div className="mb-12">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7280] block mb-4">Entry</span>
              <h3 className="font-serif text-3xl mb-4 italic text-[#1a1a1a]">Basic</h3>
              <div className="flex items-baseline">
                <span className="text-4xl font-light text-[#1a1a1a]">$0</span>
                <span className="text-[#6b7280] text-sm ml-2">/mo</span>
              </div>
            </div>
            <ul className="space-y-5 mb-12 flex-1">
              {['10 Monthly Credits', 'Standard Quality', 'Public Gallery'].map(feat => (
                <li key={feat} className="flex items-center gap-4 text-sm font-light text-[#1a1a1a]">
                  <span className="material-symbols-outlined text-[#6b7280] text-lg">check</span>
                  {feat}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 px-6 border border-[#e5e5e1] text-[#6b7280] text-[12px] font-bold uppercase tracking-widest cursor-default">Current Plan</button>
          </div>

          {/* Pro */}
          <div className="p-12 border-r border-[#e5e5e1] flex flex-col bg-[#faf9f6] relative">
            <div className="absolute top-8 right-12">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 border border-[#8C7355] text-[#8C7355] rounded-full">Selected Choice</span>
            </div>
            <div className="mb-12">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7280] block mb-4">Growth</span>
              <h3 className="font-serif text-3xl mb-4 italic text-[#1a1a1a]">Professional</h3>
              <div className="flex items-baseline">
                <span className="text-4xl font-light text-[#1a1a1a]">$49</span>
                <span className="text-[#6b7280] text-sm ml-2">/mo</span>
              </div>
            </div>
            <ul className="space-y-5 mb-12 flex-1">
              {['500 Monthly Credits', '4K Ultra HD', 'Private Gallery', 'Priority Queue'].map(feat => (
                <li key={feat} className="flex items-center gap-4 text-sm font-light text-[#1a1a1a]">
                  <span className="material-symbols-outlined text-[#1a1a1a] text-lg">check</span>
                  {feat}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 px-6 bg-[#1a1a1a] text-white text-[12px] font-bold uppercase tracking-widest hover:bg-[#2d3436] transition-colors shadow-lg">Upgrade to Pro</button>
          </div>

          {/* Enterprise */}
          <div className="p-12 flex flex-col">
            <div className="mb-12">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7280] block mb-4">Scale</span>
              <h3 className="font-serif text-3xl mb-4 italic text-[#1a1a1a]">Enterprise</h3>
              <div className="flex items-baseline">
                <span className="text-4xl font-light text-[#1a1a1a]">$199</span>
                <span className="text-[#6b7280] text-sm ml-2">/mo</span>
              </div>
            </div>
            <ul className="space-y-5 mb-12 flex-1">
              {['2,500 Monthly Credits', 'Unlimited Storage', 'White-label Delivery', 'API Access'].map(feat => (
                <li key={feat} className="flex items-center gap-4 text-sm font-light text-[#1a1a1a]">
                  <span className="material-symbols-outlined text-[#6b7280] text-lg">check</span>
                  {feat}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 px-6 border border-[#1a1a1a] text-[#1a1a1a] text-[12px] font-bold uppercase tracking-widest hover:bg-[#faf9f6] transition-colors">Contact Sales</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
