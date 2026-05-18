/**
 * @file mock-db-context.js
 * @description The central state orchestrator for Flowdia's mock data layer in the Vite SPA.
 * Manages topics, posts, and their associated lifecycles using React context + state.
 *
 * Migrated from: context/mock-db-context.tsx (Next.js)
 * Changes:
 *   - Removed "use client" directive (irrelevant in Vite SPA)
 *   - Stripped all TypeScript interfaces (Topic, Post, TopicStatus, etc.)
 *   - Replaced typed generics (useState<T>, createContext<T>) with plain calls
 *   - Converted interface definitions to JSDoc @typedef comments
 *   - Preserved all educational inline comments and business logic
 */

import React, { createContext, useContext, useState } from "react"
import { addDays, addWeeks, addMonths } from "date-fns"

// --- JSDoc Type Definitions (replacing TypeScript interfaces) ---

/**
 * @typedef {'scheduled' | 'in_use' | 'archived'} TopicStatus
 * Represents the lifecycle stage of a content topic.
 */

/**
 * @typedef {'daily' | 'weekly' | 'biweekly' | 'monthly'} TopicCycle
 * Defines how frequently the AI generates new topic batches.
 */

/**
 * @typedef {'scheduled' | 'flagged' | 'published' | 'scheduled' | 'failed'} PostStatus
 * Represents the current state of a social media post.
 */

/**
 * @typedef {Object} Topic
 * @property {string} id - Unique identifier for the topic.
 * @property {string} title - The topic headline.
 * @property {string} brief - The detailed instructions / brief for the AI.
 * @property {string} target_date - Scheduled date in YYYY-MM-DD format.
 * @property {TopicStatus} status - Current lifecycle status.
 */

/**
 * @typedef {Object} Post
 * @property {string} id - Unique identifier for the post.
 * @property {string} topicId - Foreign key linking to the parent topic.
 * @property {string} caption - The generated post caption text.
 * @property {PostStatus} status - Current state of the post.
 */

// Helper to format dates dynamically for the mock dataset
const getRelativeDateStr = (daysOffset) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split('T')[0]
}

// --- Mock Data ---
/** @type {Topic[]} */
export const mockTopics = [
  // 1. The Passed Topic: Archived, 5 days ago
  { id: "top_1", title: "The Evolution of RAG Architectures", brief: "How Retrieval-Augmented Generation is replacing standard fine-tuning for enterprise models.", target_date: getRelativeDateStr(-5), status: "archived" },
  
  // 2. The Overdue Topic: Needs Review, 2 days ago
  { id: "top_2", title: "Optimizing Vite for Monorepos", brief: "Deep dive into Rolldown and how Vite 6 handles massive React codebases.", target_date: getRelativeDateStr(-2), status: "scheduled" },
  
  // 3. The Active Topic: In Use, Today
  { id: "top_3", title: "Building Autonomous Agents with LangGraph", brief: "A complete guide to stateful, multi-actor AI agents using Python and Gemini 1.5 Pro.", target_date: getRelativeDateStr(0), status: "in_use" },
  
  // 4. The Upcoming Topic: scheduled for 3 days in the future
  { id: "top_4", title: "Server Actions in Next.js 15", brief: "Exploring how React Server Components are changing full-stack form mutations.", target_date: getRelativeDateStr(3), status: "scheduled" },
  
  // 5. The Upcoming Needs Review Topic: Needs Review, 5 days in the future
  { id: "top_5", title: "The Future of WebAssembly & Rust", brief: "Why Rust is becoming the dominant language for high-performance frontend tooling.", target_date: getRelativeDateStr(5), status: "scheduled" }
]

/** @type {Post[]} */
export const mockPosts = [
  { id: "post_1", topicId: "top_3", caption: "Step-by-step breakdown of the ENIAD admission process.", status: "scheduled" },
  { id: "post_2", topicId: "top_3", caption: "Everything you need to know about ENIAD.", status: "scheduled" },
  { id: "post_3", topicId: "top_3", caption: "ENIAD admissions guide published!", status: "published" },
  { id: "post_4", topicId: "top_4", caption: "How to balance coding bootcamps.", status: "scheduled" },
]

// --- Context ---
const MockDbContext = createContext(undefined)

// --- Provider ---
/**
 * @component MockDbProvider
 * @description The central state orchestrator for Flowdia's mock data layer.
 * It manages topics, posts, and their associated lifecycles using React state.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap.
 */
