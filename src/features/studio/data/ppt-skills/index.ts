export * from "./types";

import type { PptSkill, PptStyle } from "./types";
import { guizangSkill } from "./guizang";
import { nanobananaSkill } from "./nanobanana";
import { codexSkill } from "./codex";
import { gptImage2Skill } from "./gptImage2";
import { baoyuSkill } from "./baoyu";
import { pptMasterSkill } from "./pptMaster";
import { huashuSkill } from "./huashu";

export {
  guizangSkill,
  nanobananaSkill,
  codexSkill,
  gptImage2Skill,
  baoyuSkill,
  pptMasterSkill,
  huashuSkill,
};

export const PPT_SKILLS: PptSkill[] = [
  guizangSkill,
  baoyuSkill,
  huashuSkill,
  nanobananaSkill,
  codexSkill,
  gptImage2Skill,
  pptMasterSkill,
];

export function getPptSkill(key: string): PptSkill | undefined {
  return PPT_SKILLS.find((skill) => skill.key === key);
}

export function getPptStyle(
  skillKey: string,
  styleKey: string,
): { skill: PptSkill; style: PptStyle } | undefined {
  const skill = getPptSkill(skillKey);
  if (!skill) return undefined;

  const style = skill.styles.find((item) => item.key === styleKey);
  if (!style) return undefined;

  return { skill, style };
}
