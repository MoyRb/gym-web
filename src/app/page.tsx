import type { Metadata } from "next"
import { siteConfig, developerConfig } from "@/config/site"
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

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.slogan}`,
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/icons/alpha-trainer/icon-512.png`,
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: siteConfig.contact.email,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      publisher: { "@id": `${siteConfig.url}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      url: siteConfig.url,
      description: siteConfig.description,
      creator: {
        "@type": "Organization",
        name: developerConfig.name,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "MXN",
        description: "Plan gratuito disponible",
      },
    },
  ],
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
