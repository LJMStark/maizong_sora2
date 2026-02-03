"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { path: '/studio', icon: 'image', label: 'Image Workshop' },
    { path: '/studio/video', icon: 'video_camera_back', label: 'Video Workshop' },
    { path: '/studio/assets', icon: 'grid_view', label: 'Collections' },
    { path: '/studio/subscription', icon: 'payments', label: 'Subscription' },
  ];

  return (
    <aside className="w-64 border-r border-[#e5e5e1] bg-white flex flex-col justify-between shrink-0 h-full">
      <div className="flex flex-col">
        <div className="p-8 pb-10">
          <h1 className="font-serif text-2xl tracking-tight text-[#1a1a1a] flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl">filter_vintage</span>
            Little Elephant
          </h1>
          <p className="text-[10px] font-medium tracking-[0.2em] text-[#6b7280] uppercase mt-2 ml-1">E-Commerce Studio</p>
        </div>
        <nav className="flex flex-col">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-4 px-8 py-4 transition-all duration-200 group relative
                ${isActive(item.path)
                  ? 'text-[#1a1a1a] bg-[#faf9f6]'
                  : 'text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#faf9f6]/50'
                }`}
            >
              {isActive(item.path) && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#1a1a1a]" />
              )}
              <span className={`material-symbols-outlined text-xl ${isActive(item.path) ? 'font-medium' : 'font-light'}`}>
                {item.icon}
              </span>
              <p className="text-sm font-medium tracking-tight">{item.label}</p>
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-8 border-t border-[#e5e5e1]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-[10px] font-medium tracking-widest">
            AS
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-xs font-semibold text-[#1a1a1a] truncate">Alex Seller</p>
            <p className="text-[10px] text-[#6b7280] uppercase tracking-tighter">Pro Partner</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
