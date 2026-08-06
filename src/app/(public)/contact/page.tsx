import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'
import { ContactForm } from '@/components/contact/ContactForm'
import { ContactVinSearch } from '@/components/contact/ContactVinSearch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// D-20: normal-flow chrome, no snap-scroll, no overlay nav -- identical
// wrapper shape to /about. `<main>` holds the contact form and the VIN
// search (D-17) instead of the Phase 3 placeholder.
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
            Send us a message or look up your VIN for an instant windshield estimate.
          </p>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-display font-bold">Send a message</CardTitle>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-display font-bold">Get an estimate</CardTitle>
              </CardHeader>
              <CardContent>
                <ContactVinSearch />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
