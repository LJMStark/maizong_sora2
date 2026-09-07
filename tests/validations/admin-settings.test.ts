import assert from "node:assert/strict";
import test from "node:test";
import { AdminSettingsSchema } from "../../src/lib/validations/admin-settings";

test("配置更新允许局部修改、无限额和免费生成", () => {
  assert.deepEqual(AdminSettingsSchema.parse({ dailyFastVideoLimit: -1, creditCostImage: 0 }), {
    dailyFastVideoLimit: -1,
    creditCostImage: 0,
  });
  assert.deepEqual(AdminSettingsSchema.parse({ videoFastProvider: "veo" }), { videoFastProvider: "veo" });
});

test("所有限额和积分字段拒绝小数、字符串和越界值", () => {
  const fields = [
    "dailyFastVideoLimit", "dailyQualityVideoLimit", "dailyPptLimit",
    "creditCostVideoFast", "creditCostVideoQuality", "creditCostImage", "creditCostPptPage",
  ];
  for (const field of fields) {
    for (const value of [1.5, "10", null, -2, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(AdminSettingsSchema.safeParse({ [field]: value }).success, false, `${field}: ${value}`);
    }
    if (field.startsWith("creditCost")) {
      assert.equal(AdminSettingsSchema.safeParse({ [field]: -1 }).success, false, field);
    }
  }
});

test("配置只接受已支持的供应商和对象请求体", () => {
  for (const field of ["videoFastProvider", "videoQualityProvider"]) {
    assert.equal(AdminSettingsSchema.safeParse({ [field]: "unknown" }).success, false);
  }
  for (const body of [null, [], "settings"]) {
    assert.equal(AdminSettingsSchema.safeParse(body).success, false);
  }
});
