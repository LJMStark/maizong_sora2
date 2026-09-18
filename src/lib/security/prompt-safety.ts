/**
 * 生成任务的提示词前置内容安全检查。
 *
 * ## 这一层能做什么、不能做什么
 *
 * 这是**关键词层**，是第一道摩擦，不是分类器。它拦得住随手输入和明文表述，
 * 拦不住刻意绕过（同义替换、拼音、编码、外语、图片侧规避）。
 * 完整方案还需要两块，均属后续迭代：
 *   1. 输出侧图像分类器（生成完再判一次，关键词对图片无能为力）；
 *   2. 涉嫌违法内容的证据留存与依法上报管道（见 `/takedown` 页描述的义务）。
 *
 * 之所以现在就要有这一层：ToS 条款不能替代技术措施。若用户在有明文政策的
 * 情况下仍能反复生成违禁内容，责任会从「用户行为问题」变成「产品设计问题」。
 *
 * ## 为什么用「共现」而不是单词黑名单
 *
 * 单独出现的 `child` / `儿童` 是完全正常的创作意图（儿童插画风格、亲子场景），
 * 单独出现的 `nude` 也是（人体写生）。把任一单独拦下会产生大量误杀，而误杀会
 * 逼用户学习规避话术——反而更糟。真正的信号是**未成年人指示词**与
 * **性相关指示词**同时出现。
 *
 * 少数词组本身已无其他解释（换脸脱衣类工具语、CSAM 圈内术语），走单词硬拦。
 */

export type PromptSafetyCategory = "csam" | "ncii";

export interface PromptSafetyResult {
  allowed: boolean;
  category?: PromptSafetyCategory;
  /** 面向用户的文案。刻意不说明命中了哪个词——否则等于告诉对方怎么改。 */
  message?: string;
}

/** 单独出现即拦。这些表述没有正当创作解释。 */
const HARD_BLOCK_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  category: PromptSafetyCategory;
}> = [
  // 换脸 / 脱衣类工具语：其目的就是非自愿私密影像
  { pattern: /nudify/i, category: "ncii" },
  { pattern: /undress(ing)?\s*(her|him|them|photo|image|person)/i, category: "ncii" },
  { pattern: /deep\s*fake\s*(porn|nude|sex)/i, category: "ncii" },
  { pattern: /(一键|ai)?\s*脱衣/i, category: "ncii" },
  { pattern: /换脸\s*(色情|裸|情色|av)/i, category: "ncii" },
  { pattern: /revenge\s*porn/i, category: "ncii" },
  // CSAM 圈内术语
  { pattern: /\bcsam\b/i, category: "csam" },
  { pattern: /\bc\s*p\s*(porn|pics?)\b/i, category: "csam" },
  { pattern: /\b(lolicon|shotacon)\b/i, category: "csam" },
  { pattern: /\bpedophil/i, category: "csam" },
  { pattern: /恋童/, category: "csam" },
  { pattern: /幼\s*女\s*(色情|裸|情色|av|片)/, category: "csam" },
  { pattern: /(童|儿童)\s*色情/, category: "csam" },
];

/** 未成年人指示词。 */
const MINOR_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(child|children|kid|kids|toddler|infant|baby|babies)\b/i,
  /\b(minor|minors|underage|under\s*age|pre\s*teen|preteen)\b/i,
  /\b(teen|teens|teenage|teenager|schoolgirl|schoolboy)\b/i,
  /\b(little|young)\s+(girl|boy|sister|brother)\b/i,
  /\b(elementary|middle|primary)\s*school/i,
  /\b(\d|1[0-7])\s*(year|yr|yo)s?\s*old\b/i,
  /\b(loli|shota)\b/i,
  /(儿童|小孩|孩童|幼童|幼儿|婴儿|未成年)/,
  /(小学生|初中生|中学生|学龄)/,
  /(小女孩|小男孩|幼女|男童|女童)/,
  /(十[一二三四五六七]|[0-9]|1[0-7])\s*岁/,
];

