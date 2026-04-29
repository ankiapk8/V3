import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function apiUrl(path: string) {
  const cleanPath = path.replace(/^\/+/, "")
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (apiBase && apiBase.length > 0) {
    const trimmed = apiBase.replace(/\/+$/, "")
    return `${trimmed}/${cleanPath}`
  }
  const base = import.meta.env.BASE_URL || "/"
  return `${base}${cleanPath}`
}
