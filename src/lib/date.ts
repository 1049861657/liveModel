/**
 * 时区处理工具
 */

import { startOfMonth, endOfMonth } from 'date-fns'

// 获取时区信息
function getTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// 获取指定月份的UTC时间范围
export function getMonthRange(year: number, month: number) {
  // 直接使用UTC时间创建日期
  const date = new Date(Date.UTC(year, month - 1))
  return {
    start: startOfMonth(date),
    end: endOfMonth(date)
  }
}

// 获取UTC当天开始时间
export function getTodayStart(): Date {
  const now = new Date()
  // 使用 UTC 时间创建今天的开始
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ))
}

// 获取UTC日期的开始时间
export function getUTCDayStart(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ))
}

// 创建UTC时间
export function createUTCDate(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0, ms = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, ms))
}

/**
 * 仅用于客户端显示的时区转换函数
 * 将UTC时间转换为用户本地时间显示
 */
export function formatLocalTime(utcDate: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: getTimeZone()
  }).format(utcDate)
}

/**
 * 格式化聊天消息时间（客户端显示）
 */
export function formatMessageTime(utcDate: Date): string {
  const now = new Date()
  
  // 获取本地化时区的日期部分，用于判断是否同一天
  const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: getTimeZone() }))
  const dateLocal = new Date(utcDate.toLocaleString('en-US', { timeZone: getTimeZone() }))
  
  const isToday = 
    nowLocal.getFullYear() === dateLocal.getFullYear() &&
    nowLocal.getMonth() === dateLocal.getMonth() &&
    nowLocal.getDate() === dateLocal.getDate()
    
  const isYesterday = 
    nowLocal.getFullYear() === dateLocal.getFullYear() &&
    nowLocal.getMonth() === dateLocal.getMonth() &&
    nowLocal.getDate() === dateLocal.getDate() + 1
    
  const isDayBeforeYesterday = 
    nowLocal.getFullYear() === dateLocal.getFullYear() &&
    nowLocal.getMonth() === dateLocal.getMonth() &&
    nowLocal.getDate() === dateLocal.getDate() + 2
  
  const timeStr = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: getTimeZone()
  }).format(utcDate)

  // 获取本地化的相对时间描述
  const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto'
  })

  if (isToday) {
    return timeStr
  } else if (isYesterday) {
    return `${relativeTimeFormat.format(-1, 'day')} ${timeStr}`
  } else if (isDayBeforeYesterday) {
    return `${relativeTimeFormat.format(-2, 'day')} ${timeStr}`
  } else {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: getTimeZone()
    }).format(utcDate)
  }
} 