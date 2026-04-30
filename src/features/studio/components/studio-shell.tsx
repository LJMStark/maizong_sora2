"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  CircleDashed,
  Code2,
  FolderPlus,
  Grid2X2,
  ImageIcon,
  Menu,
  PanelLeft,
  Search,
  Settings,
  Sparkles,
  SquarePen,
  UserPlus,
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

const APP_NAV = [
  { href: "/studio", label: "Images", icon: ImageIcon },
  { href: "/studio/assets", label: "Apps", icon: Grid2X2 },
  { href: "/studio/video", label: "Codex", icon: Code2 },
  { href: "/studio/profile", label: "Projects", icon: FolderPlus },
];

const FALLBACK_CHATS = [
  "Plushie Style Transformation",
  "Best Matcha Latte Recipe",
  "Example chat: Ask anything",
  "Example chat: Easy uploads",
  "Example chat: Picture this",
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
  return new Intl.DateTimeFormat("en-US", {
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

  if (pathname.startsWith("/studio/subscription")) {
    return <>{children}</>;
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#f9f9f9] text-[#0d0d0d]">
      <div className="flex h-[70px] items-center justify-between px-5">
        <Link
          href="/studio"
          className="flex size-8 items-center justify-center rounded-lg hover:bg-black/5"
          onClick={() => setMobileOpen(false)}
          aria-label="ChatGPT"
        >
          <img
            src="/chatgpt-clone/openai-mark.png"
            alt=""
            className="size-8 object-contain"
          />
        </Link>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-[#5f5f5f] hover:bg-black/5"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="size-5" />
        </button>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={handleNew}
          className="flex h-11 w-full items-center gap-3 rounded-lg px-2 text-[17px] hover:bg-black/5"
        >
          <SquarePen className="size-5" strokeWidth={1.9} />
          <span>New chat</span>
        </button>
        <div className="flex h-11 items-center gap-3 rounded-lg px-2 text-[17px] text-[#0d0d0d] hover:bg-black/5">
          <Search className="size-5" strokeWidth={1.9} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#0d0d0d]"
          />
        </div>
      </div>

      <nav className="mt-2 px-3">
        {APP_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/studio"
              ? pathname === "/studio"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-2 text-[17px] hover:bg-black/5",
                active && "bg-black/[0.03]"
              )}
            >
              <Icon className="size-5" strokeWidth={1.9} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {!isPending && isAdmin(session?.user) && (
          <Link
            href="/studio/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-2 text-[17px] hover:bg-black/5",
              pathname.startsWith("/studio/admin") && "bg-black/[0.03]"
            )}
          >
            <Settings className="size-5" strokeWidth={1.9} />
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <div className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
        {mode && (
          <>
            <p className="px-2 pb-3 text-[16px] leading-5 text-[#8a8a8a]">
              Your chats
            </p>
            <div className="space-y-1">
              {sessions.length > 0
                ? sessions.map((item) => (
                    <Link
                      key={item.id}
                      href={getSessionHref(item.type, item.id)}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "block rounded-lg px-2 py-2 text-[17px] leading-6 hover:bg-black/5",
                        activeSessionId === item.id && "bg-black/[0.06]"
                      )}
                    >
                      <span className="block truncate">{item.title}</span>
                      <span className="mt-0.5 block text-[12px] leading-4 text-[#8a8a8a]">
                        {formatDate(item.updatedAt)}
                      </span>
                    </Link>
                  ))
                : FALLBACK_CHATS.map((title, index) => (
                    <Link
                      key={title}
                      href={index === 0 ? "/studio" : "/studio/video"}
                      onClick={() => setMobileOpen(false)}
                      className="flex h-11 items-center justify-between rounded-lg px-2 text-[16px] hover:bg-black/5"
                    >
                      <span className="truncate">{title}</span>
                      {index > 1 && <span className="size-2 rounded-full bg-[#0b7ad1]" />}
                    </Link>
                  ))}
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-5">
        <div className="mb-3 flex items-center gap-2">
          <Link
            href="/studio/subscription"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 flex-1 items-center justify-center rounded-full border border-black/15 bg-white px-4 text-[15px] hover:bg-[#f3f3f3]"
          >
            Upgrade
          </Link>
        </div>
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
      <div className="flex h-screen overflow-hidden bg-white text-[#0d0d0d]">
        <aside className="hidden w-[330px] shrink-0 border-r border-[#e5e5e5] md:block">
          {sidebar}
        </aside>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="relative flex h-[64px] shrink-0 items-center justify-between px-5">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex size-9 items-center justify-center rounded-lg hover:bg-black/5 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <Link
                href={mode === "video" ? "/studio/video" : "/studio"}
                className="flex min-w-0 items-center gap-1.5 text-[22px] font-medium leading-none"
              >
                <span className="truncate">ChatGPT</span>
                <ChevronDown className="mt-0.5 size-4 text-[#777]" />
              </Link>
            </div>

            <Link
              href="/studio/subscription"
              className="absolute left-1/2 top-3 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-[#f0edff] px-5 text-[16px] font-medium text-[#5941d2] hover:bg-[#e9e3ff]"
            >
              <Sparkles className="size-4 fill-current" />
              <span>Get Plus</span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                aria-label="Invite"
              >
                <UserPlus className="size-5" strokeWidth={1.9} />
              </button>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full hover:bg-black/5"
                aria-label="Account"
                onClick={() => setLoginOpen(true)}
              >
                <CircleDashed className="size-6" strokeWidth={1.8} />
              </button>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[330px] p-0">
          <SheetTitle className="sr-only">Studio navigation</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
