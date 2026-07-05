import overviewHeroImage from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/clean/factory-bg.png";
import overviewBackground1 from "../../../../../uploads/overview_bg-1.png";
import overviewBackground2 from "../../../../../uploads/overview_bg-2.png";
import overviewBackground3 from "../../../../../uploads/overview_bg-3.png";
import overviewBackground4 from "../../../../../uploads/overview_bg-4.png";
import overviewBackgroundChungli from "../../../../../uploads/images/overview_bg_chungli.jpg";
import overviewBackgroundGuanyin from "../../../../../uploads/images/overview_bg_guanyin.jpg";

export const overviewAssetRuntimeMap = {
  backgrounds: [
    overviewBackgroundChungli,
    overviewBackgroundGuanyin,
    overviewBackground1,
    overviewBackground2,
    overviewBackground3,
    overviewBackground4
  ],
  hero: overviewHeroImage
} as const;
