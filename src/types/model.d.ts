import { type Model as PrismaModel } from '@prisma/client'

export interface ExtendedModel extends PrismaModel {
  isFavorited?: boolean
  user?: {
    name: string | null
    email: string
  }
  _count?: {
    favorites: number
    reviews: number
  }
  avgRating?: number | null
  totalReviews?: number
  smdPath?: string
  animations?: {
    id: string
    name: string
    filePath: string
    fileSize: number
  }[]
}