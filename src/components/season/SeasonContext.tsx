'use client'

// The season's settings for every client part of the shop (bar, hats, popup,
// hero decor), set once by ShopShell from the database.

import { createContext, useContext, type ReactNode } from 'react'
import type { EventSettings } from '@/lib/offers/event'

const Ctx = createContext<EventSettings | undefined>(undefined)

export function SeasonProvider({ event, children }: { event: EventSettings; children: ReactNode }) {
  return <Ctx.Provider value={event}>{children}</Ctx.Provider>
}

export const useSeasonSettings = () => useContext(Ctx)
