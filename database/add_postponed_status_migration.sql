-- Migration: Add 'postponed' status to match_status ENUM
-- Date: 2024-11-12
-- Description: Adds 'postponed' status to allow matches to be postponed with delay functionality

-- Add 'postponed' status to match_status ENUM
ALTER TABLE matches MODIFY COLUMN match_status ENUM('pending', 'active', 'overtime', 'completed', 'postponed') DEFAULT 'pending';

-- Verify the change
SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'drone_soccer' 
AND TABLE_NAME = 'matches' 
AND COLUMN_NAME = 'match_status';