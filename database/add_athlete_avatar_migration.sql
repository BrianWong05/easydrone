-- Add avatar field to athletes table
USE drone_soccer;

-- Add avatar column to athletes table
ALTER TABLE athletes 
ADD COLUMN avatar_url VARCHAR(500) NULL COMMENT '運動員頭像URL' 
AFTER is_active;

-- Create uploads directory structure (this will be handled by the backend)
-- The actual file storage will be in server/uploads/avatars/