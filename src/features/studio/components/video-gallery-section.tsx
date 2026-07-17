"use client";

import {
  PromptGallery,
  type PromptGalleryItem,
} from "./shared/prompt-gallery";
import {
  VIDEO_GALLERY,
  VIDEO_GALLERY_CATEGORIES,
} from "../data/video-gallery";

interface VideoGallerySectionProps {
  onSelect: (item: PromptGalleryItem) => void;
  leadingTile?: React.ReactNode;
}

// 独立成组件按需加载：灵感库数据体积大，避免打进工作台首屏 chunk。
export default function VideoGallerySection({
  onSelect,
  leadingTile,
}: VideoGallerySectionProps) {
  return (
    <PromptGallery
      categories={VIDEO_GALLERY_CATEGORIES}
      items={VIDEO_GALLERY}
      onSelect={onSelect}
      leadingTile={leadingTile}
    />
  );
}
