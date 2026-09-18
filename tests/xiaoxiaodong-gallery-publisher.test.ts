import assert from "node:assert/strict";
import test from "node:test";
import { keepRepresentativeStyleExamples } from "../tools/publish-xiaoxiaodong-gallery.mjs";

test("xiaoxiaodong gallery keeps one representative example per style", () => {
  const examples = [
    { title: "变种-01-品牌周年主视觉" },
    { title: "变种-02-未来新品发布" },
    { title: "变种-03-会员日活动海报" },
  ];

  assert.deepEqual(keepRepresentativeStyleExamples(examples), [examples[0]]);
  assert.equal(examples.length, 3);
});

test("xiaoxiaodong gallery accepts an empty style", () => {
  assert.deepEqual(keepRepresentativeStyleExamples([]), []);
});
