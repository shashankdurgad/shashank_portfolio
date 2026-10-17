import { PROFILE } from "@/content/profile";
import { CopyEmail } from "@/components/CopyEmail";

/*
 * Email leaves the LINKS list: CopyEmail owns the address — the clipboard pill
 * and the honest mailto beside it, one tap each way.
 */
const LINKS = [
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

        <nav className="flex flex-wrap items-center gap-5">
          <CopyEmail />
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
