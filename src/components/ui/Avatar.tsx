import Image from 'next/image'
import { cn } from '@/utils'

interface AvatarProps {
  user: {
    name?: string | null | undefined
    email?: string | null | undefined
    avatar?: {
      url: string
    } | null | undefined
  } | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-xl'
}

export default function Avatar({ user, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeMap[size]
  
  if (user?.avatar?.url) {
    return (
      <div className={cn("relative rounded-full overflow-hidden", sizeClass, className)}>
        <Image
          src={user.avatar.url}
          alt={user?.name || '用户头像'}
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className={cn("relative rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center", sizeClass, className)}>
      <span className="text-white font-medium">
        {user?.name?.[0] || user?.email?.[0] || '?'}
      </span>
    </div>
  )
} 