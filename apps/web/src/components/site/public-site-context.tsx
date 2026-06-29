"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PublicSiteChrome } from "@/lib/data/public-types";

const PublicSiteContext = createContext<PublicSiteChrome | null>(null);

export function PublicSiteProvider({
  chrome,
  children,
}: {
  chrome: PublicSiteChrome;
  children: ReactNode;
}) {
  return <PublicSiteContext.Provider value={chrome}>{children}</PublicSiteContext.Provider>;
}

export function usePublicSiteChrome(): PublicSiteChrome | null {
  return useContext(PublicSiteContext);
}
