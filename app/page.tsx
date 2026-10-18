import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { Work } from "@/components/sections/Work";
import { Projects } from "@/components/sections/Projects";
import { About } from "@/components/sections/About";
import { PROFILE } from "@/content/profile";

/**
 * Person markup for search results.
 *
 * This is where the actual SEO return is for a name query — it is what lets a
 * result carry the GitHub and LinkedIn profiles alongside the page itself.
 */
const PERSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: PROFILE.name,
  description: PROFILE.description,
  email: `mailto:${PROFILE.email}`,
  address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
  url: PROFILE.site,
  sameAs: [PROFILE.github, PROFILE.linkedin],
  knowsAbout: PROFILE.interests,
  alumniOf: [
    { "@type": "CollegeOrUniversity", name: "University College London" },
    { "@type": "HighSchool", name: "Anglo-Chinese School (Independent)" },
  ],
};

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-[var(--fg)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--bg)]"
      >
        Skip to content
      </a>

      <Header />

      <main id="main">
        <Hero />
        <Work />
        <Projects />
        <About />
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_LD) }}
      />
    </>
  );
}
