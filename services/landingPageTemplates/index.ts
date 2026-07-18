import { LandingPageTemplate } from './shared';
import { ELEMENTOR_REFERENCE_TEMPLATES } from './elementor';
import { DESIGNED_SHOWCASE_TEMPLATES } from './designedShowcase';
import { PREMIUM_LANDING_PAGE_TEMPLATES } from './premium';
import { LEGACY_LANDING_PAGE_TEMPLATES } from './legacy';

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
export { ELEMENTOR_REFERENCE_TEMPLATES } from './elementor';
export { DESIGNED_SHOWCASE_TEMPLATES } from './designedShowcase';
export { PREMIUM_LANDING_PAGE_TEMPLATES } from './premium';
export { LEGACY_LANDING_PAGE_TEMPLATES } from './legacy';

export const LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  ...ELEMENTOR_REFERENCE_TEMPLATES,
  ...DESIGNED_SHOWCASE_TEMPLATES,
  ...PREMIUM_LANDING_PAGE_TEMPLATES,
  ...LEGACY_LANDING_PAGE_TEMPLATES,
];

export const getTemplateById = (
  id: string
): LandingPageTemplate | undefined => {
  return LANDING_PAGE_TEMPLATES.find((t) => t.id === id);
};
