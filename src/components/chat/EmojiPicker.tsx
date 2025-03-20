'use client'

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { emojiCategories } from '@/config/emojis';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
}

export function EmojiPicker({ onSelectEmoji }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>(emojiCategories[0].key);
  const t = useTranslations('ChatPage');

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="relative p-1.5 hover:bg-purple-100 rounded-full transition-colors focus:outline-none group"
        >
          <span className="text-base text-gray-600 group-hover:text-purple-600">😀</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-white rounded-xl shadow-lg border border-gray-200 w-80 max-h-72 overflow-hidden p-2 animate-fadeIn z-50"
          sideOffset={5}
          side="top"
          align="start"
          alignOffset={-40}
          avoidCollisions={false}
        >
          {/* 表情分类 */}
          <div className="flex border-b border-gray-100 mb-2 pb-2 overflow-x-auto">
            {emojiCategories.map((category) => (
              <button
                key={category.key}
                className={`px-3 py-1 text-xs rounded-lg mr-1 whitespace-nowrap ${
                  activeCategory === category.key
                    ? 'bg-purple-100 text-purple-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation(); // 阻止事件冒泡
                  setActiveCategory(category.key);
                }}
              >
                {t(`emoji.categories.${category.key}`)}
              </button>
            ))}
          </div>

          {/* 表情网格 */}
          <div className="overflow-y-auto max-h-52 p-1">
            <div className={`grid ${activeCategory === 'meme' ? 'grid-cols-3' : 'grid-cols-7'} gap-1`}>
              {emojiCategories
                .find((cat) => cat.key === activeCategory)
                ?.emojis.map((emoji) => (
                  <button
                    key={emoji.emoji}
                    className="p-1 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors flex items-center justify-center"
                    onClick={() => onSelectEmoji(emoji.emoji)}
                  >
                    {emoji.type === 'image' && emoji.url ? (
                      <div className="w-16 h-16 relative">
                        <Image 
                          src={emoji.url} 
                          alt={emoji.emoji}
                          width={64}
                          height={64}
                          style={{ width: 'auto', height: 'auto' }}
                          className="rounded-md"
                        />
                      </div>
                    ) : (
                      <span className="text-lg">{emoji.emoji}</span>
                    )}
                  </button>
                ))}
            </div>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
} 