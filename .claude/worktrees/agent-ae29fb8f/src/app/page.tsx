import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="font-display text-4xl font-bold text-foreground">
        Alamo City <span className="text-primary">Windshield Repair</span>
      </h1>
      <p className="text-muted-foreground">Foundation scaffold — Phase 1</p>
      <div className="flex gap-4">
        <Button>Get Estimate</Button>
        <Button variant="outline">Contact Us</Button>
      </div>
    </main>
  )
}
