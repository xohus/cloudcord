CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS profiles_created_at ON profiles(created_at);

CREATE TABLE IF NOT EXISTS profile_owners (
    user_id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS profile_owners_profile_id ON profile_owners(profile_id);
