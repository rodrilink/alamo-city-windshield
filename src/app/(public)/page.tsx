import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="font-display text-4xl font-bold md:text-5xl lg:text-6xl">
        Professional <span className="text-primary">Windshield</span> Services
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
        Expert windshield repair and replacement in San Antonio, TX.
        Get an instant estimate by entering your VIN.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Button size="lg">Get Estimate</Button>
        <Button size="lg" variant="outline">Contact Us</Button>
      </div>
    </div>
  )
}
