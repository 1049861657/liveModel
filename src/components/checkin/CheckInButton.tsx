'use client'

import { useCallback, useReducer, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { useQuery, useMutation, UseQueryResult, useQueryClient } from '@tanstack/react-query'
import CheckInAnimation from './CheckInAnimation'
import { useTranslations } from 'next-intl'

interface CheckInButtonProps {
  onCheckIn?: () => Promise<void>
}

interface CheckInState {
  hasCheckedIn: boolean
  points: number
  showAnimation: boolean
  earnedPoints: number
  initialLoading: boolean
}

type CheckInAction =
  | { type: 'SET_INITIAL_LOADING'; payload: boolean }
  | { type: 'SET_CHECK_IN_STATUS'; payload: { hasCheckedIn: boolean; points: number } }
  | { type: 'SET_CHECK_IN_SUCCESS'; payload: { points: number; earnedPoints: number } }
  | { type: 'SET_SHOW_ANIMATION'; payload: boolean }
  | { type: 'RESET' }

const initialState: CheckInState = {
  hasCheckedIn: false,
  points: 0,
  showAnimation: false,
  earnedPoints: 0,
  initialLoading: true
}

function checkInReducer(state: CheckInState, action: CheckInAction): CheckInState {
  switch (action.type) {
    case 'SET_INITIAL_LOADING':
      return { ...state, initialLoading: action.payload }
    case 'SET_CHECK_IN_STATUS':
      return { 
        ...state, 
        hasCheckedIn: action.payload.hasCheckedIn,
        points: action.payload.points
      }
    case 'SET_CHECK_IN_SUCCESS':
      return {
        ...state,
        hasCheckedIn: true,
        points: action.payload.points,
        earnedPoints: action.payload.earnedPoints,
        showAnimation: true
      }
    case 'SET_SHOW_ANIMATION':
      return { ...state, showAnimation: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

interface CheckInResponse {
  hasCheckedIn: boolean
  points: number
}

interface CheckInMutationResponse {
  totalPoints: number
  points: number
}

export default function CheckInButton({ onCheckIn }: CheckInButtonProps) {
  const { data: session } = useSession()
  const t = useTranslations('CheckInButton')
  const [state, dispatch] = useReducer(checkInReducer, initialState)
  const queryClient = useQueryClient()

  // 使用 react-query 获取签到状态
  const { data, error, isError, isSuccess }: UseQueryResult<CheckInResponse, Error> = useQuery({
    queryKey: ['checkInStatus'],
    queryFn: async () => {
      const response = await fetch('/api/check-in')
      if (!response.ok) throw new Error(t('fetchError'))
      return response.json()
    },
    enabled: !!session
  })

  // 处理查询成功
  useEffect(() => {
    if (isSuccess && data) {
      dispatch({ 
        type: 'SET_CHECK_IN_STATUS', 
        payload: { 
          hasCheckedIn: data.hasCheckedIn, 
          points: data.points 
        }
      })
      dispatch({ type: 'SET_INITIAL_LOADING', payload: false })
    }
  }, [isSuccess, data])

  // 处理查询错误
  useEffect(() => {
    if (isError && error) {
      console.error(t('fetchError'), error)
      toast.error(t('fetchError'))
      dispatch({ type: 'SET_INITIAL_LOADING', payload: false })
    }
  }, [isError, error, t])

  // 使用 react-query 管理签到操作
  const { 
    mutate, 
    isSuccess: isMutationSuccess, 
    data: mutationData, 
    error: mutationError, 
    isError: isMutationError,
    isPending: isMutationPending 
  } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/check-in', {
        method: 'POST'
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('checkInFailed'))
      }
      return response.json()
    },
    onSuccess: (data) => {
      // 更新签到状态缓存
      queryClient.setQueryData(['checkInStatus'], {
        hasCheckedIn: true,
        points: data.totalPoints
      })
      
      // 使排行榜缓存失效并立即重新获取
      queryClient.invalidateQueries({ 
        queryKey: ['rankings'],
        exact: true
      })

      // 更新状态
      dispatch({
        type: 'SET_CHECK_IN_SUCCESS',
        payload: {
          points: data.totalPoints,
          earnedPoints: data.points
        }
      })

      // 调用父组件的回调函数
      if (onCheckIn) {
        onCheckIn()
      }
    }
  })

  // 处理签到错误
  useEffect(() => {
    if (isMutationError && mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : t('checkInFailed'))
    }
  }, [isMutationError, mutationError, t])

  // 处理签到
  const handleCheckIn = useCallback(async () => {
    if (!session) {
      toast.error(t('loginRequired'))
      return
    }

    if (state.hasCheckedIn) {
      toast.error(t('alreadyCheckedIn'))
      return
    }

    mutate()
  }, [session, state.hasCheckedIn, mutate, t])

  // 重置组件状态
  useEffect(() => {
    if (!session) {
      dispatch({ type: 'RESET' })
    }
  }, [session])

  if (!session) {
    return null
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={handleCheckIn}
          disabled={isMutationPending || state.hasCheckedIn || state.initialLoading}
          className={`
            relative w-full h-[52px] rounded-xl font-medium transition-all
            ${state.hasCheckedIn 
              ? 'bg-gray-50 hover:bg-gray-100' 
              : state.initialLoading
                ? 'bg-gray-50'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}
            disabled:opacity-60
          `}
        >
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              {state.initialLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('loading')}</span>
                </div>
              ) : isMutationPending ? (
                <div className="flex items-center gap-2 text-white">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('checkingIn')}</span>
                </div>
              ) : state.hasCheckedIn ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('checkedIn')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  <span>{t('checkIn')}</span>
                </div>
              )}
            </div>
          </div>
        </button>
      </div>

      {state.showAnimation && (
        <CheckInAnimation 
          points={state.earnedPoints}
          onComplete={() => dispatch({ type: 'SET_SHOW_ANIMATION', payload: false })}
        />
      )}
    </>
  )
} 