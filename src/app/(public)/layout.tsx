import { PageViewTracker } from '@/components/analytics/PageViewTracker'

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
