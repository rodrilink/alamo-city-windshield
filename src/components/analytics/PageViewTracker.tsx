'use client'

// D-05: this component is the single insertion point covering all
// `(public)` routes -- mounted once in `src/app/(public)/layout.tsx`
// alongside `{children}`. `(admin)` is excluded structurally, not by an
// allow-list that could drift: it has its own separate layout tree (D-06),
// so this component never mounts on admin traffic.
//
// D-08: the dedupe key is path + session, so Home -> About -> Home writes
// two rows, not three. Consequence: the dashboard's "Total Visitors" card
// counts distinct page-visits per session, not unique people -- do not let
// any future copy describe it as unique visitors.
//
// D-07: being client-side is itself the bot filter. There is no
// user-agent-based filtering here by design -- UA strings are trivially
// spoofed and the blocklist rots. This tracker only fires when JS executes
// and the component actually mounts, so Next.js prefetches and most
// non-executing crawlers never trigger it.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackBrowserEvent } from '@/lib/analytics/track-browser-event'
import { getOrCreateSessionId } from '@/lib/analytics/session-id'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'

const SESSION_STORAGE_PREFIX = 'pv:'

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // D-07/D-08: guarded sessionStorage read, dedupe key is path + session.
    // Must not throw during render if storage is unavailable (private
    // browsing, disabled storage) -- default to "not yet seen" and fire.
    let alreadySeen = false
    try {
      alreadySeen = window.sessionStorage.getItem(SESSION_STORAGE_PREFIX + pathname) === '1'
    } catch {
      alreadySeen = false
    }

    if (alreadySeen) {
      return
    }

    const sessionId = getOrCreateSessionId()
    void trackBrowserEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: pathname, sessionId })

    try {
      window.sessionStorage.setItem(SESSION_STORAGE_PREFIX + pathname, '1')
    } catch {
      // Storage unavailable -- tracking still fired above; dedupe is
      // best-effort only, never a hard requirement (Claude's Discretion).
      // This empty catch is deliberate.
    }
  }, [pathname])

  return null
}
