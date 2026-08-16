import { describe, it, expect } from 'vitest';
import { BlockType } from '../../types/landingPage';

describe('Landing Page Types', () => {
  it('should have BlockType enum defined', () => {
    expect(BlockType).toBeDefined();
  });

  it('should include structure blocks', () => {
    expect(BlockType.HEADER).toBe('header');
    expect(BlockType.FOOTER).toBe('footer');
  });

  it('should include hero blocks', () => {
    expect(BlockType.HERO).toBe('hero');
    expect(BlockType.HERO_WITH_FORM).toBe('hero_with_form');
  });

  it('should include property blocks', () => {
    expect(BlockType.PROPERTY_GRID).toBe('property_grid');
    expect(BlockType.PROPERTY_CAROUSEL).toBe('property_carousel');
    expect(BlockType.PROPERTY_FEATURED).toBe('property_featured');
    expect(BlockType.PROPERTY_SEARCH).toBe('property_search');
  });

  it('should include content blocks', () => {
    expect(BlockType.TEXT).toBe('text');
    expect(BlockType.IMAGE).toBe('image');
    expect(BlockType.VIDEO).toBe('video');
    expect(BlockType.GALLERY).toBe('gallery');
  });

  it('should include interactive blocks', () => {
    expect(BlockType.FORM).toBe('form');
    expect(BlockType.CTA).toBe('cta');
    expect(BlockType.MAP).toBe('map');
    expect(BlockType.TESTIMONIALS).toBe('testimonials');
  });
});
