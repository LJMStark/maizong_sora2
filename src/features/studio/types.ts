export enum AspectRatio {
  SQUARE = "1:1",
  PORTRAIT_ALT = "2:3",
  LANDSCAPE_ALT = "3:2",
  PORTRAIT = "3:4",
  STANDARD = "4:3",
  SOCIAL = "9:16",
  LANDSCAPE = "16:9",
  CINEMA = "21:9"
}

export enum ImageQuality {
  STANDARD = "1K",
  HD = "2K",
  UHD = "4K"
}

export enum VideoStyle {
  FREE = "Free",
  CINEMATIC = "Cinematic",
  ADVERTISING = "Advertising"
}

export interface GenerationResult {
  id: string;
  type: 'image' | 'video' | 'analysis';
  url?: string;
  text?: string;
  thumbnail?: string;
  prompt: string;
  createdAt: Date;
  status: 'processing' | 'completed' | 'failed';
}

export interface CreditTransaction {
  id: string;
  type: 'deduction' | 'addition' | 'refund';
  amount: number;
  reason: string;
  date: Date;
  balanceBefore?: number;
  balanceAfter?: number;
}

export interface VideoTask {
  id: string;
  status: 'pending' | 'running' | 'succeeded' | 'error';
  progress: number;
  prompt: string;
  aspectRatio: string;
  duration: number;
  model: string;
  videoUrl?: string;
  sourceImageUrl?: string;
  errorMessage?: string;
  creditCost: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface AppState {
  credits: number;
  history: GenerationResult[];
  creditHistory: CreditTransaction[];
  videoTasks: VideoTask[];
}

export interface StudioContextType {
  state: AppState;
  deductCredits: (amount: number, reason?: string) => void;
  addCredits: (amount: number, reason?: string) => void;
  addToHistory: (item: GenerationResult) => void;
  refreshCredits: () => Promise<void>;
  refreshVideoTasks: () => Promise<void>;
  refreshCreditHistory: () => Promise<void>;
}
