-- Add visibility control to best_teams_cache table
-- This allows admins to hide/show best teams results from public client
USE drone_soccer;

ALTER TABLE best_teams_cache 
ADD COLUMN is_public TINYINT(1) DEFAULT 1 COMMENT 'Whether the stats are visible to public clients (1=visible, 0=hidden)';

-- Add index for better query performance
ALTER TABLE best_teams_cache 
ADD INDEX idx_is_public (is_public);