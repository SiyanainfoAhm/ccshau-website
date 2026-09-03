#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../Documents/hindi-faculty/bawal-profiles");
const path = join(PROFILE_DIR, "blocks-translated.json");
const data = JSON.parse(readFileSync(path, "utf8"));

const manual = [
  {
    en_html:
      '<span style="font-size: 14px;"><span style="font-family: Georgia,serif;">Yadav Sarita, Yadav A, <strong>Bagotia N</strong>, Sharma Nishita, Sharma AK &nbsp; and Kumar S. (2022). Simultaneous adsorption of three anionic dyes at neutral &nbsp; pH from their individual and multi-component systems on a CTAB modified &nbsp; Pennisetum glaucum based carbon nanotube green composite: Adsorption &nbsp; mechanism and process optimization by Box-Behnken design model. <em>Journal of Molecular Liquids</em>, <strong>358</strong>: 119223.</span></span><br>',
    hi_html:
      '<span style="font-size: 14px;"><span style="font-family: Georgia,serif;">Yadav Sarita, Yadav A, <strong>Bagotia N</strong>, Sharma Nishita, Sharma AK &nbsp; and Kumar S. (2022). तटस्थ &nbsp; pH पर उनकी व्यष्टि और बहु-घटक प्रणालियों से तीन एनियोनिक रंजकों का CTAB संशोधित &nbsp; Pennisetum glaucum आधारित कार्बन नैनोट्यूब हरित संयोजन पर एक साथ अवशोषण: Box-Behnken डिज़ाइन मॉडल द्वारा अवशोषण &nbsp; तंत्र और प्रक्रिया अनुकूलन। <em>Journal of Molecular Liquids</em>, <strong>358</strong>: 119223.</span></span><br>',
    used_by: 1,
  },
  {
    en_html:
      "Sandhu. K.S., Kaur, P., <strong>Siroha, A.K.,</strong> Purewal,S.S. &nbsp; (2020). &nbsp;Phytochemicals and Antioxidant &nbsp; Properties in Pearl Millet: A &nbsp; Cereal Grain with Potential Applications. In: Punia, S., Siroha, A.K., Sandhu<strong>,</strong> K.S., Gahlawat, S.K., Kaur, M. &nbsp; (eds), Pearl Millet: Properties, &nbsp; Functionality and its Applications. CRC Press, Taylor and Francis Group, Boca &nbsp; Raton, London, New York. PP. 33-50.",
    hi_html:
      "Sandhu. K.S., Kaur, P., <strong>Siroha, A.K.,</strong> Purewal,S.S. &nbsp; (2020). &nbsp;Pearl Millet में फाइटोकेमिकल्स और एंटीऑक्सीडेंट &nbsp; गुण: संभावित अनुप्रयोगों वाला एक &nbsp; अनाज। In: Punia, S., Siroha, A.K., Sandhu<strong>,</strong> K.S., Gahlawat, S.K., Kaur, M. &nbsp; (eds), Pearl Millet: Properties, &nbsp; Functionality and its Applications. CRC Press, Taylor and Francis Group, Boca &nbsp; Raton, London, New York. पृ. 33-50.",
    used_by: 1,
  },
  {
    en_html:
      '<span style="color:#222222;background:white;">Purewal, S. S., Kaur, P., Sandhu, K. S., &nbsp; Bangar, S. P<strong>., Siroha, A. K.</strong>, &nbsp; Singh, S. K., ... &amp; Markandey, D. K. (2022). Nutritional profile of maize &nbsp; and effect of processing methods. In S.S. Purewal, and Co-workers (eds). &nbsp;<em>Maize</em>: <em>Nutritional Composition, Processing and Industrial Uses</em>, CRC &nbsp; Press,&nbsp;</span>Taylor and Francis Group, Boca Raton, London, New &nbsp; York<span style="color:#222222;background:white;">, PP. 77-100.</span>',
    hi_html:
      '<span style="color:#222222;background:white;">Purewal, S. S., Kaur, P., Sandhu, K. S., &nbsp; Bangar, S. P<strong>., Siroha, A. K.</strong>, &nbsp; Singh, S. K., ... &amp; Markandey, D. K. (2022). मक्के का &nbsp; पोषण प्रोफ़ाइल और प्रसंस्करण विधियों का प्रभाव। In S.S. Purewal, and Co-workers (eds). &nbsp;<em>Maize</em>: <em>Nutritional Composition, Processing and Industrial Uses</em>, CRC &nbsp; Press,&nbsp;</span>Taylor and Francis Group, Boca Raton, London, New &nbsp; York<span style="color:#222222;background:white;">, पृ. 77-100.</span>',
    used_by: 1,
  },
];

const keys = new Set(data.blocks.map((b) => b.en_html));
let added = 0;
for (const b of manual) {
  if (!keys.has(b.en_html)) {
    data.blocks.push(b);
    keys.add(b.en_html);
    added++;
  }
}
data.exported_at = new Date().toISOString();
writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log(`Manual added: ${added}, Total: ${data.blocks.length}`);
