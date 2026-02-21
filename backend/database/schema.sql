-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER DEFAULT 0,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birthdate TEXT,
  gender TEXT,
  nationality TEXT,
  phone TEXT,
  address TEXT,
  language_pref TEXT DEFAULT 'auto',
  currency_pref TEXT DEFAULT 'NOK',
  avatar_url TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  friend_user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, friend_user_id)
);

-- Trips
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  leader_user_id TEXT NOT NULL REFERENCES users(id),
  booker_user_id TEXT REFERENCES users(id),
  start_date TEXT,
  end_date TEXT,
  budget_per_person REAL,
  budget_currency TEXT DEFAULT 'NOK',
  interests TEXT DEFAULT '[]',
  preferred_countries TEXT DEFAULT '[]',
  enable_country INTEGER DEFAULT 1,
  enable_place INTEGER DEFAULT 1,
  enable_flight INTEGER DEFAULT 1,
  enable_hotel INTEGER DEFAULT 1,
  enable_activity INTEGER DEFAULT 1,
  voting_timing TEXT DEFAULT 'ALL_AT_END' CHECK(voting_timing IN ('CONTINUOUS','ALL_AT_END')),
  suggestion_deadline TEXT,
  voting_deadline TEXT,
  status TEXT DEFAULT 'COLLECTING_SUGGESTIONS' CHECK(status IN ('COLLECTING_SUGGESTIONS','VOTING_OPEN','VOTING_CLOSED','LOCKED','BOOKING_IN_PROGRESS','BOOKED')),
  fixed_destination_place_id TEXT,
  invite_code TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Trip Memberships
CREATE TABLE IF NOT EXISTS trip_memberships (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT DEFAULT 'MEMBER' CHECK(role IN ('LEADER','BOOKER','MEMBER')),
  joined_at TEXT DEFAULT (datetime('now')),
  left_at TEXT,
  consent_given INTEGER DEFAULT 0,
  consent_timestamp TEXT,
  UNIQUE(trip_id, user_id)
);

-- Object Catalog
CREATE TABLE IF NOT EXISTS catalog_objects (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('COUNTRY','PLACE','HOTEL','ACTIVITY','FLIGHT','TRANSPORT')),
  provider TEXT DEFAULT 'INTERNAL',
  provider_ref TEXT,
  name TEXT NOT NULL,
  country_code TEXT,
  city TEXT,
  lat REAL,
  lng REAL,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Trip Option Groups
CREATE TABLE IF NOT EXISTS trip_option_groups (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('COUNTRY','PLACE','HOTEL','ACTIVITY','FLIGHT')),
  parent_group_id TEXT REFERENCES trip_option_groups(id),
  constraint_min INTEGER DEFAULT 1,
  constraint_max INTEGER DEFAULT 3,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','LOCKED')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Trip Option Items
CREATE TABLE IF NOT EXISTS trip_option_items (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES trip_option_groups(id) ON DELETE CASCADE,
  catalog_object_id TEXT NOT NULL REFERENCES catalog_objects(id),
  source TEXT DEFAULT 'LEADER_CURATED' CHECK(source IN ('LEADER_CURATED','USER_SUGGESTED_APPROVED')),
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','REMOVED')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  suggested_by_user_id TEXT NOT NULL REFERENCES users(id),
  target_group_type TEXT NOT NULL,
  catalog_object_id TEXT NOT NULL REFERENCES catalog_objects(id),
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by_user_id TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Votes
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  vote_context TEXT NOT NULL,
  target_group_id TEXT NOT NULL REFERENCES trip_option_groups(id),
  ranking TEXT NOT NULL DEFAULT '[]',
  submitted_at TEXT DEFAULT (datetime('now')),
  UNIQUE(trip_id, user_id, vote_context, target_group_id)
);

-- Vote Aggregates
CREATE TABLE IF NOT EXISTS vote_aggregates (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  catalog_object_id TEXT NOT NULL,
  points_total INTEGER DEFAULT 0,
  first_place_count INTEGER DEFAULT 0,
  second_place_count INTEGER DEFAULT 0,
  third_place_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(trip_id, group_id, catalog_object_id)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Chat Reactions
CREATE TABLE IF NOT EXISTS chat_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  emoji TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(message_id, user_id, emoji)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('REMINDER','VOTING_STARTED','VOTING_LOCKED_RESULT','INVITATION','BOOKER_ASSIGNED','GENERAL')),
  payload TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('FLIGHT_TICKET','HOTEL_CONFIRMATION','ACTIVITY_TICKET','OTHER')),
  provider TEXT,
  provider_ref TEXT,
  url TEXT,
  title TEXT,
  participants TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  catalog_object_id TEXT NOT NULL REFERENCES catalog_objects(id),
  stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, catalog_object_id)
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  image_url TEXT,
  caption TEXT,
  visibility TEXT DEFAULT 'PUBLIC' CHECK(visibility IN ('PUBLIC','FRIENDS_ONLY')),
  tagged_catalog_object_ids TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Post Likes
CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id)
);

-- Visited Places
CREATE TABLE IF NOT EXISTS visited_places (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  catalog_place_id TEXT NOT NULL REFERENCES catalog_objects(id),
  source TEXT DEFAULT 'MANUAL' CHECK(source IN ('TRIP_AUTO','MANUAL')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, catalog_place_id)
);