export function MockDbProvider({ children }) {
  // Local state representing the "database" tables
  const [topics, setTopics] = useState(mockTopics)
  const [posts, setPosts] = useState(mockPosts)
  const [topicCycle, setTopicCycle] = useState("weekly")

  /**
   * Swaps the target dates of two topics to simulate reordering in the timeline.
   * @param {string} activeId - The ID of the topic being dragged.
   * @param {string} overId - The ID of the topic it was dropped over.
   */
  const reorderTopicDates = (activeId, overId) => {
    setTopics(prev => {
      const activeTopic = prev.find(t => t.id === activeId)
      const overTopic = prev.find(t => t.id === overId)
      if (!activeTopic || !overTopic) return prev

      // Swap the date strings to keep the schedule intact while changing order
      const activeDate = activeTopic.target_date
      const overDate = overTopic.target_date

      return prev.map(t => {
        if (t.id === activeId) return { ...t, target_date: overDate }
        if (t.id === overId) return { ...t, target_date: activeDate }
        return t
      })
    })
  }

  /**
   * Promotes a topic to the 'in_use' status and archives the previous active topic.
   * @param {string} newTopicId - The ID of the topic to activate.
   * @param {boolean} [flagPosts=true] - Whether to flag scheduled posts tied to the old topic (Ripple Effect).
   */
  const setTopicInUse = (newTopicId, flagPosts = true) => {
    setTopics(prev => {
      const oldInUse = prev.find(t => t.status === "in_use")
      const oldInUseId = oldInUse?.id

      // Business Logic: If flagging is enabled, we invalidate all generated content tied to the old roadmap branch.
      if (flagPosts && oldInUseId) {
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.topicId === oldInUseId && p.status === "scheduled"
              ? { ...p, status: "flagged" }
              : p
          )
        )
      }

      // Normalize today's date for consistent scheduling
      const todayDate = new Date().toISOString().split("T")[0]

      return prev.map(t => {
        // Step A: Retire the current active topic
        if (t.status === "in_use") return { ...t, status: "archived" }
        // Step B: Set the new topic as active and sync its date to 'today'
        if (t.id === newTopicId) return { ...t, status: "in_use", target_date: todayDate }
        return t
      })
    })
  }

  /**
   * Creates a new version of a topic, archiving the old one to preserve historical record.
   * @param {string} oldTopicId - The original topic ID to archive.
   * @param {Topic} newTopic - The new topic object containing the edited data.
   * @param {boolean} [flagPosts=true] - Ripple effect toggle.
   */
  const versionTopic = (oldTopicId, newTopic, flagPosts = true) => {
    // Handle the ripple effect on dependent posts if the user requested it
    if (flagPosts) {
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.topicId === oldTopicId && p.status === "scheduled"
            ? { ...p, status: "flagged" }
            : p
        )
      )
    }
    // Update topics list by archiving the old one and apscheduled the new version record
    setTopics(prev => [
      ...prev.map(t => t.id === oldTopicId ? { ...t, status: 'archived' } : t),
      newTopic
    ])
  }

  // Note: approval workflow removed — bulk-approve function intentionally omitted.

  /**
   * Generates and appends new topics to the content roadmap.
   * Dates are calculated sequentially starting from the last existing topic's date.
   * @param {number} count - The number of topics to generate.
   */
  const generateTopics = (count) => {
    setTopics(prev => {
      // Business Logic: To maintain a continuous timeline, we must find the latest scheduled topic.
      const sortedTopics = [...prev].sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
      const lastTopic = sortedTopics[sortedTopics.length - 1]

      // Use the last topic's date as our starting anchor, or default to today if none exist.
      let lastDate = lastTopic ? new Date(lastTopic.target_date + "T00:00:00") : new Date()

      const newTopics = []
      for (let i = 1; i <= count; i++) {
        let nextDate

        // Calculate the next date slot using date-fns helpers based on the current automation cycle.
        switch (topicCycle) {
          case 'daily': nextDate = addDays(lastDate, 1); break
          case 'weekly': nextDate = addWeeks(lastDate, 1); break
          case 'biweekly': nextDate = addWeeks(lastDate, 2); break
          case 'monthly': nextDate = addMonths(lastDate, 1); break
          default: nextDate = addWeeks(lastDate, 1)
        }

        lastDate = nextDate
        const dateStr = lastDate.toISOString().split('T')[0]

        // Construct the new Topic object. By default, new topics require human review.
        newTopics.push({
          id: `top_gen_${Date.now()}_${i}`,
          title: `AI Topic: ${dateStr} Strategy`,
          brief: "Automatic brief synthesis in progress based on audience engagement data...",
          target_date: dateStr,
          status: 'scheduled'
        })
      }

      // Append the new topics to the existing collection to keep the state update additive.
      return [...prev, ...newTopics]
    })
  }

  /**
   * Reschedules an overdue topic to the end of the pipeline.
   * It calculates the next available slot after the last scheduled future topic.
   * @param {string} topicId - The ID of the overdue topic to reschedule.
   */
  const rescheduleOverdueTopic = (topicId) => {
    setTopics(prev => {
      const topicToReschedule = prev.find(t => t.id === topicId)
      if (!topicToReschedule) return prev

      // Business Logic: Find the date of the very last scheduled future topic in the entire topics array.
      const sortedTopics = [...prev]
        .filter(t => t.id !== topicId) // Exclude the topic being rescheduled
        .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
      
      const lastTopic = sortedTopics[sortedTopics.length - 1]
      let lastDate = lastTopic ? new Date(lastTopic.target_date + "T00:00:00") : new Date()

      let nextDate
      // Calculate the next available date based on the user's topic_cycle setting
      switch (topicCycle) {
        case 'daily': nextDate = addDays(lastDate, 1); break
        case 'weekly': nextDate = addWeeks(lastDate, 1); break
        case 'biweekly': nextDate = addWeeks(lastDate, 2); break
        case 'monthly': nextDate = addMonths(lastDate, 1); break
        default: nextDate = addWeeks(lastDate, 1)
      }

      const nextDateStr = nextDate.toISOString().split('T')[0]

      // Update the targeted topic's target_date to this newly calculated future date
      return prev.map(t => t.id === topicId ? { ...t, target_date: nextDateStr, status: 'scheduled' } : t)
    })
  }

  /**
   * Deletes a topic from the mock database.
   * @param {string} topicId - The ID of the topic to delete.
   */
  const deleteTopic = (topicId) => {
    setTopics(prev => prev.filter(t => t.id !== topicId))
  }

  /**
   * Schedules manual posts for the specified platforms.
   * @param {Object} postData - The manual post data.
   * @param {string[]} postData.platforms - Selected platform identifiers (e.g., ['FB', 'IG']).
   * @param {string} postData.audience - The target audience.
   * @param {string} postData.content - The main text content of the post.
   * @param {string} postData.mediaPrompt - The image prompt.
   * @param {Date} postData.scheduledDate - The exact date and time the post is scheduled for.
   */
  const scheduleManualPost = (postData) => {
    const { platforms, audience, content, mediaPrompt, scheduledDate } = postData;
    
    // Business Logic: Map over each platform selected by the user to generate a dedicated post entity.
    const newPosts = platforms.map((platform, index) => ({
      id: `post_manual_${Date.now()}_${index}_${platform.toLowerCase()}`,
      platform: platform,
      type: "manual",
      status: "scheduled",
      content: content,
      media: null, // Would contain the generated media URL in production
      scheduled_for: scheduledDate.toISOString(),
      performance: null
    }))

    // Append the newly generated posts to the global state
    setPosts(prev => [...prev, ...newPosts])
  }

  /**
   * Updates an existing post in the database with new details.
   * Supports both manual posts and standard/AI-generated posts.
   * @param {string} postId - The ID of the post to update.
   * @param {Object} updatedData - Object containing fields to modify.
   */
  const updatePost = (postId, updatedData) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        // Business Logic: Merge the changes, and ensure content/caption synchronization
        return {
          ...p,
          ...updatedData,
          caption: updatedData.content !== undefined ? updatedData.content : p.caption
        }
      }
      return p
    }))
  }

  return (
    <MockDbContext.Provider value={{
      topics,
      setTopics,
      posts,
      setPosts,
      topicCycle,
      setTopicCycle,
      reorderTopicDates,
      setTopicInUse,
      versionTopic,
      generateTopics,
      rescheduleOverdueTopic,
      deleteTopic,
      scheduleManualPost,
      updatePost
    }}>
      {children}
    </MockDbContext.Provider>
  )
}

// --- Hook ---
/**
 * Custom hook to access the MockDb context.
 * @returns {Object} The mock database context value.
 * @throws {Error} If used outside of a MockDbProvider.
 */
export function useMockDb() {
  const context = useContext(MockDbContext)
  if (context === undefined) {
    throw new Error("useMockDb must be used within a MockDbProvider")
  }
  return context
}
