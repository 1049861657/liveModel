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