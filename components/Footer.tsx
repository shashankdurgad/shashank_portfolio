import { PROFILE } from "@/content/profile";

/*
 * Merge note: `CopyEmail` (another agent's, P2b) wires in here — once
 * components/CopyEmail.tsx exists, import it and render it beside the Email
 * link so a visitor can take the address without a mail client opening.
 */
const LINKS = [
  { href: `mailto:${PROFILE.email}`, label: "Email", external: false },
  { href: PROFILE.github, label: "GitHub", external: true },
  { href: PROFILE.linkedin, label: "LinkedIn", external: true },
  // The résumé carries what the page deliberately omits (phone, module
  // grades), so it is a link here rather than content on the page.
  { href: PROFILE.resume, label: "Résumé", external: false },
];

export function Footer() {
  return (
    <footer className="border-t border-line px-6 py-12">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-faint">
          {PROFILE.name} · {PROFILE.location}
        </p>

        <nav className="flex flex-wrap gap-5">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
              className="text-sm text-muted transition-colors hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
