"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, options: { sitekey: string }) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
    };
    onCcshauRecaptchaLoad?: () => void;
  }
}

let recaptchaScriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();
  if (recaptchaScriptPromise) return recaptchaScriptPromise;

  recaptchaScriptPromise = new Promise((resolve, reject) => {
    window.onCcshauRecaptchaLoad = () => {
      resolve();
      delete window.onCcshauRecaptchaLoad;
    };

    const existing = document.querySelector<HTMLScriptElement>('script[src*="recaptcha/api.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load reCAPTCHA")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?onload=onCcshauRecaptchaLoad&render=explicit";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.body.appendChild(script);
  });

  return recaptchaScriptPromise;
}

export function RecaptchaWidget({ siteKey }: { siteKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadRecaptchaScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.grecaptcha) return;
        if (widgetIdRef.current !== null) {
          window.grecaptcha.reset(widgetIdRef.current);
          return;
        }
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, { sitekey: siteKey });
      })
      .catch(() => {
        // Widget area stays empty; server will reject missing token when CAPTCHA is required
      });

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  return <div ref={containerRef} className="min-h-[78px]" />;
}

export function getRecaptchaToken(): string | undefined {
  if (!window.grecaptcha) return undefined;
  const token = window.grecaptcha.getResponse();
  return token || undefined;
}

export function resetRecaptcha(): void {
  if (!window.grecaptcha) return;
  window.grecaptcha.reset();
}
