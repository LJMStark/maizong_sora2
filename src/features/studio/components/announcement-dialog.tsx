"use client";

import { useEffect, useState, useCallback } from "react";
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
  return localStorage.getItem(DISMISSED_KEY) === getTodayString();
}

function dismissToday(): void {
  localStorage.setItem(DISMISSED_KEY, getTodayString());
}

export default function AnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementType[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isDismissedToday()) return;

    fetch("/api/announcements")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setAnnouncements(json.data);
          setOpen(true);
        }
      })
      .catch((error) => {
        console.error("获取公告失败:", error);
      });
  }, []);

  const handleClose = useCallback(() => {
    dismissToday();
    setOpen(false);
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
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-5" />
            {latest.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            系统公告
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">
          {latest.content}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {new Date(latest.createdAt).toLocaleDateString("zh-CN")}
        </p>

        {older.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              历史公告
            </p>
            <div className="space-y-2">
              {older.map((item) => {
                const expanded = expandedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between text-left"
                      onClick={() => toggleExpand(item.id)}
                    >
                      <span className="font-medium">{item.title}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-2">
                        {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                        {expanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </span>
                    </button>
                    {expanded && (
                      <p className="mt-2 text-[#555] leading-relaxed whitespace-pre-wrap">
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
          <Button onClick={handleClose} className="w-full sm:w-auto">
            我知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
