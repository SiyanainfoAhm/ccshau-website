import { z } from "zod";

export const securitySettingsSchema = z.object({
  captchaEnabled: z.coerce.boolean(),
  emailEnabled: z.coerce.boolean(),
});
