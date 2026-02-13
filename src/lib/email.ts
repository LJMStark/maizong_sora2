import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const getFromEmail = () =>
  process.env.RESEND_FROM_EMAIL || "noreply@example.com";

export async function sendVerificationEmail(email: string, url: string) {
  await getResend().emails.send({
    from: getFromEmail(),
    to: email,
    subject: "验证您的邮箱 - Little Elephant Studio",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a;">验证您的邮箱</h2>
        <p style="color: #4b5563; line-height: 1.6;">感谢您注册 Little Elephant Studio，请点击下方按钮验证您的邮箱地址：</p>
        <a href="${url}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">验证邮箱</a>
        <p style="color: #9ca3af; font-size: 13px;">如果您没有注册过，请忽略此邮件。</p>
      </div>
    `,
  });
}

export async function sendResetPasswordEmail(email: string, url: string) {
  await getResend().emails.send({
    from: getFromEmail(),
    to: email,
    subject: "重置密码 - Little Elephant Studio",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a;">重置您的密码</h2>
        <p style="color: #4b5563; line-height: 1.6;">您请求了密码重置，请点击下方按钮设置新密码：</p>
        <a href="${url}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">重置密码</a>
        <p style="color: #9ca3af; font-size: 13px;">如果您没有请求重置密码，请忽略此邮件。链接将在 1 小时后失效。</p>
      </div>
    `,
  });
}
