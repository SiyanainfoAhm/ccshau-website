"use client";

import { PLATFORM_ICONS } from "@/components/design/shared/footer-social-icons";
import { useLanguage } from "@/components/design/shared/language-context";
import { usePublicSiteChrome } from "@/components/site/public-site-context";

export function FloatingSocialBar() {
  const { t } = useLanguage();
  const chrome = usePublicSiteChrome();
  const links = chrome?.socialLinks ?? [];

  if (links.length === 0) return null;

  return (
    <nav
      aria-label={t("Social media", "सोशल मीडिया")}
      className="ccshau-social-rail hidden sm:block"
    >
      <div className="ccshau-social-rail__bob">
        <ul className="ccshau-social-rail__list">
          {links.map((link, index) => {
            const Icon = PLATFORM_ICONS[link.platform];
            const label = t(link.labelEn, link.labelHi);
            return (
              <li
                key={link.platform}
                className="ccshau-social-rail__item"
                style={{ animationDelay: `${180 + index * 90}ms` }}
              >
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="ccshau-social-rail__link"
                >
                  <span className="ccshau-social-rail__label" aria-hidden="true">
                    {label}
                  </span>
                  <span
                    className={`ccshau-social-rail__icon ccshau-social-rail__icon--${link.platform}`}
                    aria-hidden="true"
                  >
                    <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
