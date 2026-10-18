import { PROFILE } from "@/content/profile";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "#work", label: "work", index: "01" },
  { href: "#projects", label: "projects", index: "02" },
  { href: "#about", label: "about", index: "03" },
  { href: "#contact", label: "contact", index: "04" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
        <a href="#top" className="font-mono text-sm font-medium tracking-tight">
          sd<span className="text-faint">/</span>
        </a>

        <nav aria-label="Sections" className="ml-auto flex items-center gap-4 sm:gap-6">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-mono text-xs text-muted transition-colors hover:text-fg"
            >
              <span className="hidden text-faint sm:inline">{item.index} </span>
              {item.label}
            </a>
          ))}
        </nav>

        <ThemeToggle />
        <span className="sr-only">{PROFILE.name}</span>
      </div>
    </header>
  );
}
