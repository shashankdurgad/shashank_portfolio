import { PROFILE } from "@/content/profile";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "#work", label: "Work" },
  { href: "#projects", label: "Projects" },
  { href: "#about", label: "About" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-6">
        <a href="#top" className="text-[15px] font-medium tracking-tight">
          {PROFILE.name}
        </a>

        <nav className="ml-auto hidden items-center gap-7 sm:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-fg"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 sm:ml-0">
          <ThemeToggle />
          <a
            href={`mailto:${PROFILE.email}`}
            className="rounded-full bg-[var(--fg)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition-opacity hover:opacity-88"
          >
            Get in touch
          </a>
        </div>
      </div>
    </header>
  );
}
