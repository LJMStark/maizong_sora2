"use client";

export interface StudioDataExportAccount {
  name: string;
  username?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface StudioDataExportPreferences {
  appearance?: string;
  language?: string;
  historyEnabled?: boolean;
  notificationsEnabled?: boolean;
  section?: string;
  [key: string]: unknown;
}

export interface StudioDataExportOptions {
  account: StudioDataExportAccount;
  preferences?: StudioDataExportPreferences;
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "导出失败");
  }

  return data;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function exportStudioData({
  account,
  preferences,
}: StudioDataExportOptions) {
  const [
    credits,
    creditHistory,
    imageTasks,
    videoTasks,
    imageSessions,
    videoSessions,
  ] = await Promise.all([
    fetchJson("/api/credits"),
    fetchJson("/api/credits/history"),
    fetchJson("/api/image/tasks"),
    fetchJson("/api/video/tasks"),
    fetchJson("/api/studio/sessions?type=image"),
    fetchJson("/api/studio/sessions?type=video"),
  ]);

  const exportedAt = new Date();
  const payload = {
    product: "小象万象",
    exportedAt: exportedAt.toISOString(),
    account,
    preferences: preferences ?? {},
    credits: {
      balance: credits.credits ?? null,
      history: creditHistory.history ?? [],
    },
    sessions: {
      image: imageSessions.sessions ?? [],
      video: videoSessions.sessions ?? [],
    },
    tasks: {
      image: imageTasks.tasks ?? [],
      video: videoTasks.tasks ?? [],
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const datePart = formatLocalDate(exportedAt);

  link.href = downloadUrl;
  link.download = `studio-data-${datePart}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);

  return {
    filename: link.download,
    payload,
  };
}
