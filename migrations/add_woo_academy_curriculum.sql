-- Add curriculum column to woo_academy_courses for course content/outline
ALTER TABLE woo_academy_courses
ADD COLUMN IF NOT EXISTS curriculum TEXT;
