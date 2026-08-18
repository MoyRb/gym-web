import { PublicHeader } from "@/components/layout/PublicHeader"
import { PublicFooter } from "@/components/layout/PublicFooter"
import { HeroSection } from "@/components/landing/HeroSection"
import { ProductProofSection } from "@/components/landing/ProductProofSection"
import { HowItWorksSection } from "@/components/landing/HowItWorksSection"
import { RoutinesSection } from "@/components/landing/RoutinesSection"
import { BenefitsSection } from "@/components/landing/BenefitsSection"
import { ExerciseGuidanceSection } from "@/components/landing/ExerciseGuidanceSection"
import { PricingSection } from "@/components/landing/PricingSection"
import { FAQSection } from "@/components/landing/FAQSection"
import { CtaSection } from "@/components/landing/CtaSection"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <HeroSection />
        <ProductProofSection />
        <HowItWorksSection />
        <RoutinesSection />
        <BenefitsSection />
        <ExerciseGuidanceSection />
        <PricingSection />
        <FAQSection />
        <CtaSection />
      </main>
      <PublicFooter />
    </div>
  )
}
