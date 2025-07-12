-- Migration: Add description field to teams table
-- Date: 2025-07-12
-- Description: Adds a description field to the teams table to store team descriptions

USE drone_soccer;

-- Add description column to teams table
ALTER TABLE teams 
ADD COLUMN description TEXT NULL 
COMMENT '隊伍描述' 
AFTER is_virtual;

-- Update table comment to reflect the new field
ALTER TABLE teams 
COMMENT = '隊伍表 - 包含隊伍基本信息和描述';

-- Show the updated table structure
DESCRIBE teams;

-- Optional: Show a sample of existing teams to verify the migration
SELECT team_id, team_name, description, created_at 
FROM teams 
LIMIT 5;