import { listDepartments } from "@/actions/pages";
import { PublicContactPage } from "@/components/site/public-contact-page";
import { getCaptchaClientConfig } from "@/lib/auth/captcha";

export const metadata = {
  title: "Contact & Feedback",
  description: "Contact CCSHAU Hisar and submit feedback or enquiries",
};

export default async function ContactPage() {
  const [departments, captcha] = await Promise.all([listDepartments(), getCaptchaClientConfig()]);
  return <PublicContactPage departments={departments} captcha={captcha} />;
}
