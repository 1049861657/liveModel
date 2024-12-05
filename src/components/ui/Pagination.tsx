'use client'

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-center space-x-2 mt-8 mb-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={clsx(
          "p-2 rounded-lg",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      
      {[...Array(totalPages)].map((_, i) => (
        <button
          key={i + 1}
          onClick={() => onPageChange(i + 1)}
          className={clsx(
            "px-3 py-1 rounded-lg",
            currentPage === i + 1 
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          {i + 1}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={clsx(
          "p-2 rounded-lg",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  )
} 