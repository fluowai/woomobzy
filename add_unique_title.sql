
-- Add unique constraint to title to allow UPSERT operations during migration
ALTER TABLE properties ADD CONSTRAINT properties_title_key UNIQUE (title);
