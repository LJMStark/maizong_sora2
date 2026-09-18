/**
 * 一次性邮箱域名拦截。
 *
 * 为什么值得做：新账号注册即得 50 积分（`user.credits` 的默认值），而
 * `requireEmailVerification` 挡不住一次性邮箱——那些服务能正常收到验证邮件。
 * 反欺诈行业里，「注册时拦一次性邮箱域名」是公认投入产出比最高的一层。
 *
 * 这份名单**不求穷尽**（一次性邮箱域名成千上万且每天新增），只覆盖量最大的那批。
 * 它是第一层摩擦，不是完整方案；持久的信号是设备指纹，那属于后续迭代。
 *
 * 注意：加域名时只写**注册域**，子域由 `isDisposableEmailDomain` 自动覆盖
 * （`foo.mailinator.com` 会因为后缀匹配到 `mailinator.com` 而被拦）。
 */
const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  // Mailinator 系（公共收件箱，任何人可读，同时也是隐私事故来源）
  "mailinator.com",
  "mailinator.net",
  "reallymymail.com",
  "sogetthis.com",
  // 10 分钟类
  "10minutemail.com",
  "10minutemail.net",
  "10minemail.com",
  "20minutemail.com",
  "minuteinbox.com",
  "tempmailo.com",
  // Guerrilla Mail 系
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "guerrillamail.de",
  "grr.la",
  "sharklasers.com",
  "spam4.me",
  // temp-mail 系
  "temp-mail.org",
  "temp-mail.io",
  "tempmail.com",
  "tempmail.net",
  "tempmailaddress.com",
  "tmpmail.org",
  "tmpeml.com",
  "tempr.email",
  "tempmail.plus",
  // YOPmail
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  // 其余常见
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.de",
  "trash-mail.com",
  "wegwerfmail.de",
  "dispostable.com",
  "maildrop.cc",
  "mailnesia.com",
  "mailcatch.com",
  "getnada.com",
  "nada.email",
  "inboxkitten.com",
  "mohmal.com",
  "fakeinbox.com",
  "fakemailgenerator.com",
  "emailondeck.com",
  "moakt.com",
  "mailsac.com",
  "burnermail.io",
  "anonaddy.me",
  "mail7.io",
  "linshiyouxiang.net",
  "chacuo.net",
  "bccto.me",
  "24mail.chacuo.net",
  "0box.eu",
  "discard.email",
  "spambog.com",
  "mytemp.email",
  "email-temp.com",
  "dropmail.me",
  "harakirimail.com",
  "vomoto.com",
  "mailbox92.biz",
]);

/** 提取并归一化邮箱域名；输入不像邮箱时返回 null。 */
export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;

  const domain = email.slice(at + 1).trim().toLowerCase();
  // 去掉可能的尾部点（`user@example.com.` 是合法的 FQDN 写法）
  const normalized = domain.replace(/\.+$/, "");

  return normalized.includes(".") ? normalized : null;
}

/**
 * 域名本身或其任一父域命中名单即为一次性邮箱。
 * 后缀匹配按「点」对齐，`notmailinator.com` 不会被误伤。
 */
export function isDisposableEmailDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase().replace(/\.+$/, "");
  if (!normalized) return false;
  if (DISPOSABLE_DOMAINS.has(normalized)) return true;

  const parts = normalized.split(".");
  for (let i = 1; i < parts.length - 1; i += 1) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join("."))) return true;
  }

  return false;
}

/** 便捷入口：整个邮箱地址是否属于一次性邮箱。无法解析出域名时返回 false。 */
export function isDisposableEmail(email: string): boolean {
  const domain = extractEmailDomain(email);
  return domain !== null && isDisposableEmailDomain(domain);
}

export const DISPOSABLE_EMAIL_MESSAGE =
  "请使用常用邮箱注册，一次性邮箱无法接收后续通知";
