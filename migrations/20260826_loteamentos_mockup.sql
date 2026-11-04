-- Add svg_map to developments table
ALTER TABLE public.developments 
ADD COLUMN IF NOT EXISTS svg_map TEXT;
