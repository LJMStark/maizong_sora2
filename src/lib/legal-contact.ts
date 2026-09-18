/**
 * 法务与滥用举报的对外联系方式。
 *
 * ⚠️ 上线前必须逐项确认「这个信箱真的能收到信」。
 * `RESEND_FROM_EMAIL` 用的是同一个域名，但 Resend 只负责**发信**——
 * 域名要能**收信**得另配 MX 记录。DMCA 代理人与 NCII（TAKE IT DOWN Act）
 * 通报点如果留了一个收不到信的地址，比不留更糟：
 * 前者让 DMCA 安全港失效，后者是 48 小时下架义务的直接违反。
 *
 * 填好后把 `CONTACT_VERIFIED` 改成 true，构建期校验才会放行。
 */
export const CONTACT_VERIFIED = false;

/** 通用支持 / 付款开通咨询 */
export const SUPPORT_EMAIL = "support@sora2.681023.xyz";

/** DMCA 版权通知专用（需同时在美国版权局在线系统登记，$6，每 3 年续期） */
export const DMCA_EMAIL = "dmca@sora2.681023.xyz";

/** 非自愿私密影像（NCII）紧急下架通报点 —— 48 小时 SLA */
export const ABUSE_EMAIL = "abuse@sora2.681023.xyz";

/**
 * 付款与开通的人工客服渠道。目前购买流程是「生成订单号 → 联系客服 → 管理员开通」，
 * 而这里留空的话用户拿到订单号就走不下去了。
 * 填微信号 / Telegram / QQ 任一即可，`label` 会直接显示在购买弹窗里。
 */
export const SUPPORT_CHANNELS: ReadonlyArray<{
  label: string;
  value: string;
  href?: string;
}> = [
  { label: "邮箱", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  // { label: "微信", value: "your-wechat-id" },
  // { label: "Telegram", value: "@your_handle", href: "https://t.me/your_handle" },
];

/** 运营主体名称。中国《AI 生成合成内容标识办法》第五条要求隐式标识里带服务提供者名称。 */
export const LEGAL_ENTITY_NAME = "小象万象";

/** 条款/政策的最后更新日期，随内容变更一起改。 */
export const LEGAL_LAST_UPDATED = "2026-09-18";
