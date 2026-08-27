import { PageViewTracker } from '@/components/analytics/page-view-tracker'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PageViewTracker />
      {children}
    </>
  )
}
