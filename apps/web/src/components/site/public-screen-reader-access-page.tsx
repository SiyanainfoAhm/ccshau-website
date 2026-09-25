"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import {
  publicCardSoftClass,
  publicMainGradientClass,
  typeHeroTitleClass,
} from "@/lib/design/public-page-classes";

type ReaderTool = {
  name: string;
  summaryEn: string;
  summaryHi: string;
  href?: string;
  linkEn?: string;
  linkHi?: string;
};

const READERS: ReaderTool[] = [
  {
    name: "Narrator",
    summaryEn: "Built into Windows. Press Windows + Ctrl + Enter to turn it on or off. No download is required.",
    summaryHi: "Windows में पहले से उपलब्ध है। चालू या बंद करने के लिए Windows + Ctrl + Enter दबाएँ। डाउनलोड की आवश्यकता नहीं है।",
  },
  {
    name: "VoiceOver",
    summaryEn:
      "Built into Mac, iPhone, and iPad. On a Mac, press Command + F5. On iPhone or iPad, open Settings, then Accessibility, then VoiceOver.",
    summaryHi:
      "Mac, iPhone और iPad में पहले से उपलब्ध है। Mac पर Command + F5 दबाएँ। iPhone या iPad पर सेटिंग्स, फिर एक्सेसिबिलिटी, फिर VoiceOver खोलें।",
  },
  {
    name: "TalkBack",
    summaryEn: "Built into Android. Open Settings, then Accessibility, then TalkBack, and turn it on.",
    summaryHi: "Android में पहले से उपलब्ध है। सेटिंग्स, फिर एक्सेसिबिलिटी, फिर TalkBack खोलें और इसे चालू करें।",
  },
];

export function PublicScreenReaderAccessPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader variant="future" />
      <main id="main-content" tabIndex={-1} className={publicMainGradientClass}>
        <div className="gradient-hero pattern-dots px-4 py-12 text-white">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> {t("Home", "होम")}
            </Link>
            <h1 className={typeHeroTitleClass}>{t("Screen Reader Access", "स्क्रीन रीडर एक्सेस")}</h1>
            <p className="mt-3 max-w-2xl text-sm text-emerald-100/90 sm:text-base">
              {t(
                "This website is written so a screen reader can speak the page. The university site does not replace that software.",
                "यह वेबसाइट इस तरह लिखी गई है कि स्क्रीन रीडर पृष्ठ को पढ़कर सुना सके। विश्वविद्यालय की साइट उस सॉफ़्टवेयर की जगह नहीं लेती।",
              )}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-12">
          <section className={publicCardSoftClass} aria-labelledby="what-is-reader">
            <h2 id="what-is-reader" className="text-lg font-semibold text-slate-900 dark:text-emerald-50">
              {t("What a screen reader does", "स्क्रीन रीडर क्या करता है")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-emerald-100/90">
              {t(
                "A screen reader speaks menus, headings, links, buttons, and form fields. A person who is blind uses one of the programs below. After it is running, open this website and move with the keyboard.",
                "स्क्रीन रीडर मेनू, शीर्षक, लिंक, बटन और फ़ॉर्म फ़ील्ड को बोलकर बताता है। दृष्टिहीन व्यक्ति नीचे दिए किसी प्रोग्राम का उपयोग करते हैं। प्रोग्राम चलने के बाद यह वेबसाइट खोलें और कीबोर्ड से आगे बढ़ें।",
              )}
            </p>
          </section>

          <section aria-labelledby="reader-tools">
            <h2 id="reader-tools" className="text-lg font-semibold text-slate-900 dark:text-emerald-50">
              {t("Screen readers you can use", "आप ये स्क्रीन रीडर उपयोग कर सकते हैं")}
            </h2>
            <ul className="mt-4 space-y-3">
              {READERS.map((reader) => (
                <li key={reader.name} className={`${publicCardSoftClass} space-y-2`}>
                  <h3 className="font-semibold text-slate-900 dark:text-emerald-50">{reader.name}</h3>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-emerald-100/90">
                    {t(reader.summaryEn, reader.summaryHi)}
                  </p>
                  {reader.href && reader.linkEn && reader.linkHi ? (
                    <a
                      href={reader.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-semibold text-emerald-800 underline hover:text-emerald-950 dark:text-emerald-300"
                    >
                      {t(reader.linkEn, reader.linkHi)}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className={publicCardSoftClass} aria-labelledby="using-this-site">
            <h2 id="using-this-site" className="text-lg font-semibold text-slate-900 dark:text-emerald-50">
              {t("Using this website", "इस वेबसाइट का उपयोग")}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-emerald-100/90">
              <li>
                {t(
                  "The first link on every page is Skip to content. Activate it to jump past the menu.",
                  "हर पृष्ठ की पहली लिंक सामग्री पर जाएं है। मेनू छोड़कर आगे जाने के लिए इसे चुनें।",
                )}
              </li>
              <li>
                {t(
                  "Press Tab to move to the next link or button, and Shift + Tab to move back. Press Enter to open a link.",
                  "अगली लिंक या बटन पर जाने के लिए Tab दबाएँ, और पीछे जाने के लिए Shift + Tab। लिंक खोलने के लिए Enter दबाएँ।",
                )}
              </li>
              <li>
                {t(
                  "Use your screen reader's heading list to jump between sections, and its links list to hear every link on the page.",
                  "अनुभागों के बीच जाने के लिए अपने स्क्रीन रीडर की शीर्षक सूची का उपयोग करें, और पृष्ठ की हर लिंक सुनने के लिए लिंक सूची का उपयोग करें।",
                )}
              </li>
              <li>
                {t(
                  "A language control switches the site between English and Hindi. Search is available from the header.",
                  "भाषा नियंत्रण साइट को अंग्रेज़ी और हिंदी के बीच बदलता है। खोज हेडर से उपलब्ध है।",
                )}
              </li>
              <li>
                {t(
                  "Images include a text description. If a picture has no useful description, the screen reader skips it.",
                  "चित्रों के साथ पाठ विवरण दिया गया है। यदि किसी चित्र का उपयोगी विवरण नहीं है, तो स्क्रीन रीडर उसे छोड़ देता है।",
                )}
              </li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter variant="future" />
    </div>
  );
}
