"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth/client";
import { useTranslations } from "next-intl";
import { NAV_ITEMS } from "./shared/nav-config";
import { UserProfile } from "./shared/user-profile";
import { LoginDialog } from "./shared/login-dialog";

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const t = useTranslations("studio.nav");
  const tCommon = useTranslations("common.app");

  const isActive = (path: string) => pathname === path;

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  return (
    <>
      <aside className="hidden md:flex w-64 border-r border-[#e5e5e1] bg-white flex-col justify-between shrink-0 h-full">
        <div className="flex flex-col">
          <div className="p-8 pb-10">
            <h1 className="font-serif text-2xl tracking-tight text-[#1a1a1a] flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl">
                filter_vintage
              </span>
              {tCommon("name")}
            </h1>
            <p className="text-xs font-medium tracking-[0.2em] text-[#4b5563] uppercase mt-2 ml-1">
              {tCommon("description")}
            </p>
          </div>
          <nav className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-4 px-8 py-4 transition-all duration-200 group relative
                  ${
                    isActive(item.path)
                      ? "text-[#1a1a1a] bg-[#faf9f6]"
                      : "text-[#4b5563] hover:text-[#1a1a1a] hover:bg-[#faf9f6]/50"
                  }`}
              >
                {isActive(item.path) && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#1a1a1a]" />
                )}
                <span
                  className={`material-symbols-outlined text-2xl ${isActive(item.path) ? "font-medium" : "font-normal"}`}
                >
                  {item.icon}
                </span>
                <p className="text-base font-medium tracking-tight">
                  {t(item.labelKey)}
                </p>
              </Link>
            ))}
          </nav>

          {!isPending && (session?.user as Record<string, unknown>)?.role === "admin" && (
            <div className="mt-2 border-t border-[#e5e5e1] pt-2">
              <Link
                href="/studio/admin"
                className={`flex items-center gap-4 px-8 py-4 transition-all duration-200 group relative
                  ${
                    isActive("/studio/admin")
                      ? "text-[#1a1a1a] bg-[#faf9f6]"
                      : "text-[#4b5563] hover:text-[#1a1a1a] hover:bg-[#faf9f6]/50"
                  }`}
              >
                {isActive("/studio/admin") && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#1a1a1a]" />
                )}
                <span
                  className={`material-symbols-outlined text-2xl ${isActive("/studio/admin") ? "font-medium" : "font-normal"}`}
                >
                  admin_panel_settings
                </span>
                <p className="text-base font-medium tracking-tight">
                  管理后台
                </p>
              </Link>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-[#e5e5e1]">
          <UserProfile
            user={session?.user ?? null}
            isPending={isPending}
            onSignOut={handleSignOut}
            onLoginClick={() => setLoginDialogOpen(true)}
          />
        </div>
      </aside>

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </>
  );
};

export default Sidebar;
