import { PROFILE } from "@/content/profile";

const LINKS = [
  { href: `mailto:${PROFILE.email}`, label: "Email", external: false },
  { href: PROFILE.github, label: "GitHub", external: true },
  { href: PROFILE.linkedin, label: "LinkedIn", external: true },
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
