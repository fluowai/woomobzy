import { describe, it, expect } from 'vitest';
import { 
  propertySchema, 
  leadSchema, 
  contactSchema, 
  landingPageSchema 
} from '../schemas/index.js';

describe('Property Schema', () => {
  it('should validate a valid property', () => {
    const property = {
      title: 'Fazenda São João',
      property_type: 'FAZENDA',
      category: 'RURAL',
      total_area: 100,
      state: 'SP',
      city: 'Campinas',
      price_total: 500000,
    };
    
    const result = propertySchema.safeParse(property);
    expect(result.success).toBe(true);
  });

  it('should reject property without title', () => {
    const property = {
      property_type: 'FAZENDA',
      category: 'RURAL',
      total_area: 100,
      state: 'SP',
      city: 'Campinas',
      price_total: 500000,
    };
    
    const result = propertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });

  it('should reject property with negative area', () => {
    const property = {
      title: 'Fazenda São João',
      property_type: 'FAZENDA',
      category: 'RURAL',
      total_area: -100,
      state: 'SP',
      city: 'Campinas',
      price_total: 500000,
    };
    
    const result = propertySchema.safeParse(property);
    expect(result.success).toBe(false);
  });
});

describe('Lead Schema', () => {
  it('should validate a valid lead', () => {
    const lead = {
      name: 'João Silva',
      phone: '11999999999',
    };
    
    const result = leadSchema.safeParse(lead);
    expect(result.success).toBe(true);
  });

  it('should validate lead with email', () => {
    const lead = {
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '11999999999',
      source: 'WEBSITE',
    };
    
    const result = leadSchema.safeParse(lead);
    expect(result.success).toBe(true);
  });

  it('should reject lead without name', () => {
    const lead = {
      phone: '11999999999',
    };
    
    const result = leadSchema.safeParse(lead);
    expect(result.success).toBe(false);
  });

  it('should reject lead with invalid email', () => {
    const lead = {
      name: 'João Silva',
      email: 'invalid-email',
      phone: '11999999999',
    };
    
    const result = leadSchema.safeParse(lead);
    expect(result.success).toBe(false);
  });
});

describe('Contact Schema', () => {
  it('should validate a valid contact', () => {
    const contact = {
      name: 'Maria Santos',
      phone: '11988887777',
      message: 'Gostaria de mais informações sobre o imóvel.',
    };
    
    const result = contactSchema.safeParse(contact);
    expect(result.success).toBe(true);
  });

  it('should reject contact with short message', () => {
    const contact = {
      name: 'Maria Santos',
      phone: '11988887777',
      message: 'Olá',
    };
    
    const result = contactSchema.safeParse(contact);
    expect(result.success).toBe(false);
  });
});

describe('Landing Page Schema', () => {
  it('should validate a valid landing page', () => {
    const page = {
      name: 'Minha Landing Page',
      slug: 'minha-landing-page',
    };
    
    const result = landingPageSchema.safeParse(page);
    expect(result.success).toBe(true);
  });

  it('should reject page with invalid slug', () => {
    const page = {
      name: 'Minha Landing Page',
      slug: 'Slug Invalido',
    };
    
    const result = landingPageSchema.safeParse(page);
    expect(result.success).toBe(false);
  });
});
