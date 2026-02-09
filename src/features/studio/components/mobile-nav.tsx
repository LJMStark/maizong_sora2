"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth/client";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NAV_ITEMS } from "./shared/nav-config";
import { UserProfile } from "./shared/user-profile";
import { LoginDialog } from "./shared/login-dialog";
import { getInitials } from "../utils/user-helpers";

const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("studio.nav");
  const tCommon = useTranslations("common.app");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleNavigation = (path: string) => {
    setSheetOpen(false);
    router.push(path);
  };

  const handleSignOut = async () => {
    await signOut();
    setSheetOpen(false);
    router.refresh();
  };

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#e5e5e1] sticky top-0 z-40">
        <Link href="/studio" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl">
            filter_vintage
          </span>
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
          {mounted ? (
            <>
              <button
                onClick={() => setSheetOpen(true)}
                className="p-2 hover:bg-[#faf9f6] rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="left" className="w-[280px] p-0 bg-white">
              <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-[#e5e5e1]">
                  <h1 className="font-serif text-xl tracking-tight text-[#1a1a1a] flex items-center gap-2">
                    <span className="material-symbols-outlined text-2xl">
                      filter_vintage
                    </span>
                    {tCommon("name")}
                  </h1>
                  <p className="text-xs font-medium tracking-[0.15em] text-[#4b5563] uppercase mt-1">
                    {tCommon("description")}
                  </p>
                </div>

                <nav className="flex-1 py-4">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`flex items-center gap-4 px-6 py-4 w-full transition-all relative
                        ${
                          isActive(item.path)
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
                      <span className="text-sm font-medium">
                        {t(item.labelKey)}
                      </span>
                    </button>
                  ))}
                </nav>

                {!isPending && (session?.user as Record<string, unknown>)?.role === "admin" && (
                  <div className="border-t border-[#e5e5e1] py-2">
                    <button
                      onClick={() => handleNavigation("/studio/admin")}
                      className={`flex items-center gap-4 px-6 py-4 w-full transition-all relative
                        ${
                          isActive("/studio/admin")
                            ? "text-[#1a1a1a] bg-[#faf9f6]"
                            : "text-[#4b5563] hover:text-[#1a1a1a] hover:bg-[#faf9f6]/50"
                        }`}
                    >
                      {isActive("/studio/admin") && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#1a1a1a]" />
                      )}
                      <span className="material-symbols-outlined text-xl">
                        admin_panel_settings
                      </span>
                      <span className="text-sm font-medium">
                        管理后台
                      </span>
                    </button>
                  </div>
                )}

                <div className="p-6 border-t border-[#e5e5e1]">
                  <UserProfile
                    user={session?.user ?? null}
                    isPending={isPending}
                    onSignOut={handleSignOut}
                    onLoginClick={() => {
                      setSheetOpen(false);
                      setLoginDialogOpen(true);
                    }}
                  />
                </div>
              </div>
            </SheetContent>
              </Sheet>
            </>
          ) : (
            <button className="p-2 hover:bg-[#faf9f6] rounded-lg transition-colors">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
          )}
        </div>
      </header>

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </>
  );
};

export default MobileNav;
