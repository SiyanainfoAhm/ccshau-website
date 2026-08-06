"use client";

import type { ReactNode } from "react";

import type { PublicSocialLink } from "@/lib/data/public-types";

function IconShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      {children}
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.915L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </IconShell>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 4.99 3.64 9.13 8.4 9.93v-7.02H7.9v-2.91h2.36V9.84c0-2.33 1.39-3.62 3.52-3.62 1.02 0 2.09.18 2.09.18v2.3h-1.18c-1.16 0-1.52.72-1.52 1.46v1.75h2.59l-.41 2.91h-2.18V22c4.76-.8 8.4-4.94 8.4-9.93z" />
    </IconShell>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.56A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.84.56 9.38.56 9.38.56s7.54 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </IconShell>
  );
}

function BloggerIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M8.5 9h3c.55 0 1 .45 1 1s-.45 1-1 1h-3c-.55 0-1-.45-1-1s.45-1 1-1zm7 6h-7c-.55 0-1-.45-1-1s.45-1 1-1h7c.55 0 1 .45 1 1s-.45 1-1 1zM19.34 10.11c-.43-.17-.88-.27-1.34-.27H16v-.01c0-2.76-2.24-5-5-5H7C4.24 5 2 7.24 2 10v4c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5v-.84c0-1.14-.67-2.17-1.66-2.05z" />
    </IconShell>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <IconShell className={className}>
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </IconShell>
  );
}

export const PLATFORM_ICONS: Record<
  PublicSocialLink["platform"],
  (props: { className?: string }) => ReactNode
> = {
  twitter: TwitterIcon,
  facebook: FacebookIcon,
  youtube: YoutubeIcon,
  blogger: BloggerIcon,
  instagram: InstagramIcon,
};

export function FooterSocialIcons({
  links,
  className,
  linkClassName,
  iconClassName = "h-4 w-4",
  getAriaLabel,
}: {
  links: PublicSocialLink[];
  className?: string;
  linkClassName: string;
  iconClassName?: string;
  getAriaLabel: (link: PublicSocialLink) => string;
}) {
  if (links.length === 0) return null;

  return (
    <div className={className ?? "mt-5 flex flex-wrap gap-2"}>
      {links.map((link) => {
        const Icon = PLATFORM_ICONS[link.platform];
        return (
          <a
            key={link.platform}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={getAriaLabel(link)}
            className={linkClassName}
          >
            <Icon className={iconClassName} />
          </a>
        );
      })}
    </div>
  );
}
