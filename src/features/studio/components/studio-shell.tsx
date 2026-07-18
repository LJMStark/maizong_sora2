"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  CircleHelp,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Grid2X2,
  ImageIcon,
  Keyboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Palette,
  PanelLeft,
  Pencil,
  Search,
  Settings,
  Sparkles,
  SquarePen,
  Trash2,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSession, useSession, signOut } from "@/lib/auth/client";
import { CustomizeElephantDialog } from "./shared/customize-elephant-dialog";
import { HelpDialog } from "./shared/help-dialog";
import { KeyboardShortcutsDialog } from "./shared/keyboard-shortcuts-dialog";
import { LoginDialog } from "./shared/login-dialog";
import { SettingsDialog } from "./shared/settings-dialog";
import { TeamInviteDialog } from "./shared/team-invite-dialog";
import { UserProfile } from "./shared/user-profile";
import { getInitials, isAdmin } from "../utils/user-helpers";
import { cn } from "@/lib/utils";
import { APP_BRAND } from "@/lib/brand";
import { formatShortDate } from "@/lib/format";
import { copyTextToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { useHydrated } from "../hooks/use-hydrated";
import { useDismissableMenu } from "../hooks/use-dismissable-menu";
import {
  dispatchStudioEvent,
  notifySessionsChanged,
  STUDIO_FOCUS_COMPOSER_EVENT,
  STUDIO_MODAL_OPENED_EVENT,
  STUDIO_NEW_SESSION_EVENT,
  STUDIO_OPEN_LOGIN_EVENT,
  STUDIO_SESSIONS_CHANGED_EVENT,
} from "../utils/studio-events";
import {
  applyStudioAppearance,
  getAppearancePreferenceFromEvent,
  getBooleanPreferenceFromEvent,
  readAppearancePreference,
  readBooleanPreference,
  STUDIO_HISTORY_ENABLED_KEY,
  STUDIO_PREFERENCES_CHANGED_EVENT,
  writeBooleanPreference,
} from "../utils/studio-preferences";

type StudioMode = "image" | "video";
type AccountMenuPlacement = "header" | "sidebar" | "rail";

interface StudioSessionSummary {
  id: string;
  type: StudioMode;
  title: string;
  updatedAt: string;
}

type StudioSessionUser = NonNullable<ReturnType<typeof useSession>["data"]>["user"];

function getUserFromAuthResult(result: unknown): StudioSessionUser | null {
  const candidate = result as
    | { data?: { user?: StudioSessionUser | null } | null; user?: StudioSessionUser | null }
    | null
    | undefined;

  return candidate?.data?.user ?? candidate?.user ?? null;
}

const APP_NAV = [
  { href: "/studio", label: "图像创作", icon: ImageIcon },
  { href: "/studio/video", label: "视频创作", icon: Video },
  { href: "/studio/assets", label: "作品库", icon: Grid2X2 },
  { href: "/studio/profile", label: "设置", icon: Settings },
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

function isNavActive(pathname: string, href: string) {
  return href === "/studio" ? pathname === "/studio" : pathname.startsWith(href);
}

function BrandMark() {
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-[#0d0d0d] text-[11px] font-semibold leading-none text-white">
      象
    </span>
  );
}

function AccountAvatar({
  label,
  image,
  pending,
}: {
  label: string;
  image?: string | null;
  pending?: boolean;
}) {
  if (pending) {
    return (
      <span className="flex size-8 items-center justify-center rounded-full border border-dashed border-[#8a8a8a]" />
    );
  }

  if (image) {
    return (
      <span
        className="size-8 rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url("${image.replace(/"/g, "%22")}")` }}
      />
    );
  }

  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-[#0d0d0d] text-xs font-medium leading-none text-white">
      {label}
    </span>
  );
}

export default function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = getMode(pathname);
  const activeSessionId = searchParams.get("session");
  const { data: session, isPending } = useSession();
  const [sessionFallbackUser, setSessionFallbackUser] =
    useState<StudioSessionUser | null>(null);
  const [sessions, setSessions] = useState<StudioSessionSummary[]>([]);
  const [search, setSearch] = useState("");
  // Deferred so typing stays responsive and session fetches coalesce instead of
  // firing one request per keystroke.
  const deferredSearch = useDeferredValue(search);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const hydrated = useHydrated();
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [titleMenuOpen, setTitleMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountMenuPlacement, setAccountMenuPlacement] =
    useState<AccountMenuPlacement | null>(null);
  const [sessionMenuId, setSessionMenuId] = useState<string | null>(null);
  const [renamingSession, setRenamingSession] =
    useState<StudioSessionSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deletingSession, setDeletingSession] =
    useState<StudioSessionSummary | null>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const titleMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const sidebarAccountMenuRef = useRef<HTMLDivElement>(null);
  const railAccountMenuRef = useRef<HTMLDivElement>(null);
  const sessionMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchOpenTimerRef = useRef<number | null>(null);
  const searchFocusTimerRef = useRef<number | null>(null);
  const helpDialogOpenTimerRef = useRef<number | null>(null);
  const sessionsRequestIdRef = useRef(0);
  const newHref = mode === "video" ? "/studio/video" : "/studio";
  const resolvedUser = session?.user ?? sessionFallbackUser;
  const canShowAdminLinks =
    hydrated && !isPending && isAdmin(resolvedUser);

  useEffect(() => {
    applyStudioAppearance(readAppearancePreference());
    setHistoryEnabled(readBooleanPreference(STUDIO_HISTORY_ENABLED_KEY, true));
  }, []);

  useEffect(() => {
    const handlePreferenceChange = (event: Event) => {
      const nextAppearance = getAppearancePreferenceFromEvent(event);
      if (nextAppearance !== null) {
        applyStudioAppearance(nextAppearance);
      }

      const nextHistoryEnabled = getBooleanPreferenceFromEvent(
        event,
        STUDIO_HISTORY_ENABLED_KEY
      );
      if (nextHistoryEnabled !== null) {
        setHistoryEnabled(nextHistoryEnabled);
      }
    };

    window.addEventListener(
      STUDIO_PREFERENCES_CHANGED_EVENT,
      handlePreferenceChange
    );
    return () => {
      window.removeEventListener(
        STUDIO_PREFERENCES_CHANGED_EVENT,
        handlePreferenceChange
      );
    };
  }, []);

  useEffect(() => {
    if (
      loginOpen ||
      settingsOpen ||
      customizeOpen ||
      helpDialogOpen ||
      shortcutsOpen ||
      inviteOpen ||
      searchOpen
    ) {
      dispatchStudioEvent(STUDIO_MODAL_OPENED_EVENT);
    }
  }, [
    customizeOpen,
    helpDialogOpen,
    inviteOpen,
    loginOpen,
    searchOpen,
    settingsOpen,
    shortcutsOpen,
  ]);

  useEffect(() => {
    setSessionFallbackUser(session?.user ?? null);
  }, [session?.user]);

  const resolveCurrentUser = useCallback(async () => {
    if (session?.user) return session.user;
    const latestSession = await getSession().catch(() => null);
    const latestUser = getUserFromAuthResult(latestSession);
    setSessionFallbackUser(latestUser);
    return latestUser;
  }, [session?.user]);

  const closeAllMenus = useCallback(() => {
    setTitleMenuOpen(false);
    setAccountMenuOpen(false);
    setAccountMenuPlacement(null);
    setSessionMenuId(null);
  }, []);

  // Closes the mobile sheet first (if open) and only then opens the target
  // dialog, so the sheet's own close animation isn't interrupted.
  const openAfterMobileClose = useCallback(
    (open: () => void, timerRef: React.MutableRefObject<number | null>) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (mobileOpen) {
        setMobileOpen(false);
        timerRef.current = window.setTimeout(() => {
          open();
          timerRef.current = null;
        }, 340);
        return;
      }

      setMobileOpen(false);
      open();
    },
    [mobileOpen]
  );

  const handleOpenSearch = useCallback(async () => {
    closeAllMenus();
    setHelpDialogOpen(false);
    await resolveCurrentUser();
    openAfterMobileClose(() => setSearchOpen(true), searchOpenTimerRef);
  }, [closeAllMenus, openAfterMobileClose, resolveCurrentUser]);

  useEffect(() => {
    return () => {
      if (searchOpenTimerRef.current) {
        window.clearTimeout(searchOpenTimerRef.current);
      }
      if (searchFocusTimerRef.current) {
        window.clearTimeout(searchFocusTimerRef.current);
      }
      if (helpDialogOpenTimerRef.current) {
        window.clearTimeout(helpDialogOpenTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    if (searchFocusTimerRef.current) {
      window.clearTimeout(searchFocusTimerRef.current);
    }

    searchFocusTimerRef.current = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchFocusTimerRef.current = null;
    }, 80);

    return () => {
      if (searchFocusTimerRef.current) {
        window.clearTimeout(searchFocusTimerRef.current);
        searchFocusTimerRef.current = null;
      }
    };
  }, [searchOpen]);

  const handleNew = useCallback(() => {
    router.push(newHref);
    setMobileOpen(false);
    setSearchOpen(false);
    setAccountMenuOpen(false);
    setAccountMenuPlacement(null);
    setHelpDialogOpen(false);
    setSearch("");
    dispatchStudioEvent(STUDIO_NEW_SESSION_EVENT);
    window.setTimeout(() => {
      dispatchStudioEvent(STUDIO_FOCUS_COMPOSER_EVENT);
    }, 0);
  }, [newHref, router]);

  const loadSessions = useCallback(async () => {
    const requestId = ++sessionsRequestIdRef.current;
    let userId = resolvedUser?.id;

    if (!userId) {
      const latestSession = await getSession().catch(() => null);
      const latestUser = getUserFromAuthResult(latestSession);
      setSessionFallbackUser(latestUser);
      userId = latestUser?.id;
    }

    if (!userId) {
      setSessions([]);
      return;
    }

    if (!historyEnabled) {
      setSessions([]);
      return;
    }

    const types: StudioMode[] = mode ? [mode] : ["image", "video"];
    const query = searchOpen ? deferredSearch.trim() : "";

    const results = await Promise.all(
      types.map(async (type) => {
        const params = new URLSearchParams({ type });
        if (query) params.set("search", query);

        const response = await fetch(`/api/studio/sessions?${params.toString()}`);
        if (!response.ok) return [];

        const data = await response.json();
        return data.sessions ?? [];
      })
    );

    if (sessionsRequestIdRef.current !== requestId) {
      return;
    }

    setSessions(
      results
        .flat()
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 50)
    );
  }, [historyEnabled, mode, resolvedUser?.id, deferredSearch, searchOpen]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const handler = () => void loadSessions();
    window.addEventListener(STUDIO_SESSIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(STUDIO_SESSIONS_CHANGED_EVENT, handler);
  }, [loadSessions]);

  useDismissableMenu(
    titleMenuOpen,
    () => titleMenuRef.current,
    () => setTitleMenuOpen(false)
  );

  useEffect(() => {
    const handleEscapeCapture = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setLoginOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        closeAllMenus();
        setMobileOpen(false);
        setCustomizeOpen(false);
        setHelpDialogOpen(false);
        setShortcutsOpen(false);
        setInviteOpen(false);
        if (!sessionActionLoading) {
          setRenamingSession(null);
          setRenameTitle("");
          setDeletingSession(null);
        }
        searchInputRef.current?.blur();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handleOpenSearch();
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "o"
      ) {
        event.preventDefault();
        handleNew();
        return;
      }

      if (!isEditing && event.key === "/") {
        event.preventDefault();
        dispatchStudioEvent(STUDIO_FOCUS_COMPOSER_EVENT);
      }
    };

    document.addEventListener("keydown", handleEscapeCapture, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleEscapeCapture, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeAllMenus, handleNew, handleOpenSearch, sessionActionLoading]);

  useEffect(() => {
    const handler = () => {
      setAccountMenuOpen(false);
      setAccountMenuPlacement(null);
      setMobileOpen(false);
      setLoginOpen(true);
    };

    window.addEventListener(STUDIO_OPEN_LOGIN_EVENT, handler);
    return () => window.removeEventListener(STUDIO_OPEN_LOGIN_EVENT, handler);
  }, []);

  const getActiveAccountMenuRef = useCallback(() => {
    if (accountMenuPlacement === "sidebar") {
      return sidebarAccountMenuRef;
    }
    if (accountMenuPlacement === "rail") {
      return railAccountMenuRef;
    }
    return accountMenuRef;
  }, [accountMenuPlacement]);

  const dismissAccountMenu = useCallback(() => {
    setAccountMenuOpen(false);
    setAccountMenuPlacement(null);
  }, []);

  useDismissableMenu(
    accountMenuOpen,
    () => getActiveAccountMenuRef().current,
    dismissAccountMenu
  );

  useDismissableMenu(
    Boolean(sessionMenuId),
    () => sessionMenuRef.current,
    () => setSessionMenuId(null)
  );

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    setAccountMenuPlacement(null);
    setHelpDialogOpen(false);
    setSettingsOpen(false);
    await signOut();
    router.refresh();
  };

  const handleNavigate = (href: string) => {
    closeAllMenus();
    setHelpDialogOpen(false);
    setMobileOpen(false);
    setSettingsOpen(false);
    setSearchOpen(false);
    setSearch("");
    router.push(href);
  };

  const handleOpenSettings = () => {
    closeAllMenus();
    setHelpDialogOpen(false);
    setMobileOpen(false);
    setSettingsOpen(true);
  };

  const handleOpenHelpDialog = () => {
    closeAllMenus();
    openAfterMobileClose(() => setHelpDialogOpen(true), helpDialogOpenTimerRef);
  };

  const handleOpenAccountMenu = (placement: AccountMenuPlacement) => {
    if (!resolvedUser) {
      setLoginOpen(true);
      return;
    }

    setTitleMenuOpen(false);
    setSessionMenuId(null);
    setAccountMenuPlacement(placement);
    setAccountMenuOpen((open) =>
      accountMenuPlacement === placement ? !open : true
    );
  };

  const handleShowShortcuts = () => {
    setAccountMenuOpen(false);
    setAccountMenuPlacement(null);
    setHelpDialogOpen(false);
    setShortcutsOpen(true);
  };

  const handleOpenInvite = () => {
    if (!resolvedUser) {
      setLoginOpen(true);
      return;
    }

    closeAllMenus();
    setHelpDialogOpen(false);
    setInviteOpen(true);
  };

  const handleCopySessionLink = async (href: string) => {
    const url = new URL(href, window.location.origin).toString();

    try {
      await copyTextToClipboard(url);
      toast.success("会话链接已复制");
    } catch {
      toast.error("复制失败，请手动复制地址栏链接");
    }

    setSessionMenuId(null);
  };

  const openRenameDialog = (item: StudioSessionSummary) => {
    setRenamingSession(item);
    setRenameTitle(item.title);
    setSessionMenuId(null);
  };

  const handleRenameSession = async () => {
    const title = renameTitle.trim();
    if (!renamingSession || !title) return;

    setSessionActionLoading(true);
    try {
      const response = await fetch(`/api/studio/sessions/${renamingSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "重命名失败");
      }

      setSessions((prev) =>
        prev.map((item) =>
          item.id === renamingSession.id
            ? {
                ...item,
                title: data.session?.title ?? title,
                updatedAt: data.session?.updatedAt ?? item.updatedAt,
              }
            : item
        )
      );
      window.requestAnimationFrame(() => {
        setRenamingSession(null);
        setRenameTitle("");
      });
      toast.success("会话已重命名");
      notifySessionsChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setSessionActionLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!deletingSession) return;

    setSessionActionLoading(true);
    try {
      const response = await fetch(`/api/studio/sessions/${deletingSession.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "删除失败");
      }

      setSessions((prev) =>
        prev.filter((item) => item.id !== deletingSession.id)
      );
      const nextHref = deletingSession.type === "video" ? "/studio/video" : "/studio";
      if (activeSessionId === deletingSession.id) {
        router.replace(nextHref);
        dispatchStudioEvent(STUDIO_NEW_SESSION_EVENT);
      }
      setDeletingSession(null);
      toast.success("会话已删除");
      notifySessionsChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setSessionActionLoading(false);
    }
  };

  const userLabel =
    resolvedUser?.name ||
    resolvedUser?.email ||
    (resolvedUser ? "小象用户" : "未登录");
  const userEmail = resolvedUser?.email;
  const rawUserImage = (resolvedUser as { image?: unknown } | undefined)?.image;
  const userImage = typeof rawUserImage === "string" ? rawUserImage : null;
  const accountAvatarLabel = resolvedUser ? getInitials(userLabel) : "象";

  if (pathname.startsWith("/studio/subscription")) {
    return <>{children}</>;
  }

  const pageTitle = pathname.startsWith("/studio/assets")
    ? "作品库"
    : pathname.startsWith("/studio/profile")
      ? "设置"
      : pathname.startsWith("/studio/admin")
        ? "管理后台"
        : mode === "video"
          ? "视频创作"
          : mode === "image"
            ? "图像创作"
            : APP_BRAND;

  const trimmedSearch = search.trim().toLowerCase();
  const hasSession = hydrated && !isPending && Boolean(resolvedUser);
  const showSessionResults = hasSession && historyEnabled && sessions.length > 0;
  const emptyRecentText = !historyEnabled
    ? "创作记录已暂停"
    : trimmedSearch
      ? "没有找到记录"
      : "还没有创作记录";
  const firstSearchHref = hasSession && historyEnabled
    ? sessions[0]
      ? getSessionHref(sessions[0].type, sessions[0].id)
      : null
    : null;

  const accountMenuClassName = cn(
    "absolute z-50 w-[min(320px,calc(100vw-24px))] rounded-2xl border border-black/10 bg-white p-2 text-[#0d0d0d] shadow-[0_18px_60px_rgba(0,0,0,0.16)]",
    accountMenuPlacement === "header" && "right-0 top-11",
    accountMenuPlacement === "sidebar" && "bottom-11 left-0",
    accountMenuPlacement === "rail" && "bottom-0 left-12"
  );

  const renderAccountMenu = () => {
    if (!resolvedUser || !accountMenuOpen) return null;

    const menuItemClassName =
      "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[#0d0d0d] hover:bg-black/5";

    return (
      <div
        role="menu"
        data-studio-account-menu="true"
        aria-label="账号菜单"
        className={accountMenuClassName}
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <AccountAvatar label={accountAvatarLabel} image={userImage} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#0d0d0d]">
              {userLabel}
            </p>
            {userEmail && (
              <p className="mt-0.5 truncate text-xs text-[#777]">
                {userEmail}
              </p>
            )}
          </div>
        </div>
        <div className="my-1 h-px bg-[#eeeeee]" />
        <button
          role="menuitem"
          type="button"
          onClick={() => handleNavigate("/studio/subscription")}
          className={menuItemClassName}
        >
          <Sparkles className="size-4" strokeWidth={1.9} />
          订阅与积分
        </button>
        <div className="my-1 h-px bg-[#eeeeee]" />
        <button
          role="menuitem"
          type="button"
          onClick={() => {
            setAccountMenuOpen(false);
            setAccountMenuPlacement(null);
            setCustomizeOpen(true);
          }}
          className={menuItemClassName}
        >
          <Palette className="size-4" strokeWidth={1.9} />
          自定义小象
        </button>
        <button
          role="menuitem"
          type="button"
          onClick={handleOpenSettings}
          className={menuItemClassName}
        >
          <Settings className="size-4" strokeWidth={1.9} />
          设置
        </button>
        <button
          role="menuitem"
          type="button"
          onClick={handleOpenInvite}
          className={menuItemClassName}
        >
          <UserPlus className="size-4" strokeWidth={1.9} />
          邀请成员
        </button>
        {canShowAdminLinks && (
          <button
            role="menuitem"
            type="button"
            onClick={() => handleNavigate("/studio/admin")}
            className={menuItemClassName}
          >
            <Settings className="size-4" strokeWidth={1.9} />
            管理后台
          </button>
        )}
        <button
          role="menuitem"
          type="button"
          onClick={handleShowShortcuts}
          className={menuItemClassName}
        >
          <Keyboard className="size-4" strokeWidth={1.9} />
          快捷键
        </button>
        <button
          role="menuitem"
          type="button"
          onClick={handleOpenHelpDialog}
          className={menuItemClassName}
        >
          <CircleHelp className="size-4" strokeWidth={1.9} />
          帮助
        </button>
        <div className="my-1 h-px bg-[#eeeeee]" />
        <button
          role="menuitem"
          type="button"
          onClick={handleSignOut}
          className={menuItemClassName}
        >
          <LogOut className="size-4" strokeWidth={1.9} />
          退出登录
        </button>
      </div>
    );
  };

  const renderSidebar = (variant: "desktop" | "mobile") => {
    const isMobileSidebar = variant === "mobile";
    const sidebarNavItems = hasSession
      ? APP_NAV
      : APP_NAV.filter((item) => item.href !== "/studio/profile");

    return (
    <div
      data-studio-sidebar-surface="true"
      className="flex h-full flex-col bg-[#f9f9f9] text-[#0d0d0d]"
    >
      <div className="flex h-14 items-center justify-between px-3">
        <Link
          href="/studio"
          className="flex size-9 items-center justify-center rounded-lg hover:bg-black/5"
          onClick={() => setMobileOpen(false)}
          aria-label={APP_BRAND}
        >
          <BrandMark />
        </Link>
        <button
          type="button"
          onClick={() => {
            if (!isMobileSidebar) {
              setSidebarCollapsed(true);
            }
            setMobileOpen(false);
          }}
          className="flex size-9 items-center justify-center rounded-lg text-[#5f5f5f] hover:bg-black/5"
          aria-label={isMobileSidebar ? "关闭菜单" : "收起侧边栏"}
        >
          <PanelLeft className="size-5" />
        </button>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={handleNew}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-black/5"
        >
          <SquarePen className="size-5" strokeWidth={1.9} />
          <span>新建创作</span>
        </button>
        <button
          type="button"
          onClick={handleOpenSearch}
          aria-label="搜索创作记录"
          className="group flex h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-[15px] text-[#0d0d0d] hover:bg-black/5"
        >
          <Search className="size-5" strokeWidth={1.9} />
          <span className="min-w-0 flex-1 truncate">搜索创作记录</span>
          {!isMobileSidebar && (
            <span className="hidden rounded-md border border-[#d8d8d8] px-1.5 py-0.5 text-[11px] leading-none text-[#777] md:inline">
              ⌘K
            </span>
          )}
        </button>
      </div>

      <nav className="mt-2 px-3">
        {sidebarNavItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);

          if (item.href === "/studio/profile") {
            return (
              <button
                key={item.label}
                type="button"
                onClick={handleOpenSettings}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-[15px] hover:bg-black/5",
                  active && "bg-black/[0.03]"
                )}
              >
                <Icon className="size-5" strokeWidth={1.9} />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-black/5",
                active && "bg-black/[0.03]"
              )}
            >
              <Icon className="size-5" strokeWidth={1.9} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {canShowAdminLinks && (
          <Link
            href="/studio/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-black/5",
              pathname.startsWith("/studio/admin") && "bg-black/[0.03]"
            )}
          >
            <Settings className="size-5" strokeWidth={1.9} />
            <span>管理后台</span>
          </Link>
        )}
      </nav>

      <div className="custom-scrollbar mt-5 flex-1 overflow-y-auto px-3 pb-4">
        {mode && hasSession && (
          <>
            <p className="px-2 pb-2 text-xs font-medium leading-5 text-[#8a8a8a]">
              最近
            </p>
            <div className="space-y-1">
              {!historyEnabled ? (
                <div className="rounded-xl border border-[#e7e7e7] bg-white px-3 py-3 text-sm leading-5 text-[#6f6f6f] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <p className="font-medium text-[#0d0d0d]">创作记录已暂停</p>
                  <p className="mt-1">
                    左侧最近记录和搜索不会显示已保存的会话。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryEnabled(true);
                      writeBooleanPreference(STUDIO_HISTORY_ENABLED_KEY, true);
                      toast.success("已打开创作记录");
                    }}
                    className="mt-3 h-8 rounded-full bg-[#0d0d0d] px-3 text-xs font-medium text-white hover:bg-[#2a2a2a]"
                  >
                    打开创作记录
                  </button>
                </div>
              ) : showSessionResults ? (
                sessions.map((item) => (
                    <div key={item.id} className="group/session relative">
                      <Link
                        href={getSessionHref(item.type, item.id)}
                        onClick={() => {
                          setSessionMenuId(null);
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "block rounded-lg px-2 py-2 pr-9 text-sm leading-5 hover:bg-black/5",
                          activeSessionId === item.id && "bg-black/[0.06]"
                        )}
                      >
                        <span className="block truncate">{item.title}</span>
                        <span className="mt-0.5 block text-[12px] leading-4 text-[#8a8a8a]">
                          {formatShortDate(item.updatedAt)}
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSessionMenuId((id) => (id === item.id ? null : item.id));
                        }}
                        className={cn(
                          "absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#777] opacity-100 hover:bg-black/10 hover:text-[#0d0d0d] md:opacity-0 md:group-hover/session:opacity-100",
                          sessionMenuId === item.id && "opacity-100"
                        )}
                        aria-label={`${item.title} 更多操作`}
                        aria-expanded={sessionMenuId === item.id}
                        aria-haspopup="menu"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                      {sessionMenuId === item.id && (
                        <div
                          ref={sessionMenuRef}
                          role="menu"
                          data-studio-session-menu="true"
                          aria-label={`${item.title} 更多操作`}
                          className="absolute right-1 top-9 z-50 w-44 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_18px_60px_rgba(0,0,0,0.16)]"
                        >
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => handleNavigate(getSessionHref(item.type, item.id))}
                            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-black/5"
                          >
                            <ExternalLink className="size-4" />
                            打开会话
                          </button>
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => openRenameDialog(item)}
                            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-black/5"
                          >
                            <Pencil className="size-4" />
                            重命名
                          </button>
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => handleCopySessionLink(getSessionHref(item.type, item.id))}
                            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-black/5"
                          >
                            <Copy className="size-4" />
                            复制链接
                          </button>
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              setDeletingSession(item);
                              setSessionMenuId(null);
                            }}
                            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="rounded-lg px-2 py-3 text-sm leading-5 text-[#8a8a8a]">
                  {emptyRecentText}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="px-3 pb-3">
        <div className="mb-3 space-y-1">
          <Link
            href="/studio/subscription"
            onClick={() => setMobileOpen(false)}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-black/5"
          >
            <Sparkles className="size-5" strokeWidth={1.9} />
            <span>购买积分</span>
          </Link>
          {!hasSession && (
            <>
              <button
                type="button"
                onClick={handleOpenSettings}
                className="flex h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-[15px] hover:bg-black/5"
              >
                <Settings className="size-5" strokeWidth={1.9} />
                <span>设置</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  handleOpenHelpDialog();
                }}
                className="flex h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-[15px] hover:bg-black/5"
              >
                <CircleHelp className="size-5" strokeWidth={1.9} />
                <span>帮助</span>
              </button>
            </>
          )}
        </div>
        {hasSession || !hydrated || isPending ? (
          <div ref={sidebarAccountMenuRef} className="relative">
            <UserProfile
              user={resolvedUser ?? null}
              isPending={isPending}
              menuOpen={
                accountMenuOpen && accountMenuPlacement === "sidebar"
              }
              onAccountClick={() => handleOpenAccountMenu("sidebar")}
              onLoginClick={() => setLoginOpen(true)}
            />
            {accountMenuPlacement === "sidebar" && renderAccountMenu()}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="text-sm font-medium leading-5 text-[#0d0d0d]">
              获取更贴合你的结果
            </p>
            <p className="mt-1 text-sm leading-5 text-[#6f6f6f]">
              登录后可保存创作记录，继续生成图片和视频，并上传素材。
            </p>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="mt-3 flex h-10 w-full items-center justify-center rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
            >
              登录
            </button>
          </div>
        )}
      </div>
    </div>
    );
  };

  const railNavItems = APP_NAV.filter((item) => item.href !== "/studio/profile");

  const renderCollapsedRail = () => (
    <div
      data-studio-sidebar-surface="true"
      className="flex h-full w-14 flex-col items-center bg-[#f9f9f9] py-2 text-[#0d0d0d]"
    >
      <Link
        href="/studio"
        className="mb-2 flex size-10 items-center justify-center rounded-lg hover:bg-black/5"
        aria-label={APP_BRAND}
      >
        <BrandMark />
      </Link>
      <button
        type="button"
        onClick={() => setSidebarCollapsed(false)}
        className="mb-2 flex size-10 items-center justify-center rounded-lg text-[#5f5f5f] hover:bg-black/5"
        aria-label="展开侧边栏"
      >
        <PanelLeft className="size-5" />
      </button>
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={handleNew}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-black/5"
          aria-label="新建创作"
        >
          <SquarePen className="size-5" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          onClick={handleOpenSearch}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-black/5"
          aria-label="搜索创作记录"
        >
          <Search className="size-5" strokeWidth={1.9} />
        </button>
      </div>
      <div className="mt-3 h-px w-8 bg-[#e7e7e7]" />
      <nav className="mt-3 flex flex-col items-center gap-1">
        {railNavItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex size-10 items-center justify-center rounded-lg hover:bg-black/5",
                active && "bg-black/[0.06]"
              )}
              aria-label={item.label}
            >
              <Icon className="size-5" strokeWidth={1.9} />
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleOpenSettings}
          className={cn(
            "flex size-10 items-center justify-center rounded-lg hover:bg-black/5",
            pathname.startsWith("/studio/profile") && "bg-black/[0.06]"
          )}
          aria-label="设置"
        >
          <Settings className="size-5" strokeWidth={1.9} />
        </button>
      </nav>
      <div className="mt-auto flex flex-col items-center gap-1">
        <Link
          href="/studio/subscription"
          className="flex size-10 items-center justify-center rounded-lg hover:bg-black/5"
          aria-label="积分中心"
        >
          <Coins className="size-5" strokeWidth={1.9} />
        </Link>
        <div ref={railAccountMenuRef} className="relative">
          <button
            type="button"
            onClick={() => handleOpenAccountMenu("rail")}
            className="flex size-10 items-center justify-center rounded-lg hover:bg-black/5"
            aria-label={resolvedUser ? "账号菜单" : "登录"}
            aria-expanded={accountMenuOpen && accountMenuPlacement === "rail"}
            aria-haspopup="menu"
          >
            <AccountAvatar
              label={accountAvatarLabel}
              image={userImage}
              pending={!hydrated || isPending}
            />
          </button>
          {accountMenuPlacement === "rail" && renderAccountMenu()}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        data-studio-shell="true"
        className="flex h-screen overflow-hidden bg-white text-[#0d0d0d]"
        data-sidebar-collapsed={sidebarCollapsed}
        style={
          {
            "--studio-sidebar-left": sidebarCollapsed ? "56px" : "260px",
          } as React.CSSProperties
        }
      >
        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden transition-[width] duration-200 md:block",
            sidebarCollapsed ? "w-14" : "w-[260px]"
          )}
        >
          {sidebarCollapsed ? (
            renderCollapsedRail()
          ) : (
            <div className="h-full w-[260px]">{renderSidebar("desktop")}</div>
          )}
        </aside>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="relative flex h-14 shrink-0 items-center justify-between px-3 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex size-9 items-center justify-center rounded-lg hover:bg-black/5 md:hidden"
                aria-label="打开菜单"
              >
                <Menu className="size-5" />
              </button>
              <div ref={titleMenuRef} className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => setTitleMenuOpen((open) => !open)}
                  aria-expanded={titleMenuOpen}
                  aria-haspopup="menu"
                  aria-label={hasSession ? "切换工作台页面" : "产品能力菜单"}
                  className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-2 text-[18px] font-medium leading-none hover:bg-black/5"
                >
                  <span className="truncate">{pageTitle}</span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 size-4 text-[#777] transition-transform",
                      titleMenuOpen && "rotate-180"
                    )}
                  />
                </button>
                {titleMenuOpen && (
                  <div
                    role="menu"
                    aria-label={hasSession ? "切换工作台页面" : "产品能力菜单"}
                    className={cn(
                      "absolute left-0 top-11 z-40 overflow-hidden rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.12)]",
                      hasSession
                        ? "w-64 border border-black/10 bg-white p-2"
                        : "w-[min(320px,calc(100vw-24px))] border border-white/10 bg-[#353535] p-0 text-white shadow-[0_8px_16px_rgba(0,0,0,0.32),inset_0_0_1px_rgba(255,255,255,0.2)]"
                    )}
                  >
                    {hasSession ? (
                      <>
                        {APP_NAV.map((item) => {
                          const Icon = item.icon;
                          const active = isNavActive(pathname, item.href);
                          return (
                            <button
                              role="menuitem"
                              key={item.href}
                              type="button"
                              onClick={() => {
                                if (item.href === "/studio/profile") {
                                  handleOpenSettings();
                                  return;
                                }

                                handleNavigate(item.href);
                              }}
                              className={cn(
                                "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] hover:bg-black/5",
                                active && "bg-black/[0.04]"
                              )}
                            >
                              <Icon className="size-5" strokeWidth={1.9} />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                        {canShowAdminLinks && (
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => handleNavigate("/studio/admin")}
                            className={cn(
                              "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] hover:bg-black/5",
                              pathname.startsWith("/studio/admin") && "bg-black/[0.04]"
                            )}
                          >
                            <Settings className="size-5" strokeWidth={1.9} />
                            <span>管理后台</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div>
                        <div className="h-[122px] bg-[linear-gradient(135deg,#d6e9ff_0%,#f2d8ff_36%,#f8f2c4_68%,#9ed5ff_100%)]" />
                        <div className="px-4 pb-4 pt-5">
                          <p className="text-[18px] font-semibold leading-6 text-white">
                            免费试用完整能力
                          </p>
                          <p className="mt-2 text-sm leading-5 text-white/80">
                            登录后可以保存创作、上传素材、生成图片和视频。
                          </p>
                          <div className="mt-5 flex items-center gap-2">
                            <button
                              role="menuitem"
                              type="button"
                              onClick={() => {
                                setTitleMenuOpen(false);
                                setLoginOpen(true);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-sm font-medium text-[#0d0d0d] hover:bg-white/90"
                            >
                              登录
                            </button>
                            <button
                              role="menuitem"
                              type="button"
                              onClick={() => handleNavigate("/signup")}
                              className="inline-flex h-9 items-center justify-center rounded-full bg-[#242424] px-4 text-sm font-medium text-white hover:bg-[#1f1f1f]"
                            >
                              免费注册
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Link
              href="/studio/subscription"
              className="absolute left-1/2 top-2 hidden h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-[#f4f4f4] px-4 text-sm font-medium text-[#0d0d0d] hover:bg-[#ececec] lg:flex"
            >
              <Coins className="size-4" />
              <span>积分中心</span>
            </Link>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleOpenInvite}
                className="hidden size-10 items-center justify-center rounded-full hover:bg-black/5 sm:flex"
                aria-label="邀请成员"
              >
                <UserPlus className="size-5" strokeWidth={1.9} />
              </button>
              {!hydrated || isPending ? (
                <AccountAvatar
                  label={accountAvatarLabel}
                  image={userImage}
                  pending
                />
              ) : resolvedUser ? (
                <div ref={accountMenuRef} className="relative">
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center rounded-full hover:bg-black/5"
                    aria-label="账号菜单"
                    aria-expanded={
                      accountMenuOpen && accountMenuPlacement === "header"
                    }
                    aria-haspopup="menu"
                    onClick={() => handleOpenAccountMenu("header")}
                  >
                    <AccountAvatar
                      label={accountAvatarLabel}
                      image={userImage}
                    />
                  </button>
                  {accountMenuPlacement === "header" && renderAccountMenu()}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginOpen(true)}
                    className="inline-flex h-9 items-center justify-center rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate("/signup")}
                    className="hidden h-9 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-[#0d0d0d] hover:bg-black/[0.04] sm:inline-flex"
                  >
                    免费注册
                  </button>
                </div>
              )}
            </div>
          </header>
          <main
            data-studio-main-surface="true"
            className="min-h-0 flex-1 overflow-hidden"
          >
            {children}
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          hideCloseButton
          data-studio-mobile-sheet="true"
          className="w-[300px] p-0"
        >
          <SheetTitle className="sr-only">工作台导航</SheetTitle>
          {renderSidebar("mobile")}
        </SheetContent>
      </Sheet>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />

      <CustomizeElephantDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
      />

      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />

      <HelpDialog
        open={helpDialogOpen}
        onOpenChange={setHelpDialogOpen}
        onOpenShortcuts={handleShowShortcuts}
      />

      <TeamInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        userEmail={userEmail}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hasSession={hasSession}
        user={resolvedUser}
        onRequestLogin={() => setLoginOpen(true)}
      />

      <Dialog
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) {
            setSessionMenuId(null);
            setSearch("");
          }
        }}
      >
        <DialogContent
          data-search-dialog="history"
          overlayClassName="bg-transparent"
          wrapperClassName={cn(
            "items-start justify-start p-0",
            hasSession
              ? "pt-[72px] md:pl-[calc(var(--studio-sidebar-left)+24px)]"
              : "pt-[132px] md:pl-[calc(var(--studio-sidebar-left)+16px)]"
          )}
          className={cn(
            "overflow-hidden rounded-2xl border border-[#d8d8d8] bg-white p-0 shadow-[0_22px_70px_rgba(0,0,0,0.18)]",
            hasSession
              ? "mx-3 w-[min(640px,calc(100vw-24px))] gap-0 sm:max-w-xl"
              : "mx-3 w-[min(430px,calc(100vw-24px))] gap-0 sm:max-w-md"
          )}
        >
          <DialogTitle className="sr-only">搜索创作记录</DialogTitle>
          {hasSession ? (
            <>
              {historyEnabled && (
                <div className="flex h-14 items-center gap-3 border-b border-[#eeeeee] px-4">
                  <Search className="size-5 shrink-0 text-[#777]" strokeWidth={1.9} />
                  <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && firstSearchHref) {
                        event.preventDefault();
                        setSearchOpen(false);
                        handleNavigate(firstSearchHref);
                      }
                    }}
                    placeholder="搜索创作记录"
                    aria-label="搜索创作记录"
                    autoComplete="off"
                    autoFocus
                    data-autofocus
                    className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#8a8a8a]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        searchInputRef.current?.focus();
                      }}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#777] hover:bg-black/5 hover:text-[#0d0d0d]"
                      aria-label="清空搜索"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              )}
              <div className="custom-scrollbar max-h-[min(560px,70vh)] overflow-y-auto p-3">
                {!historyEnabled ? (
                  <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#f4f4f4]">
                      <Clock className="size-4 text-[#777]" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-[#0d0d0d]">
                      创作记录已暂停
                    </p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-[#777]">
                      左侧最近记录和搜索会暂时隐藏保存过的会话。你可以随时重新打开。
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryEnabled(true);
                        writeBooleanPreference(STUDIO_HISTORY_ENABLED_KEY, true);
                        toast.success("已打开创作记录");
                      }}
                      className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                    >
                      打开创作记录
                    </button>
                  </div>
                ) : showSessionResults ? (
                  <div className="space-y-1">
                    <p className="px-3 py-2 text-xs font-medium text-[#8a8a8a]">
                      创作记录
                    </p>
                    {sessions.map((item) => {
                      const href = getSessionHref(item.type, item.id);
                      const Icon = item.type === "video" ? Video : ImageIcon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavigate(href)}
                          className="flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-black/[0.04]"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#555]">
                            <Icon className="size-4" strokeWidth={1.9} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-[#0d0d0d]">
                              {item.title}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[#8a8a8a]">
                              <Clock className="size-3.5" />
                              {item.type === "video" ? "视频创作" : "图像创作"} · {formatShortDate(item.updatedAt)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#f4f4f4]">
                      <Search className="size-4 text-[#777]" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-[#0d0d0d]">
                      {emptyRecentText}
                    </p>
                    <p className="mt-1 text-sm text-[#777]">
                      {trimmedSearch
                        ? "换个关键词再试。"
                        : "生成内容后，会话会显示在这里。"}
                    </p>
                  </div>
                )}
              </div>
              {historyEnabled && (
                <div className="flex items-center justify-between border-t border-[#eeeeee] px-4 py-2.5 text-xs text-[#8a8a8a]">
                  <span>Enter 打开</span>
                  <span>Esc 关闭</span>
                </div>
              )}
            </>
          ) : (
            <div className="px-5 pb-5 pt-28">
              <DialogTitle className="text-xl font-medium leading-7 text-[#0d0d0d]">
                搜索你的创作记录
              </DialogTitle>
              <p className="mt-2 text-sm leading-6 text-[#6f6f6f]">
                登录后可以保存对话、搜索过去的答案，并接着上次的创作继续。
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setLoginOpen(true);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate("/signup")}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-[#0d0d0d] hover:bg-black/[0.04]"
                >
                  免费注册
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(renamingSession)}
        onOpenChange={(open) => {
          if (!open && !sessionActionLoading) {
            setRenamingSession(null);
            setRenameTitle("");
          }
        }}
      >
        <DialogContent
          data-studio-dialog-surface="rename-session"
          className="rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-[#0d0d0d]">
              重命名会话
            </DialogTitle>
            <DialogDescription className="text-sm text-[#777]">
              修改后会显示在左侧最近记录中。
            </DialogDescription>
          </DialogHeader>
          <input
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleRenameSession();
              }
            }}
            maxLength={80}
            autoFocus
            aria-label="会话名称"
            autoComplete="off"
            className="h-11 rounded-xl border border-[#d9d9d9] px-3 text-sm outline-none transition focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
            placeholder="输入会话名称"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRenamingSession(null);
                setRenameTitle("");
              }}
              disabled={sessionActionLoading}
              className="rounded-full border-[#d9d9d9]"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleRenameSession()}
              disabled={sessionActionLoading || !renameTitle.trim()}
              className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
            >
              {sessionActionLoading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingSession)}
        onOpenChange={(open) => {
          if (!open && !sessionActionLoading) {
            setDeletingSession(null);
          }
        }}
      >
        <DialogContent
          data-studio-dialog-surface="delete-session"
          className="rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-[#0d0d0d]">
              删除会话？
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#777]">
              「{deletingSession?.title}」会从最近记录移除，已生成的作品仍保留在作品库。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingSession(null)}
              disabled={sessionActionLoading}
              className="rounded-full border-[#d9d9d9]"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleDeleteSession()}
              disabled={sessionActionLoading}
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
            >
              {sessionActionLoading ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
