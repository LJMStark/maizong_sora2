"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth/client";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const t = useTranslations("studio.nav");
  const tCommon = useTranslations("common.app");
  const tAuth = useTranslations("auth.signin");

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { path: "/studio", icon: "image", label: t("imageWorkshop") },
    { path: "/studio/video", icon: "video_camera_back", label: t("videoWorkshop") },
    { path: "/studio/assets", icon: "grid_view", label: t("collections") },
    { path: "/studio/subscription", icon: "payments", label: t("subscription") },
  ];

  const handleNavigation = (path: string) => {
    setSheetOpen(false);
    setLoginDialogOpen(false);
    router.push(path);
  };

  const handleSignOut = async () => {
    await signOut();
    setSheetOpen(false);
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#e5e5e1] sticky top-0 z-40">
        <Link href="/studio" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl">filter_vintage</span>
          <span className="font-serif text-lg tracking-tight text-[#1a1a1a]">
            {tCommon("name")}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {!isPending && session?.user && (
            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-xs font-medium">
              {getInitials(session.user.name || "U")}
            </div>
          )}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="p-2 hover:bg-[#faf9f6] rounded-lg transition-colors">
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-white">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-[#e5e5e1]">
                  <h1 className="font-serif text-xl tracking-tight text-[#1a1a1a] flex items-center gap-2">
                    <span className="material-symbols-outlined text-2xl">filter_vintage</span>
                    {tCommon("name")}
                  </h1>
                  <p className="text-xs font-medium tracking-[0.15em] text-[#4b5563] uppercase mt-1">
                    {tCommon("description")}
                  </p>
                </div>

                <nav className="flex-1 py-4">
                  {navItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`flex items-center gap-4 px-6 py-4 w-full transition-all relative
                        ${isActive(item.path)
                          ? "text-[#1a1a1a] bg-[#faf9f6]"
                          : "text-[#4b5563] hover:text-[#1a1a1a] hover:bg-[#faf9f6]/50"
                        }`}
                    >
                      {isActive(item.path) && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#1a1a1a]" />
                      )}
                      <span className="material-symbols-outlined text-xl">
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>

                <div className="p-6 border-t border-[#e5e5e1]">
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
                      <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-xs font-medium">
                        {getInitials(session.user.name || "U")}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1a1a1a] truncate">
                          {session.user.name}
                        </p>
                        <button
                          onClick={handleSignOut}
                          className="text-xs text-[#4b5563] uppercase tracking-tighter text-left hover:text-[#1a1a1a] transition-colors"
                        >
                          {tAuth("signOut") || "退出登录"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSheetOpen(false);
                        setLoginDialogOpen(true);
                      }}
                      className="flex items-center gap-3 w-full group"
                    >
                      <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#e5e5e1] text-[#4b5563] flex items-center justify-center group-hover:border-[#1a1a1a] group-hover:text-[#1a1a1a] transition-colors">
                        <span className="material-symbols-outlined text-lg">person</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-xs font-semibold text-[#1a1a1a]">{tAuth("title")}</p>
                        <p className="text-xs text-[#4b5563] uppercase tracking-tighter">
                          {tAuth("getStarted")}
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="sm:max-w-md border-[#e5e5e1] bg-white">
          <DialogHeader className="text-center sm:text-center">
            <div className="flex justify-center mb-4">
              <span className="material-symbols-outlined text-5xl text-[#1a1a1a]">
                filter_vintage
              </span>
            </div>
            <DialogTitle className="font-serif text-2xl text-[#1a1a1a]">
              {tAuth("welcomeDialog.title")}
            </DialogTitle>
            <DialogDescription className="text-[#6b7280]">
              {tAuth("welcomeDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={() => handleNavigation("/signin")}
              className="w-full bg-[#1a1a1a] hover:bg-[#2d3436] text-white py-6"
            >
              <span className="material-symbols-outlined mr-2">mail</span>
              {tAuth("signInWithEmail")}
            </Button>
            <Button
              onClick={() => handleNavigation("/signup")}
              variant="outline"
              className="w-full border-[#e5e5e1] hover:bg-[#faf9f6] text-[#1a1a1a] py-6"
            >
              <span className="material-symbols-outlined mr-2">person_add</span>
              创建账号
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MobileNav;
