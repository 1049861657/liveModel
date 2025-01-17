import { type Model as PrismaModel } from '@prisma/client'

export interface ExtendedModel extends PrismaModel {
  isFavorited?: boolean
  texturesSize?: number
  user?: {
    id: string
    name: string | null
    email: string
    avatar?: {
      url: string
    } | null
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