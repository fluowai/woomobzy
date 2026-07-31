import { LandingPageTemplate } from './shared';
import { ELEMENTOR_REFERENCE_TEMPLATES } from './elementor';
import { DESIGNED_SHOWCASE_TEMPLATES } from './designedShowcase';
import { PREMIUM_LANDING_PAGE_TEMPLATES } from './premium';
import { LEGACY_LANDING_PAGE_TEMPLATES } from './legacy';
import { RURAL_TEMPLATES } from './rural';
import { INCORPORADORA_TEMPLATES } from './incorporadora';
import { LOTEADORA_TEMPLATES } from './loteadora';
import { URBANO_TEMPLATES } from './urbano';
import { CUSTOM_BRANDS_TEMPLATES } from './customBrands';

export type { LandingPageTemplate } from './shared';
export { generateBlocksFromTemplate } from './shared';
export {
  defaultPremiumTheme,
  templateBlock,
  premiumFormFields,
  buildPremiumTemplate,
  premiumBaseSections,
  landingImage,
  buildDesignedTemplate,
  designedSections,
  buildElementorReferenceTemplate,
} from './shared';

export const LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  ...URBANO_TEMPLATES,
  ...PREMIUM_LANDING_PAGE_TEMPLATES,
  ...RURAL_TEMPLATES,
  ...INCORPORADORA_TEMPLATES,
  ...CUSTOM_BRANDS_TEMPLATES,
];

const ALL_TEMPLATES: LandingPageTemplate[] = [
  ...LANDING_PAGE_TEMPLATES,
  ...ELEMENTOR_REFERENCE_TEMPLATES,
  ...DESIGNED_SHOWCASE_TEMPLATES,
  ...LEGACY_LANDING_PAGE_TEMPLATES,
];

export const getTemplateById = (
  id: string
): LandingPageTemplate | undefined => {
  return ALL_TEMPLATES.find((t) => t.id === id);
};
