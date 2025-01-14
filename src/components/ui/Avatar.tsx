import Image from 'next/image'
import { cn } from '@/utils'
import { useState, useEffect } from 'react'

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

function Avatar({ user, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeMap[size]
  const [imageLoaded, setImageLoaded] = useState(false)
  const avatarUrl = user?.avatar?.url

  useEffect(() => {
    if (avatarUrl) {
      const img = document.createElement('img')
      img.src = avatarUrl
      img.onload = () => setImageLoaded(true)
      return () => {
        setImageLoaded(false)
      }
    }
  }, [avatarUrl])
  
  if (avatarUrl) {
    return (
      <div className={cn("relative rounded-full overflow-hidden", sizeClass, className)}>
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center",
          imageLoaded ? 'opacity-0' : 'opacity-100',
          "transition-opacity duration-300"
        )}>
          <span className="text-white font-medium">
            {user?.name?.[0] || user?.email?.[0] || '?'}
          </span>
        </div>
        <Image
          src={avatarUrl}
          alt={user?.name || '用户头像'}
          width={64}
          height={64}
          priority={true}
          className={cn(
            "w-full h-full object-cover",
            imageLoaded ? 'opacity-100' : 'opacity-0',
            "transition-opacity duration-300"
          )}
          onLoad={() => setImageLoaded(true)}
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

export default Avatar 