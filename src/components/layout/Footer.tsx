'use client';

import { useState, useEffect } from 'react';

export default function Footer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">师傅你是做什么工作的?</h3>
            <p className="text-gray-400">
              提供专业的3D模型在线预览和分享服务，让3D创作更简单。
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">快速链接</h3>
            <ul className="space-y-2">
              <li><a href="/models" className="text-gray-400 hover:text-white">模型库</a></li>
              <li><a href="/upload" className="text-gray-400 hover:text-white">上传模型</a></li>
              <li><a href="/help" className="text-gray-400 hover:text-white">帮助中心</a></li>
              <li><a href="/about" className="text-gray-400 hover:text-white">关于我们</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">联系我们</h3>
            <p className="text-gray-400">
              邮箱：{mounted ? 'contact@example.com' : ''}<br />
              电话：+86 123 4567 8900
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>© 2024-2025 魔抖. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
} 