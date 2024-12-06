'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'

export default function Navbar() {
  const { data: session } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { scrollY } = useScroll()

  // 监听滚动
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 0)
  })

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <>
      {/* 占位符 */}
      <div className="h-16" />
      
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/80 backdrop-blur-lg shadow-lg' 
            : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.02 }}
            >
              <Link 
                href="/" 
                className={`text-xl font-bold transition-colors ${
                  isScrolled ? 'text-indigo-600' : 'text-white'
                }`}
              >
                <motion.div
                  className="flex items-center gap-2"
                  whileHover={{ x: 3 }}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-current">3D</span>
                  </div>
                  <span>预览</span>
                </motion.div>
              </Link>
            </motion.div>

            {/* 导航链接 */}
            <div className="hidden md:flex items-center space-x-1">
              <NavLink href="/models" isScrolled={isScrolled}>
                模型库
              </NavLink>
              <NavLink href="/upload" isScrolled={isScrolled}>
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                上传模型
              </NavLink>
              <NavLink href="/chat" isScrolled={isScrolled}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                聊天室
              </NavLink>
            </div>

            {/* 用户菜单 */}
            <div className="flex items-center user-menu">
              {session ? (
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`flex items-center space-x-2 p-2 rounded-xl transition-all ${
                      isScrolled 
                        ? 'hover:bg-gray-100' 
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <motion.div 
                      className="relative w-8 h-8"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-gradient-slow opacity-80" />
                      <div className="absolute inset-[2px] rounded-full bg-white flex items-center justify-center">
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600 font-medium">
                          {session.user?.name?.[0] || session.user?.email?.[0] || '?'}
                        </span>
                      </div>
                    </motion.div>
                    <span className={isScrolled ? 'text-gray-700' : 'text-white'}>
                      {session.user?.name || '用户'}
                    </span>
                    <motion.svg
                      animate={{ rotate: showDropdown ? 180 : 0 }}
                      className={`w-4 h-4 ${isScrolled ? 'text-gray-400' : 'text-white/70'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </motion.button>

                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-100 py-2 origin-top"
                      >
                        <UserMenuItem href="/profile" icon="user">个人资料</UserMenuItem>
                        <UserMenuItem href="/models?owner=mine" icon="folder">我的模型</UserMenuItem>
                        <UserMenuItem href="/checkin" icon="calendar">每日签到</UserMenuItem>
                        <div className="border-t border-gray-100 mt-1">
                          <button
                            onClick={() => {
                              setShowDropdown(false)
                              signOut()
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>退出登录</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/login"
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isScrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/90 hover:text-white'
                    }`}
                  >
                    登录
                  </Link>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href="/register"
                      className={`px-4 py-2 rounded-lg transition-all ${
                        isScrolled
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
                      }`}
                    >
                      注册
                    </Link>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.nav>
    </>
  )
}

// 导航链接组件
function NavLink({ href, children, isScrolled }: { href: string; children: React.ReactNode; isScrolled: boolean }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Link
        href={href}
        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
          isScrolled
            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            : 'text-white/90 hover:text-white hover:bg-white/10'
        }`}
      >
        {children}
      </Link>
    </motion.div>
  )
}

// 用户菜单项组件
function UserMenuItem({ href, icon, children }: { href: string; icon: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <motion.div
        className="flex items-center space-x-2"
        whileHover={{ x: 2 }}
      >
        <MenuIcon name={icon} />
        <span>{children}</span>
      </motion.div>
    </Link>
  )
}

// 菜单图标组件
function MenuIcon({ name }: { name: string }) {
  const icons: { [key: string]: JSX.Element } = {
    user: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    folder: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    calendar: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  return icons[name] || null
} 