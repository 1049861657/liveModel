/**
 * 时区处理工具
 */

import { startOfMonth, endOfMonth } from 'date-fns'

// 获取指定月份的起始和结束时间(UTC)
export function getMonthRange(year: number, month: number) {
  const date = new Date(year, month - 1)
  return {
    start: startOfMonth(date),
    end: endOfMonth(date)
  }
}

// 转换本地时间为 UTC 存储时间
export function toUTCStorage(localDate: Date): Date {
  return new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000))
}

// 转换 UTC 存储时间为本地显示时间
export function fromUTCStorage(utcDate: Date): Date {
  return new Date(utcDate.getTime() + (new Date().getTimezoneOffset() * 60000))
}

// 获取当天起始时间(UTC)
export function getTodayStart(): Date {
  const today = new Date()
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0, 0, 0, 0
  )
  return toUTCStorage(todayStart)
}

/**
 * 格式化聊天消息时间
 * @param date 消息时间
 * @returns 格式化后的时间字符串
 */
export function formatMessageTime(date: Date): string {
  const now = new Date()
  const messageDate = new Date(date)
  const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    // 今天的消息只显示时间
    return messageDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    // 昨天的消息
    return `昨天 ${messageDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  } else if (diffDays === 2) {
    // 前天的消息
    return `前天 ${messageDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  } else {
    // 更早的消息显示完整日期
    return messageDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
} 