"use client";

import {
  PromptGallery,
  type PromptGalleryItem,
} from "./shared/prompt-gallery";
import {
  IMAGE_GALLERY,
  IMAGE_GALLERY_CATEGORIES,
} from "../data/image-gallery";

interface ImageGallerySectionProps {
  onSelect: (item: PromptGalleryItem) => void;
  leadingTile?: React.ReactNode;
}

// 独立成组件按需加载：灵感库数据体积大，避免打进工作台首屏 chunk。
export default function ImageGallerySection({
  onSelect,
  leadingTile,
}: ImageGallerySectionProps) {
  return (
    <PromptGallery
      categories={IMAGE_GALLERY_CATEGORIES}
      items={IMAGE_GALLERY}
      onSelect={onSelect}
      leadingTile={leadingTile}
    />
  );
}
