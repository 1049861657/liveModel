import 'next-auth'
import { DefaultSession } from 'next-auth'
import { Image } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      avatar: Image | null
    } & DefaultSession['user']
  }

  interface User {
    id: string
    email: string
    name?: string | null
    avatar?: Image | null
  }
} 