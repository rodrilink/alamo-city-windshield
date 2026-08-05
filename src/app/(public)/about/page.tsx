import { MissionSection } from '@/components/about/MissionSection'
import { VisionSection } from '@/components/about/VisionSection'
import { TrustSection } from '@/components/about/TrustSection'
import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'

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
