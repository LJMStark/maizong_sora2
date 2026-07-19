import assert from "node:assert/strict";
import test from "node:test";
import { ENABLE_ALTERNATIVE_LOGIN_OPTIONS } from "../../src/lib/auth/login-options";
import {
  getBetterAuthSocialProviders,
  getSocialProviderAvailability,
} from "../../src/lib/auth/social-providers";

test("非邮箱登录总开关同时控制提供商可用状态和服务端配置", () => {
  const originalEnv = {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    appleClientId: process.env.APPLE_CLIENT_ID,
    appleClientSecret: process.env.APPLE_CLIENT_SECRET,
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  };

  try {
    process.env.GOOGLE_CLIENT_ID = "configured";
    process.env.GOOGLE_CLIENT_SECRET = "configured";
    process.env.APPLE_CLIENT_ID = "configured";
    process.env.APPLE_CLIENT_SECRET = "configured";
    process.env.MICROSOFT_CLIENT_ID = "configured";
    process.env.MICROSOFT_CLIENT_SECRET = "configured";

    const enabled = ENABLE_ALTERNATIVE_LOGIN_OPTIONS;
    assert.deepEqual(getSocialProviderAvailability(), {
      google: enabled,
      apple: enabled,
      microsoft: enabled,
    });
    assert.equal(
      Object.keys(getBetterAuthSocialProviders()).length,
      enabled ? 3 : 0
    );
  } finally {
    for (const [key, value] of Object.entries({
      GOOGLE_CLIENT_ID: originalEnv.googleClientId,
      GOOGLE_CLIENT_SECRET: originalEnv.googleClientSecret,
      APPLE_CLIENT_ID: originalEnv.appleClientId,
      APPLE_CLIENT_SECRET: originalEnv.appleClientSecret,
      MICROSOFT_CLIENT_ID: originalEnv.microsoftClientId,
      MICROSOFT_CLIENT_SECRET: originalEnv.microsoftClientSecret,
    })) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
