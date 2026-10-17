import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { Work } from "@/components/sections/Work";
import { Projects } from "@/components/sections/Projects";
import { Leadership } from "@/components/sections/Leadership";
import { About } from "@/components/sections/About";
import { PROFILE } from "@/content/profile";
import { SKILLS } from "@/content/skills";

/**
 * Person markup for search results.
 *
 * This is where the actual SEO return is for a name query — it is what lets a
 * result carry the GitHub and LinkedIn profiles alongside the page itself.
 *
 * v3 fixes the verified gaps: `url` pointed at GitHub rather than the site,
 * and there was no `@id` for other nodes (the case-study pages' JSON-LD) to
 * reference the person by. `knowsAbout` now flattens the skills groups — with
 * a cap, because a Person schema listing every tool reads as keyword soup.
 */
const PERSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${PROFILE.site}#person`,
  name: PROFILE.name,
  description: PROFILE.blurb,
  jobTitle: "Software Engineer",
  email: `mailto:${PROFILE.email}`,
  address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
  url: PROFILE.site,
  sameAs: [PROFILE.github, PROFILE.linkedin],
  knowsAbout: SKILLS.flatMap((group) => group.items).slice(0, 16),
  alumniOf: { "@type": "CollegeOrUniversity", name: "University College London" },
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
        <Leadership />
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
