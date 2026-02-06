"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SHOWCASE_EXAMPLES, ShowcaseExample, shuffleExamples } from '../data/showcase-examples';

interface ShowcaseGalleryProps {
  onSelectPrompt: (prompt: string) => void;
}

const ShowcaseGallery: React.FC<ShowcaseGalleryProps> = ({ onSelectPrompt }) => {
  const t = useTranslations('studio.image');
  const [isPaused, setIsPaused] = useState(false);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  // Randomize examples only on client side to avoid hydration mismatch
  const [randomizedExamples, setRandomizedExamples] = useState<ShowcaseExample[]>(SHOWCASE_EXAMPLES);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Only shuffle on client side after hydration
    setRandomizedExamples(shuffleExamples(SHOWCASE_EXAMPLES));
    setIsClient(true);
  }, []);

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
}

const ShowcaseCard: React.FC<ShowcaseCardProps> = ({ example, onClick }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer bg-white border border-[#e5e5e1] rounded-sm overflow-hidden hover:border-[#1a1a1a] hover:shadow-md transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-[#faf9f6]">
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
            <span className="material-symbols-outlined text-3xl text-[#e5e5e1]">image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h5 className="text-xs font-bold text-[#1a1a1a] mb-1.5 truncate">
          {example.title}
        </h5>
        <p className="text-[10px] text-[#4b5563] line-clamp-2 leading-relaxed">
          {example.promptZh}
        </p>
      </div>

      {/* Hover overlay with click hint */}
      <div className="absolute inset-0 bg-[#1a1a1a]/0 group-hover:bg-[#1a1a1a]/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <span className="bg-white/90 text-[#1a1a1a] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
          使用此提示词
        </span>
      </div>
    </div>
  );
};

export default ShowcaseGallery;
