"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const t = useTranslations('studio.nav');
  const tCommon = useTranslations('common.app');
  const tAuth = useTranslations('auth.signin');

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { path: '/studio', icon: 'image', label: t('imageWorkshop') },
    { path: '/studio/video', icon: 'video_camera_back', label: t('videoWorkshop') },
    { path: '/studio/assets', icon: 'grid_view', label: t('collections') },
    { path: '/studio/subscription', icon: 'payments', label: t('subscription') },
  ];

  const handleNavigation = (path: string) => {
    setLoginDialogOpen(false);
    router.push(path);
  };

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="w-64 border-r border-[#e5e5e1] bg-white flex flex-col justify-between shrink-0 h-full">
      <div className="flex flex-col">
        <div className="p-8 pb-10">
          <h1 className="font-serif text-2xl tracking-tight text-[#1a1a1a] flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl">filter_vintage</span>
            {tCommon('name')}
          </h1>
          <p className="text-[10px] font-medium tracking-[0.2em] text-[#6b7280] uppercase mt-2 ml-1">{tCommon('description')}</p>
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
        {isPending ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#e5e5e1] animate-pulse" />
            <div className="flex flex-col gap-1">
              <div className="h-3 w-20 bg-[#e5e5e1] rounded animate-pulse" />
              <div className="h-2 w-14 bg-[#e5e5e1] rounded animate-pulse" />
            </div>
          </div>
        ) : session?.user ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-[10px] font-medium tracking-widest">
              {getInitials(session.user.name || 'U')}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#1a1a1a] truncate">{session.user.name}</p>
              <button
                onClick={handleSignOut}
                className="text-[10px] text-[#6b7280] uppercase tracking-tighter text-left hover:text-[#1a1a1a] transition-colors"
              >
                {tAuth('signOut') || '退出登录'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setLoginDialogOpen(true)}
            className="flex items-center gap-3 w-full group"
          >
            <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#e5e5e1] text-[#6b7280] flex items-center justify-center group-hover:border-[#1a1a1a] group-hover:text-[#1a1a1a] transition-colors">
              <span className="material-symbols-outlined text-lg">person</span>
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-semibold text-[#1a1a1a]">{tAuth('title')}</p>
              <p className="text-[10px] text-[#6b7280] uppercase tracking-tighter">{tAuth('getStarted')}</p>
            </div>
          </button>
        )}
      </div>

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="sm:max-w-md border-[#e5e5e1] bg-white">
          <DialogHeader className="text-center sm:text-center">
            <div className="flex justify-center mb-4">
              <span className="material-symbols-outlined text-5xl text-[#1a1a1a]">filter_vintage</span>
            </div>
            <DialogTitle className="font-serif text-2xl text-[#1a1a1a]">
              {tAuth('welcomeDialog.title')}
            </DialogTitle>
            <DialogDescription className="text-[#6b7280]">
              {tAuth('welcomeDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={() => handleNavigation('/signin')}
              className="w-full bg-[#1a1a1a] hover:bg-[#2d3436] text-white py-6"
            >
              <span className="material-symbols-outlined mr-2">mail</span>
              {tAuth('signInWithEmail')}
            </Button>
            <Button
              onClick={() => handleNavigation('/signup')}
              variant="outline"
              className="w-full border-[#e5e5e1] hover:bg-[#faf9f6] text-[#1a1a1a] py-6"
            >
              <span className="material-symbols-outlined mr-2">person_add</span>
              {useTranslations('auth.signup')('submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
};

export default Sidebar;
