import previewFactoryCircuit from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/slideshow-preview/03-factory-circuit.png";
import previewImages from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/slideshow-preview/04-images.png";
import previewOverview from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/slideshow-preview/01-overview.png";
import previewSlideshowCard from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/slideshow-card.png";
import previewSolar from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/slideshow-preview/02-solar.png";
import previewSustainability from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/slideshow-preview/05-sustainability.png";

export const slideshowPreviewAssetRuntimeMap = {
  "factory-circuit": previewFactoryCircuit,
  images: previewImages,
  overview: previewOverview,
  solar: previewSolar,
  sustainability: previewSustainability,
  fallback: previewSlideshowCard
} as const;
