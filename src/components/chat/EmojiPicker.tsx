'use client'

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { emojiCategories } from '@/config/emojis';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
}

export function EmojiPicker({ onSelectEmoji }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>(emojiCategories[0].name);

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
          className="bg-white rounded-xl shadow-lg border border-gray-200 w-64 max-h-72 overflow-hidden p-2 animate-fadeIn z-50"
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
                key={category.name}
                className={`px-3 py-1 text-xs rounded-lg mr-1 whitespace-nowrap ${
                  activeCategory === category.name
                    ? 'bg-purple-100 text-purple-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation(); // 阻止事件冒泡
                  setActiveCategory(category.name);
                }}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* 表情网格 */}
          <div className="overflow-y-auto max-h-52 p-1">
            <div className="grid grid-cols-7 gap-1">
              {emojiCategories
                .find((cat) => cat.name === activeCategory)
                ?.emojis.map((emoji) => (
                  <button
                    key={emoji.emoji}
                    className="p-1 text-lg hover:bg-purple-50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => onSelectEmoji(emoji.emoji)}
                  >
                    {emoji.emoji}
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