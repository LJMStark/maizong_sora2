import type { PptLayoutRole } from "@/features/studio/data/ppt-skills/types";

export type PptTaskStatus =
  | "pending"
  | "generating_sample"
  | "awaiting_confirm"
  | "generating"
  | "succeeded"
  | "partial"
  | "error"
  | "cancelled";

export type PptSlideStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "error"
  | "cancelled";

export const PPT_TERMINAL_STATUSES: PptTaskStatus[] = [
  "succeeded",
  "partial",
  "error",
  "cancelled",
];

export interface PptSlideSnapshot {
  slideIndex: number;
  title: string;
  status: PptSlideStatus;
  finalImageUrl: string | null;
  retryCount: number;
  errorMessage: string | null;
  speechNotes: string | null;
  isSample: boolean;
  refunded: boolean;
}

export interface PptTaskSnapshot {
  taskId: string;
  sessionId: string | null;
  status: PptTaskStatus;
  title: string;
  skillKey: string;
  styleKey: string;
  anchorColor: string | null;
  resolution: "2k" | "4k";
  pageCount: number;
  sampleFirst: boolean;
  speechNotesEnabled: boolean;
  creditCostPerPage: number;
  creditCostTotal: number;
  refundedCredits: number;
  errorMessage: string | null;
  progress: {
    succeeded: number;
    failed: number;
    total: number;
    currentIndex: number | null;
  };
  slides: PptSlideSnapshot[];
}

export interface PptOutlineSlideDraft {
  index: number;
  title: string;
  bullets: string[];
  layoutRole: PptLayoutRole;
  promptOverride?: string;
}

export interface PptTemplateInfo {
  profile: {
    palette: string[];
    fonts: string[];
    layoutTraits: string;
    background: string;
    motifs: string;
  };
  refImageUrls: string[];
}

export interface PptTaskListItem {
  taskId: string;
  sessionId: string | null;
  title: string;
  status: PptTaskStatus;
  skillKey: string;
  styleKey: string;
  pageCount: number;
  coverImageUrl: string | null;
  createdAt: string;
}

export const PPT_LAYOUT_ROLE_LABELS: Record<PptLayoutRole, string> = {
  cover: "封面",
  toc: "目录",
  section: "章节",
  content: "内容",
  data: "数据",
  end: "结尾",
};
