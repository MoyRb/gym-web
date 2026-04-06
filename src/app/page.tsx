import { PublicHeader } from "@/components/layout/PublicHeader"
import { PublicFooter } from "@/components/layout/PublicFooter"
import { HeroSection } from "@/components/landing/HeroSection"
import { BenefitsSection } from "@/components/landing/BenefitsSection"
import { HowItWorksSection } from "@/components/landing/HowItWorksSection"
import { RoutinesSection } from "@/components/landing/RoutinesSection"
import { TestimonialsSection } from "@/components/landing/TestimonialsSection"
import { ContactSection } from "@/components/landing/ContactSection"
import { CtaSection } from "@/components/landing/CtaSection"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <HeroSection />
        <BenefitsSection />
        <HowItWorksSection />
        <RoutinesSection />
        <TestimonialsSection />
        <ContactSection />
        <CtaSection />
      </main>
      <PublicFooter />
    </div>
  )
}
