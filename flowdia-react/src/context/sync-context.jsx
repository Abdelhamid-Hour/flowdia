/**
 * @file sync-context.js
 * @description Provides a global synchronization toggle for the Flowdia Vite SPA.
 * Used to control whether platform settings are synced across all channels.
 *
 * Migrated from: context/sync-context.tsx (Next.js)
 * Changes:
 *   - Removed "use client" directive (irrelevant in Vite SPA)
 *   - Stripped TypeScript interface (SyncContextType)
 *   - Removed generic type annotations from createContext and useState
 */

import React, { createContext, useContext, useState } from "react"

// Create the context with an undefined default (enforced via the hook below)
const SyncContext = createContext(undefined)

/**
 * @component SyncProvider
 * @description Provides sync state to all child components.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap.
 */
export function SyncProvider({ children }) {
  const [isSynced, setIsSynced] = useState(true) // Default to true

  const toggleSync = () => setIsSynced((prev) => !prev)

  return (
    <SyncContext.Provider value={{ isSynced, toggleSync }}>
      {children}
    </SyncContext.Provider>
  )
}

/**
 * Custom hook to access the Sync context.
 * @returns {{ isSynced: boolean, toggleSync: () => void }} The sync state and toggle function.
 * @throws {Error} If used outside of a SyncProvider.
 */
export function useSync() {
  const context = useContext(SyncContext)
  if (context === undefined) {
    throw new Error("useSync must be used within a SyncProvider")
  }
  return context
}
