export type ContentItem = 
  | string 
  | { 
      type: 'image'
      src: string
      alt: string
      width: number
      height: number
    }
  | {
      type: 'steps'
      content: string[]
    }
  | {
      type: 'list'
      items: {
        title: string
        description: string
      }[]
    }

export interface Question {
  id: string
  q: string
  a: ContentItem | ContentItem[]
}

export interface Category {
  id: string
  category: string
  questions: Question[]
} 