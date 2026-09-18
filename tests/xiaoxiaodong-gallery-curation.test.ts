import assert from "node:assert/strict";
import test from "node:test";

import {
  curateItems,
  MERGED_TOPIC_LABEL,
  MIN_TOPIC_ITEMS,
  POSTER_TOPICS,
  TOPIC_ITEM_CAP,
} from "../tools/publish-xiaoxiaodong-gallery.mjs";

type Item = {
  id: string;
  category: string;
  topicLabel: string;
  score: number;
};

function makeItems(category: string, count: number, baseScore = 0): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${category}-${i}`,
    category,
    topicLabel: category,
    // 分数递减，方便断言「留下的是高分那批」
    score: baseScore + count - i,
  }));
}

function countByCategory(items: Item[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) {
    out.set(item.category, (out.get(item.category) ?? 0) + 1);
  }
  return out;
}

test("五个海报类目合并成一个", () => {
  const input = POSTER_TOPICS.flatMap((topic: string) => makeItems(topic, 10));

  const counts = countByCategory(curateItems(input) as Item[]);

  assert.deepEqual([...counts.keys()], [MERGED_TOPIC_LABEL]);
});

test("合并后的海报类目同样受封顶约束", () => {
  const input = POSTER_TOPICS.flatMap((topic: string) => makeItems(topic, 100));

  const counts = countByCategory(curateItems(input) as Item[]);

  assert.equal(counts.get(MERGED_TOPIC_LABEL), TOPIC_ITEM_CAP);
});

test("超过上限的类目按分数保留高分条目", () => {
  const input = makeItems("酒店", TOPIC_ITEM_CAP + 20);

  const kept = curateItems(input) as Item[];

  assert.equal(kept.length, TOPIC_ITEM_CAP);
  const lowest = Math.min(...kept.map((i) => i.score));
  const dropped = input.filter((i) => !kept.some((k) => k.id === i.id));
  assert.ok(
    dropped.every((i) => i.score <= lowest),
    "被丢掉的条目分数必须不高于保留下来的"
  );
});

test("条目数不足下限的类目整体去掉", () => {
  const input = [
    ...makeItems("酒店", 30),
    ...makeItems("冬至", MIN_TOPIC_ITEMS - 1),
  ];

  const counts = countByCategory(curateItems(input) as Item[]);

  assert.equal(counts.get("酒店"), 30);
  assert.equal(counts.has("冬至"), false);
});

test("刚好达到下限的类目保留", () => {
  const input = makeItems("秋分", MIN_TOPIC_ITEMS);

  assert.equal((curateItems(input) as Item[]).length, MIN_TOPIC_ITEMS);
});

test("未超上限的类目原样保留，不会被削", () => {
  const input = makeItems("婚纱", 10);

  assert.equal((curateItems(input) as Item[]).length, 10);
});

test("合并会同时改写 category 与 topicLabel，避免目录键与展示名不一致", () => {
  const input = makeItems("电影海报", 10);

  const [first] = curateItems(input) as Item[];

  assert.equal(first.category, MERGED_TOPIC_LABEL);
  assert.equal(first.topicLabel, MERGED_TOPIC_LABEL);
});

test("合并的小类目累加后可以越过下限而不被砍掉", () => {
  // 音乐海报单独只有 3 条会被砍；并进「海报」后应当留下
  const input = [...makeItems("音乐海报", 3), ...makeItems("海报版式", 10)];

  const counts = countByCategory(curateItems(input) as Item[]);

  assert.equal(counts.get(MERGED_TOPIC_LABEL), 13);
});

test("输入为空时不抛异常", () => {
  assert.deepEqual(curateItems([]), []);
});

test("curateItems 不修改传入的数组", () => {
  const input = makeItems("酒店", TOPIC_ITEM_CAP + 5);
  const snapshot = input.map((i) => i.id);

  curateItems(input);

  assert.deepEqual(
    input.map((i) => i.id),
    snapshot
  );
});
