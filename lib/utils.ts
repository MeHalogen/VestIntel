import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency: string = "INR"): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatNumber(value: number): string {
  if (value >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `₹${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `₹${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `₹${(value / 1e3).toFixed(2)}K`
  return `₹${value.toFixed(2)}`
}

export function getChangeColor(value: number): string {
  return value >= 0 ? 'text-bullish' : 'text-bearish'
}

export function getChangeBgColor(value: number): string {
  return value >= 0 ? 'bg-bullish/10' : 'bg-bearish/10'
}
