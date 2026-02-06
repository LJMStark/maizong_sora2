/**
 * 生成兑换码：XXXX-XXXX-XXXX 格式
 * 使用大写字母和数字（排除易混淆字符：0,O,1,I,L）
 */
export function generateRedemptionCode(): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 30个字符
  const segments = 3;
  const segmentLength = 4;

  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  }).join("-");

  return code;
}

/**
 * 验证兑换码格式
 */
export function validateCodeFormat(code: string): boolean {
  const pattern =
    /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;
  return pattern.test(code);
}

/**
 * 格式化兑换码（自动转大写并添加分隔符）
 */
export function formatRedemptionCode(input: string): string {
  const cleaned = input.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (cleaned.length !== 12) return input.toUpperCase();

  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`;
}
