-- Migration: Add parent_id for reply functionality
-- Date: 2025-12-30

BEGIN;

-- Add parent_id column
ALTER TABLE annotations 
ADD COLUMN parent_id UUID REFERENCES annotations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_annotations_parent_id ON annotations(parent_id);

COMMIT;