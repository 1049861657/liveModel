export interface Emoji {
  emoji: string;
  type?: 'text' | 'image';
  url?: string;
}

export interface EmojiCategory {
  name: string;
  key: string; // 用于国际化的键名
  emojis: Emoji[];
}

export const emojiCategories: EmojiCategory[] = [
  {
    name: "表情",
    key: "face",
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
  },
  {
    name: "梗图",
    key: "meme",
    emojis: [
      { 
        emoji: "{{meme:流汗龙}}",
        type: "image",
        url: "https://minio.livemodel.xyz/livemodel/images/Built-in Emojis/流汗龙.png" 
      },
      {
        emoji: "{{meme:挠头龙}}",
        type: "image",
        url: "https://minio.livemodel.xyz/livemodel/images/Built-in Emojis/挠头龙.png" 
      }
    ]
  }
]; 