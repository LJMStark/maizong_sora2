"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth/client";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NAV_ITEMS } from "./shared/nav-config";
import { UserProfile } from "./shared/user-profile";
import { LoginDialog } from "./shared/login-dialog";
import { getInitials, isAdmin } from "../utils/user-helpers";

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const t = useTranslations("studio.nav");
  const tCommon = useTranslations("common.app");

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
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#e5e5e5] bg-white px-4 py-3 md:hidden">
        <Link href="/studio" className="flex items-center gap-2">
          <span className="text-lg font-medium tracking-normal text-[#0d0d0d]">
            {tCommon("name")}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {!isPending && session?.user && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d0d0d] text-xs font-medium text-white">
              {getInitials(session.user.name || "U")}
            </div>
          )}
          <button
            onClick={() => setSheetOpen(true)}
            className="rounded-lg p-2 transition-colors hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="left" className="w-[280px] bg-white p-0">
              <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="border-b border-[#e5e5e5] p-6">
                  <h1 className="flex items-center gap-2 text-xl font-medium tracking-normal text-[#0d0d0d]">
                    {tCommon("name")}
                  </h1>
                  <p className="mt-1 text-sm text-[#777]">
                    {tCommon("description")}
                  </p>
                </div>

                <nav className="flex-1 py-4">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`relative flex w-full items-center gap-4 px-6 py-4 transition-all
                        ${
                          isActive(item.path)
                            ? "bg-black/[0.03] text-[#0d0d0d]"
                            : "text-[#777] hover:bg-black/5 hover:text-[#0d0d0d]"
                        }`}
                    >
                      {isActive(item.path) && (
                        <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-[#0d0d0d]" />
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

                {!isPending && isAdmin(session?.user) && (
                  <div className="border-t border-[#e5e5e5] py-2">
                    <button
                      onClick={() => handleNavigation("/studio/admin")}
                      className={`relative flex w-full items-center gap-4 px-6 py-4 transition-all
                        ${
                          isActive("/studio/admin")
                            ? "bg-black/[0.03] text-[#0d0d0d]"
                            : "text-[#777] hover:bg-black/5 hover:text-[#0d0d0d]"
                        }`}
                    >
                      {isActive("/studio/admin") && (
                        <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-[#0d0d0d]" />
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

                <div className="border-t border-[#e5e5e5] p-6">
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
        </div>
      </header>

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </>
  );
}
