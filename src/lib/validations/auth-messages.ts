import { getTranslations } from 'next-intl/server';

export async function getSignInValidationMessages() {
  const t = await getTranslations('auth.validation');
  return {
    usernameRequired: t('usernameRequired'),
    usernameMin: t('usernameMin'),
    passwordRequired: t('passwordRequired'),
    passwordMin: t('passwordMin'),
  };
}
