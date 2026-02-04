import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async () => {
  // 暂时使用默认语言,后续可以从 cookie 或 Accept-Language 读取
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`./locales/${locale}/index.ts`)).default,
  };
});
