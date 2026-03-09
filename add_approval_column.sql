-- Add approval status to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Allow existing admins to stay approved (auto-approve current users if desired, or manual)
-- Let's auto-approve current admins so you don't lock yourself out
UPDATE profiles SET approved = true WHERE role = 'admin';

-- Optional: Auto-approve everyone who already exists to avoid disruption
UPDATE profiles SET approved = true WHERE approved IS NULL;

-- Policy Update: Ensure only approved users can access sensitive data (This is usually done in Application Logic too)
-- But we can add a check if needed. For now, we rely on the Frontend/API check.
