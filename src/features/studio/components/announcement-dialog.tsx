"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AnnouncementType } from "@/db/schema/studio/announcement";
import { ChevronDown, ChevronUp, Megaphone } from "lucide-react";

const DISMISSED_KEY = "announcement_dismissed_date";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDismissedToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(DISMISSED_KEY) === getTodayString();
  } catch {
    return false;
  }
}

function dismissToday(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, getTodayString());
  } catch {
    // Storage can be blocked in hardened/private browser contexts.
  }
}

export default function AnnouncementDialog() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementType[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const suppressedByAppDialogRef = useRef(false);

  useEffect(() => {
    if (pathname.startsWith("/studio/admin")) return;
    if (pathname.startsWith("/studio/profile")) return;
    if (isDismissedToday()) return;

    fetch("/api/announcements")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setAnnouncements(json.data);
          if (!suppressedByAppDialogRef.current && !isDismissedToday()) {
            setOpen(true);
          }
        }
      })
      .catch((error) => {
        console.error("获取公告失败:", error);
      });
  }, [pathname]);

  useEffect(() => {
    const handleAppDialogOpen = () => {
      suppressedByAppDialogRef.current = true;
      setOpen(false);
      dismissToday();
    };

    window.addEventListener("studio:modal-opened", handleAppDialogOpen);
    return () => {
      window.removeEventListener("studio:modal-opened", handleAppDialogOpen);
    };
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    dismissToday();
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (announcements.length === 0) return null;

  const [latest, ...older] = announcements;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        data-studio-dialog-surface="announcement"
        className="max-h-[80vh] overflow-y-auto rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-medium text-[#0d0d0d]">
            <Megaphone className="size-5" strokeWidth={1.9} />
            {latest.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            系统公告
          </DialogDescription>
        </DialogHeader>

        <div className="whitespace-pre-wrap text-sm leading-6 text-[#333]">
          {latest.content}
        </div>

        <p className="mt-1 text-xs text-[#777]">
          {new Date(latest.createdAt).toLocaleDateString("zh-CN")}
        </p>

        {older.length > 0 && (
          <div className="mt-4 border-t border-[#eeeeee] pt-3">
            <p className="mb-2 text-xs font-medium text-[#777]">
              历史公告
            </p>
            <div className="space-y-2">
              {older.map((item) => {
                const expanded = expandedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#e5e5e5] p-3 text-sm"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between text-left"
                      onClick={() => toggleExpand(item.id)}
                    >
                      <span className="font-medium">{item.title}</span>
                      <span className="ml-2 flex shrink-0 items-center gap-2 text-xs text-[#777]">
                        {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                        {expanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </span>
                    </button>
                    {expanded && (
                      <p className="mt-2 whitespace-pre-wrap text-[#555] leading-6">
                        {item.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button onClick={handleClose} className="w-full rounded-full bg-[#0d0d0d] hover:bg-[#2a2a2a] sm:w-auto">
            我知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
