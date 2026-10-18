import { PROFILE } from "@/content/profile";
import { CopyEmail } from "@/components/ui/CopyEmail";

const LINKS = [
  { href: PROFILE.github, label: "GitHub" },
  { href: PROFILE.linkedin, label: "LinkedIn" },
];

/** Contact and footer in one: the last thing on the page is how to reach me. */
export function Footer() {
  return (
    <footer id="contact" className="border-t border-line px-6 pt-24 pb-10">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs text-faint">
          04 <span className="opacity-50">/</span> contact
        </p>
        <h2 className="mt-3 max-w-2xl text-[clamp(1.9rem,5vw,3rem)] leading-[1.05] font-medium tracking-[-0.03em]">
          Building something with agents? Let&apos;s talk.
        </h2>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <CopyEmail className="text-lg underline decoration-(--line-strong) underline-offset-4 transition-colors hover:decoration-(--fg)" />
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted transition-colors hover:text-fg"
            >
              {link.label} ↗
            </a>
          ))}
        </div>

        <div className="mt-20 flex flex-wrap justify-between gap-4 font-mono text-[11px] text-faint">
          <span>
            © {new Date().getFullYear()} {PROFILE.name} · {PROFILE.location}
          </span>
          <a href="#top" className="transition-colors hover:text-fg">
            back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
