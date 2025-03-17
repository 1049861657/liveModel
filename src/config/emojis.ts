export interface Emoji {
  emoji: string;
}

export interface EmojiCategory {
  name: string;
  emojis: Emoji[];
}

export const emojiCategories: EmojiCategory[] = [
  {
    name: "表情",
    emojis: [
      { emoji: "😀" },
      { emoji: "😄" },
      { emoji: "😊" },
      { emoji: "🙂" },
      { emoji: "😍" },
      { emoji: "😘" },
      { emoji: "🤔" },
      { emoji: "😮" },
      { emoji: "👍" },
      { emoji: "👋" },
      { emoji: "👏" },
      { emoji: "🙏" },
      { emoji: "✌️" },
      { emoji: "🤝" },
      { emoji: "❤️" },
      { emoji: "✨" },
      { emoji: "🔥" },
      { emoji: "⭐" },
      { emoji: "🎉" }
    ]
  }
]; 