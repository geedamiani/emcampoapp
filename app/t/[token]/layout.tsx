/**
 * LEGACY SHARE LAYOUT (/t/<token>)
 *
 * The pages below redirect to /<slug>. This layout stays out of the way
 * so a missing token becomes a 404 from the redirect, not from the shell.
 */
import React from 'react'

export const dynamic = 'force-dynamic'

export default function LegacyShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
