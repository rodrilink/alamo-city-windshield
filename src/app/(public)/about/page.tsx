import { MissionSection } from '@/components/about/mission-section'
import { VisionSection } from '@/components/about/vision-section'
import { TrustSection } from '@/components/about/trust-section'
import { TopNav } from '@/components/layout/top-nav'
import { Footer } from '@/components/layout/footer'

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <MissionSection />
        <VisionSection />
        <TrustSection />
      </main>
      <Footer />
    </div>
  )
}
