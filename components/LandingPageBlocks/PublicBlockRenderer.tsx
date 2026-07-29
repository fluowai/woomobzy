import React from 'react';
import { Property } from '../../types';
import { Block, BlockType, LandingPageTheme } from '../../types/landingPage';
import { PublicLeadContext } from '../../services/publicLeadCapture';
import BrokerCardBlock from './BrokerCardBlock';
import CTABlock from './CTABlock';
import CustomHTMLBlock from './CustomHTMLBlock';
import DividerBlock from './DividerBlock';
import FeaturesBlock from './FeaturesBlock';
import FooterBlock from './FooterBlock';
import FormBlock from './FormBlock';
import GalleryBlock from './GalleryBlock';
import HeaderBlock from './HeaderBlock';
import HeroBlock from './HeroBlock';
import HeroWithFormBlock from './HeroWithFormBlock';
import ImageBlock from './ImageBlock';
import MapBlock from './MapBlock';
import PropertyCarouselBlock from './PropertyCarouselBlock';
import PropertyFeaturedBlock from './PropertyFeaturedBlock';
import PropertyGridBlock from './PropertyGridBlock';
import PropertySearchBlock from './PropertySearchBlock';
import SpacerBlock from './SpacerBlock';
import StatsBlock from './StatsBlock';
import TestimonialsBlock from './TestimonialsBlock';
import TextBlock from './TextBlock';
import TimelineBlock from './TimelineBlock';
import VideoBlock from './VideoBlock';

interface PublicBlockRendererProps {
  block: Block;
  theme: LandingPageTheme;
  properties?: Property[];
  settings?: unknown;
  leadContext?: PublicLeadContext;
}

const PublicBlockRenderer: React.FC<PublicBlockRendererProps> = ({
  block,
  theme,
  properties = [],
  settings,
  leadContext,
}) => {
  if (!block.visible) return null;

  const config = block.config as any;
  switch (block.type) {
    case BlockType.HEADER:
      return <HeaderBlock config={config} theme={theme} />;
    case BlockType.FOOTER:
      return <FooterBlock config={config} theme={theme} />;
    case BlockType.HERO:
      return <HeroBlock config={config} theme={theme} />;
    case BlockType.HERO_WITH_FORM:
      return (
        <HeroWithFormBlock
          config={config}
          theme={theme}
          leadContext={leadContext}
        />
      );
    case BlockType.PROPERTY_GRID:
      return (
        <PropertyGridBlock
          config={config}
          theme={theme}
          properties={properties}
        />
      );
    case BlockType.PROPERTY_CAROUSEL:
      return (
        <PropertyCarouselBlock
          config={config}
          theme={theme}
          properties={properties}
        />
      );
    case BlockType.PROPERTY_FEATURED:
      return (
        <PropertyFeaturedBlock
          config={config}
          theme={theme}
          properties={properties}
        />
      );
    case BlockType.PROPERTY_SEARCH:
      return (
        <PropertySearchBlock
          config={config}
          theme={theme}
          properties={properties}
        />
      );
    case BlockType.TEXT:
      return <TextBlock config={config} theme={theme} />;
    case BlockType.IMAGE:
      return <ImageBlock config={config} theme={theme} />;
    case BlockType.VIDEO:
      return <VideoBlock config={config} theme={theme} />;
    case BlockType.GALLERY:
      return <GalleryBlock config={config} theme={theme} />;
    case BlockType.FORM:
      return (
        <FormBlock config={config} theme={theme} leadContext={leadContext} />
      );
    case BlockType.CTA:
      return <CTABlock config={config} theme={theme} />;
    case BlockType.TESTIMONIALS:
      return <TestimonialsBlock config={config} theme={theme} />;
    case BlockType.STATS:
      return <StatsBlock config={config} theme={theme} />;
    case BlockType.MAP:
      return <MapBlock config={config} theme={theme} />;
    case BlockType.TIMELINE:
      return <TimelineBlock config={config} theme={theme} />;
    case BlockType.BROKER_CARD:
      return (
        <BrokerCardBlock config={config} theme={theme} settings={settings} />
      );
    case BlockType.FEATURES:
      return <FeaturesBlock config={config} theme={theme} />;
    case BlockType.SPACER:
      return <SpacerBlock config={config} />;
    case BlockType.DIVIDER:
      return <DividerBlock config={config} />;
    case BlockType.CUSTOM_HTML:
      return (
        <CustomHTMLBlock
          config={config}
          leadContext={leadContext}
          enableFormSubmission
        />
      );
    default:
      return null;
  }
};

export default PublicBlockRenderer;
