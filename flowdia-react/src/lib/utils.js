/**
 * @file utils.js
 * @description Shared utility functions for the Flowdia Vite SPA.
 * Provides the `cn` helper that merges Tailwind CSS class names safely,
 * handling conditional classes and resolving conflicts via tailwind-merge.
 *
 * Migrated from: lib/utils.ts (Next.js)
 * Changes: Stripped TypeScript `ClassValue` type import.
 */

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges class names using clsx for conditional logic and tailwind-merge
 * to resolve conflicting Tailwind utility classes.
 * @param {...*} inputs - Any number of class name values (strings, arrays, objects).
 * @returns {string} The merged class name string.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
