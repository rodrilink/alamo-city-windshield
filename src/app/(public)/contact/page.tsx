import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            Contact <span className="text-primary">Us</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl">
            Contact form will be added in a later phase.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
