"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SHOWCASE_EXAMPLES, ShowcaseExample } from '../data/showcase-examples';

interface ShowcaseGalleryProps {
  onSelectPrompt: (prompt: string) => void;
}

const ShowcaseGallery: React.FC<ShowcaseGalleryProps> = ({ onSelectPrompt }) => {
  const t = useTranslations('studio.image');
  const [isPaused, setIsPaused] = useState(false);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  const randomizedExamples = SHOWCASE_EXAMPLES;

  // Split randomized examples into two columns
  const leftExamples = randomizedExamples.filter((_, i) => i % 2 === 0);
  const rightExamples = randomizedExamples.filter((_, i) => i % 2 === 1);

  // Duplicate for seamless loop
  const leftItems = [...leftExamples, ...leftExamples, ...leftExamples];
  const rightItems = [...rightExamples, ...rightExamples, ...rightExamples];

  useEffect(() => {
    if (isPaused) return;

    const leftColumn = leftColumnRef.current;
    const rightColumn = rightColumnRef.current;
    if (!leftColumn || !rightColumn) return;

    let leftScrollPos = 0;
    let rightScrollPos = rightColumn.scrollHeight / 3;

    // Set initial position for right column (start from middle for downward scroll)
    rightColumn.scrollTop = rightScrollPos;

    const speed = 0.5; // pixels per frame

    const animate = () => {
      if (isPaused) return;

      // Left column scrolls up
      leftScrollPos += speed;
      if (leftScrollPos >= leftColumn.scrollHeight / 3) {
        leftScrollPos = 0;
      }
      leftColumn.scrollTop = leftScrollPos;

      // Right column scrolls down
      rightScrollPos -= speed;
      if (rightScrollPos <= 0) {
        rightScrollPos = rightColumn.scrollHeight / 3;
      }
      rightColumn.scrollTop = rightScrollPos;

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  const handleCardClick = (example: ShowcaseExample) => {
    onSelectPrompt(example.promptZh);
  };

  const usePromptLabel = t('showcase.usePrompt');

  return (
    <div
      className="w-full h-full flex gap-3 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left Column - scrolls up */}
      <div
        ref={leftColumnRef}
        className="flex-1 overflow-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex flex-col gap-3">
          {leftItems.map((example, index) => (
            <ShowcaseCard
              key={`left-${example.id}-${index}`}
              example={example}
              onClick={() => handleCardClick(example)}
              usePromptLabel={usePromptLabel}
            />
          ))}
        </div>
      </div>

      {/* Right Column - scrolls down */}
      <div
        ref={rightColumnRef}
        className="flex-1 overflow-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex flex-col gap-3">
          {rightItems.map((example, index) => (
            <ShowcaseCard
              key={`right-${example.id}-${index}`}
              example={example}
              onClick={() => handleCardClick(example)}
              usePromptLabel={usePromptLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface ShowcaseCardProps {
  example: ShowcaseExample;
  onClick: () => void;
  usePromptLabel: string;
}

const ShowcaseCard: React.FC<ShowcaseCardProps> = ({ example, onClick, usePromptLabel }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white transition-all duration-300 hover:border-[#b8b8b8] hover:shadow-sm"
    >
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-[#f4f4f4]">
        {!imageError ? (
          <img
            src={example.image}
            alt={example.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[#cfcfcf]">image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h5 className="mb-1.5 truncate text-xs font-medium text-[#0d0d0d]">
          {example.title}
        </h5>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-[#777]">
          {example.promptZh}
        </p>
      </div>

      {/* Hover overlay with click hint */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/10 group-hover:opacity-100">
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[#0d0d0d] shadow-lg">
          {usePromptLabel}
        </span>
      </div>
    </div>
  );
};

export default ShowcaseGallery;
