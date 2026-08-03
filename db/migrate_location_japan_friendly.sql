ALTER TABLE airpath.locations
  ADD COLUMN IF NOT EXISTS is_japan_friendly boolean NOT NULL DEFAULT false;

ALTER TABLE airpath.locations
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE airpath.locations
SET is_japan_friendly = true
WHERE metadata ->> 'is_japan_friendly' = 'true';
