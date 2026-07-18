export type PptLayoutRole =
  | "cover"
  | "toc"
  | "section"
  | "content"
  | "data"
  | "end";

export interface PptAnchorColor {
  name: string;
  hex: string;
}

export interface PptStyle {
  key: string;
  name: string;
  /** PromptGallery 分类展示用（通常为所属技能名） */
  category: string;
  /** 风格卡片预览图路径（public/ 下），如 /studio-showcase/ppt/guizang-swiss.png */
  previewImage: string;
  /** 一句话风格描述（卡片副标题） */
  description: string;
  /** 整页风格系统提示词前缀：视觉体系、字体气质、构图纪律 */
  systemPrefix: string;
  /** 颜色硬约束；支持 {anchorColor} 占位符（选中锚点色后代入） */
  colorRule: string;
  /** 可选锚点色（存在时 UI 展示色板供用户选择） */
  anchorColors?: PptAnchorColor[];
  /** 按版式角色给出的版式描述；数组时轮换使用增加页间变化 */
  layouts: Partial<Record<PptLayoutRole, string | string[]>>;
  /** 追加约束（字体渲染、留白、禁用元素等） */
  extraDirectives?: string;
}

export interface PptSkillWorkflow {
  /** 该技能是否推荐样张先行 */
  sampleFirst: boolean;
  /** 是否支持演讲备注生成 */
  speechNotes: boolean;
  /** 是否支持模板克隆（参考图注入） */
  templateClone: boolean;
}

export interface PptSkill {
  key: string;
  name: string;
  repoUrl: string;
  description: string;
  workflow: PptSkillWorkflow;
  styles: PptStyle[];
}
