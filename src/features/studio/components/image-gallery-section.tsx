"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PromptGallery,
  type PromptGalleryCategory,
  type PromptGalleryItem,
} from "./shared/prompt-gallery";
import {
  IMAGE_GALLERY,
  IMAGE_GALLERY_CATEGORIES,
} from "../data/image-gallery";
import type {
  XiaoxiaodongGalleryIndex,
  XiaoxiaodongGalleryTopicFile,
} from "../data/xiaoxiaodong-cdn";
import { mergeGalleryCategories } from "../utils/merge-gallery-categories";

interface ImageGallerySectionProps {
  onSelect: (item: PromptGalleryItem) => void;
  leadingTile?: React.ReactNode;
}

const topicCache = new Map<string, PromptGalleryItem[]>();

async function fetchGalleryIndex() {
  const response = await fetch("/api/gallery/xiaoxiaodong");
  if (!response.ok) return null;
  return (await response.json()) as XiaoxiaodongGalleryIndex;
}

async function fetchGalleryTopic(key: string) {
  const cached = topicCache.get(key);
  if (cached) return cached;

  const response = await fetch(
    `/api/gallery/xiaoxiaodong?topic=${encodeURIComponent(key)}`
  );
  if (!response.ok) return [];
  const data = (await response.json()) as XiaoxiaodongGalleryTopicFile;
  const items = data.items ?? [];
  topicCache.set(key, items);
  return items;
}

export default function ImageGallerySection({
  onSelect,
  leadingTile,
}: ImageGallerySectionProps) {
  const [index, setIndex] = useState<XiaoxiaodongGalleryIndex | null>(null);
  const [topicItems, setTopicItems] = useState<PromptGalleryItem[]>([]);
  const [loadingTopic, setLoadingTopic] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchGalleryIndex()
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch(() => {
        if (!cancelled) setIndex(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const extraCategories = useMemo<PromptGalleryCategory[]>(
    () =>
      (index?.topics ?? []).map((topic) => ({
        key: topic.key,
        label: topic.label,
      })),
    [index]
  );

  const categories = useMemo(
    () => mergeGalleryCategories(IMAGE_GALLERY_CATEGORIES, extraCategories),
    [extraCategories]
  );

  const items = useMemo(
    () => [...IMAGE_GALLERY, ...(index?.featured ?? []), ...topicItems],
    [index, topicItems]
  );

  const handleCategoryChange = (key: string) => {
    const isRemoteTopic = Boolean(
      index?.topics.some((topic) => topic.key === key)
    );
    if (!isRemoteTopic) {
      setLoadingTopic(false);
      return;
    }

    if (topicCache.has(key)) {
      setTopicItems(topicCache.get(key) ?? []);
      setLoadingTopic(false);
      return;
    }

    setLoadingTopic(true);
    fetchGalleryTopic(key)
      .then((nextItems) => {
        setTopicItems(nextItems);
      })
      .finally(() => {
        setLoadingTopic(false);
      });
  };

  return (
    <PromptGallery
      categories={categories}
      items={items}
      onSelect={onSelect}
      leadingTile={leadingTile}
      onCategoryChange={handleCategoryChange}
      loading={loadingTopic}
    />
  );
}
