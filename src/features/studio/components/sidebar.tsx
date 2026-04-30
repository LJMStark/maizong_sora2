"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth/client";
import { useTranslations } from "next-intl";
import { NAV_ITEMS } from "./shared/nav-config";
import { UserProfile } from "./shared/user-profile";
import { LoginDialog } from "./shared/login-dialog";
import { isAdmin } from "../utils/user-helpers";

export default function Sidebar() {
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
      <aside className="hidden h-full w-64 shrink-0 flex-col justify-between border-r border-[#e5e5e5] bg-[#f9f9f9] md:flex">
        <div className="flex flex-col">
          <div className="p-8 pb-10">
            <h1 className="flex items-center gap-2 text-[22px] font-medium tracking-normal text-[#0d0d0d]">
              {tCommon("name")}
            </h1>
            <p className="ml-1 mt-2 text-sm text-[#777]">
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
                      ? "bg-black/[0.03] text-[#0d0d0d]"
                      : "text-[#777] hover:bg-black/5 hover:text-[#0d0d0d]"
                  }`}
              >
                {isActive(item.path) && (
                  <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-[#0d0d0d]" />
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

          {!isPending && isAdmin(session?.user) && (
            <div className="mt-2 border-t border-[#e5e5e5] pt-2">
              <Link
                href="/studio/admin"
                className={`flex items-center gap-4 px-8 py-4 transition-all duration-200 group relative
                  ${
                    isActive("/studio/admin")
                      ? "bg-black/[0.03] text-[#0d0d0d]"
                      : "text-[#777] hover:bg-black/5 hover:text-[#0d0d0d]"
                  }`}
              >
                {isActive("/studio/admin") && (
                  <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-[#0d0d0d]" />
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

        <div className="border-t border-[#e5e5e5] p-8">
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
}
