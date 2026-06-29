import type { ReactNode } from "react";

import { LanguageProvider } from "@/components/design/shared/language-context";

export function DesignShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <LanguageProvider>
      <div className={`min-h-screen flex flex-col ${className}`}>{children}</div>
    </LanguageProvider>
  );
}
