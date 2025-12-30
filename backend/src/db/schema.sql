-- Note: When using Docker, the database is created via POSTGRES_DB env var
-- For manual setup, run: CREATE DATABASE frame_note;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Annotations table
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY,
    video_id VARCHAR(64) NOT NULL,  -- SHA-256 hash of video
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES annotations(id) ON DELETE CASCADE,  -- For replies
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    type VARCHAR(20) NOT NULL CHECK (type IN ('comment', 'drawing')),
    drawing_data JSONB,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster video lookups
CREATE INDEX IF NOT EXISTS idx_annotations_video_id ON annotations(video_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_annotations_start_time ON annotations(video_id, start_time);

