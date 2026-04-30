"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  Grid2X2,
  ImageIcon,
  Menu,
  Plus,
  Search,
  Settings,
  SquarePen,
  User,
  Video,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSession, signOut } from "@/lib/auth/client";
import { LoginDialog } from "./shared/login-dialog";
import { UserProfile } from "./shared/user-profile";
import { isAdmin } from "../utils/user-helpers";
import { cn } from "@/lib/utils";

type StudioMode = "image" | "video";

interface StudioSessionSummary {
  id: string;
  type: StudioMode;
  title: string;
  updatedAt: string;
}

const PRIMARY_NAV = [
  { href: "/studio", label: "图像", icon: ImageIcon, type: "image" as const },
  { href: "/studio/video", label: "视频", icon: Video, type: "video" as const },
  { href: "/studio/assets", label: "作品", icon: Grid2X2 },
  { href: "/studio/profile", label: "用户", icon: User },
  { href: "/studio/subscription", label: "订阅", icon: CreditCard },
];

function getMode(pathname: string): StudioMode | null {
  if (pathname === "/studio") return "image";
  if (pathname.startsWith("/studio/video")) return "video";
  return null;
}

function getSessionHref(mode: StudioMode, sessionId: string) {
  return mode === "image"
    ? `/studio?session=${sessionId}`
    : `/studio/video?session=${sessionId}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = getMode(pathname);
  const activeSessionId = searchParams.get("session");
  const { data: session, isPending } = useSession();
  const [sessions, setSessions] = useState<StudioSessionSummary[]>([]);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!mode || !session?.user) {
      setSessions([]);
      return;
    }

    const params = new URLSearchParams({ type: mode });
    if (search.trim()) params.set("search", search.trim());

    const response = await fetch(`/api/studio/sessions?${params.toString()}`);
    if (!response.ok) {
      setSessions([]);
      return;
    }

    const data = await response.json();
    setSessions(data.sessions ?? []);
  }, [mode, search, session?.user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const handler = () => void loadSessions();
    window.addEventListener("studio:sessions-changed", handler);
    return () => window.removeEventListener("studio:sessions-changed", handler);
  }, [loadSessions]);

  const newHref = useMemo(() => {
    if (mode === "video") return "/studio/video";
    return "/studio";
  }, [mode]);

  const handleNew = () => {
    router.push(newHref);
    setMobileOpen(false);
    window.dispatchEvent(new CustomEvent("studio:new-session"));
  };

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[#f7f7f8] text-[#171717]">
      <div className="flex h-14 items-center px-3">
        <Link
          href="/studio"
          className="flex size-9 items-center justify-center rounded-lg hover:bg-black/5"
          onClick={() => setMobileOpen(false)}
          aria-label="Little Elephant Studio"
        >
          <span className="text-lg font-semibold">LE</span>
        </Link>
      </div>

      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={handleNew}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-black/5"
        >
          <SquarePen className="size-5" />
          <span>{mode === "video" ? "新建视频" : "新建图像"}</span>
        </button>
        <div className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#4f4f4f]">
          <Search className="size-5" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索历史"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#7b7b7b]"
          />
        </div>
      </div>

      <nav className="px-2">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/studio"
              ? pathname === "/studio"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-black/5",
                active && "bg-[#e9e9e9]"
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {!isPending && isAdmin(session?.user) && (
          <Link
            href="/studio/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-black/5",
              pathname.startsWith("/studio/admin") && "bg-[#e9e9e9]"
            )}
          >
            <Settings className="size-5" />
            <span>管理</span>
          </Link>
        )}
      </nav>

      <div className="mt-4 flex-1 overflow-y-auto px-2 pb-3">
        {mode && (
          <>
            <p className="px-3 pb-2 text-xs text-[#8a8a8a]">历史</p>
            <div className="space-y-1">
              {sessions.map((item) => (
                <Link
                  key={item.id}
                  href={getSessionHref(item.type, item.id)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded-xl px-3 py-2 text-sm hover:bg-black/5",
                    activeSessionId === item.id && "bg-[#e9e9e9]"
                  )}
                >
                  <span className="block truncate">{item.title}</span>
                  <span className="mt-1 block text-xs text-[#8a8a8a]">
                    {formatDate(item.updatedAt)}
                  </span>
                </Link>
              ))}
              {sessions.length === 0 && (
                <div className="px-3 py-4 text-sm text-[#8a8a8a]">
                  暂无历史记录
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-black/5 p-3">
        <Link
          href="/studio/subscription"
          onClick={() => setMobileOpen(false)}
          className="mb-3 flex items-center justify-between rounded-full border border-black/10 bg-white px-3 py-2 text-sm hover:bg-[#f1f1f1]"
        >
          <span>积分与订阅</span>
          <Plus className="size-4" />
        </Link>
        <UserProfile
          user={session?.user ?? null}
          isPending={isPending}
          onSignOut={handleSignOut}
          onLoginClick={() => setLoginOpen(true)}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-white text-[#171717]">
        <aside className="hidden w-[280px] shrink-0 border-r border-black/10 md:block">
          {sidebar}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 px-3 md:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex size-9 items-center justify-center rounded-lg hover:bg-black/5 md:hidden"
                aria-label="打开菜单"
              >
                <Menu className="size-5" />
              </button>
              <Link href={mode === "video" ? "/studio/video" : "/studio"} className="text-lg font-medium">
                Little Elephant
              </Link>
            </div>
            {session?.user ? (
              <Link
                href="/studio/subscription"
                className="rounded-full bg-[#f0edff] px-4 py-2 text-sm font-medium text-[#5b4db7] hover:bg-[#e8e3ff]"
              >
                积分
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="rounded-full bg-[#f0edff] px-4 py-2 text-sm font-medium text-[#5b4db7] hover:bg-[#e8e3ff]"
              >
                登录
              </button>
            )}
          </header>
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[300px] p-0">
          <SheetTitle className="sr-only">Studio 导航</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