/** 性相关指示词。 */
const SEXUAL_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(nude|nudity|naked|topless|bottomless)\b/i,
  /\b(sex|sexual|sexy|sexualiz|erotic|porn|pornographic|hentai)\b/i,
  /\b(nsfw|explicit|lewd|fetish|bdsm)\b/i,
  /\b(genital|genitalia|nipple|nipples|cleavage|crotch)\b/i,
  /\b(lingerie|underwear|panties|bikini|thong)\b/i,
  /\b(seductive|provocative|suggestive)\s*(pose|posing)?\b/i,
  /\b(spread|spreading)\s*legs\b/i,
  /(裸体|全裸|半裸|裸露|脱光|无码)/,
  /(色情|情色|性爱|性感|淫|猥亵|媚)/,
  /(内衣|内裤|比基尼|丁字裤|情趣)/,
  /(挑逗|诱惑|暗示性|勾引)/,
];

/**
 * 归一化：大小写、全角、变音符号。
 *
 * 只对**拉丁字母**做后续的去混淆处理：中文没有词边界，
 * 去掉标点会把相邻的正常词粘成假命中。
 */
function normalize(input: string): string {
  return input
    .normalize("NFKD")
    // 去掉组合用变音符号（NFKD 拆出来的那部分）
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * leetspeak 还原。`1` 是**歧义**的——既可能是 `i`（`ch1ld`）也可能是 `l`
 * （`l1ttle`），所以这里返回两种还原结果，两种都参与匹配。
 * 其余字符是单射，合并在同一轮里处理。
 */
function expandLeetVariants(input: string): string[] {
  const base = input
    .replace(/[@4]/g, "a")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t");

  if (!base.includes("1")) return [base];
  return [base.replace(/1/g, "i"), base.replace(/1/g, "l")];
}

/**
 * 识别 `c.h.i.l.d` / `n-u-d-e` 这类用标点拆开的写法。
 *
 * **刻意不处理空格**：空格既可能是拆字用的，也可能是正常词间距。
 * 一并吃掉会把 `nude child` 粘成 `nudechild`，词边界随即失配，
 * 结果是为了防绕过反而放过了原本能拦的输入。空格那种写法交给
 * `collapseSpacedLetters` 单独处理。
 */
function collapsePunctuationSeparators(input: string): string {
  return input.replace(/([a-z])[._\-*+~|/\\]+(?=[a-z])/g, "$1");
}

/**
 * 识别 `n u d e   c h i l d` 这类逐字母敲空格的写法。
 *
 * 只合并**单空格连接的单字母串**，2 个以上空格视为词边界保留下来——
 * 这样 `n u d e` 与 `c h i l d` 各自还原成词，而不是糊成一坨。
 */
function collapseSpacedLetters(input: string): string {
  return input.replace(/\b(?:[a-z] )+[a-z]\b/g, (run) => run.replace(/ /g, ""));
}

function matchesAny(patterns: ReadonlyArray<RegExp>, variants: string[]): boolean {
  return patterns.some((pattern) => variants.some((text) => pattern.test(text)));
}

const REJECTION_MESSAGE =
  "提示词未通过内容安全检查，请修改后重试。本服务禁止生成涉及未成年人的性化内容，" +
  "以及针对真实人物的非自愿私密影像。";

/**
 * 检查提示词。被拦下时调用方**必须不扣积分**——
 * 详见 `/terms` 第四条对用户的承诺。
 */
export function checkPromptSafety(prompt: string): PromptSafetyResult {
  if (!prompt) return { allowed: true };

  // 原文必须保留一份：数字会被 leet 还原吃掉，而「13 year old」这类
  // 年龄信号恰恰依赖数字。
  const normalized = normalize(prompt);
  const variants = new Set<string>([prompt.toLowerCase(), normalized]);

  for (const leet of expandLeetVariants(normalized)) {
    const punctCollapsed = collapsePunctuationSeparators(leet);
    variants.add(leet);
    variants.add(punctCollapsed);
    variants.add(collapseSpacedLetters(punctCollapsed));
  }

  const texts = [...variants];

  for (const { pattern, category } of HARD_BLOCK_PATTERNS) {
    if (texts.some((text) => pattern.test(text))) {
      return { allowed: false, category, message: REJECTION_MESSAGE };
    }
  }

  const hasMinor = matchesAny(MINOR_PATTERNS, texts);
  const hasSexual = matchesAny(SEXUAL_PATTERNS, texts);

  if (hasMinor && hasSexual) {
    return { allowed: false, category: "csam", message: REJECTION_MESSAGE };
  }

  return { allowed: true };
}
