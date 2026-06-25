export const DOMAIN_COLORS: Record<string, string> = {
  RL: "#3b82f6",
  RI: "#06b6d4",
  RF: "#8b5cf6",
  W: "#10b981",
  SL: "#f59e0b",
  L: "#f43f5e",
};

export const DOMAIN_LABELS: Record<string, string> = {
  RL: "Literature",
  RI: "Informational",
  RF: "Foundations",
  W: "Writing",
  SL: "Speaking & Listening",
  L: "Language",
};

export const MASTERY_COLORS: Record<string, string> = {
  not_started: "bg-gray-200 text-gray-600",
  introduced: "bg-blue-300 text-blue-900",
  practicing: "bg-amber-400 text-amber-900",
  approaching: "bg-purple-400 text-purple-900",
  mastered: "bg-green-500 text-white",
};

export const MASTERY_LABELS: Record<string, string> = {
  not_started: "Not Started",
  introduced: "Introduced",
  practicing: "Practicing",
  approaching: "Approaching",
  mastered: "Mastered",
};

export const HEATMAP_COLOR = (score: number): string => {
  if (score >= 80) return "bg-green-400";
  if (score >= 60) return "bg-yellow-300";
  if (score >= 40) return "bg-orange-300";
  if (score > 0) return "bg-red-300";
  return "bg-gray-100";
};

export const GRADE_OPTIONS = [
  "K", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th",
];

export const INTEREST_OPTIONS = [
  "sports", "music", "gaming", "anime", "art",
  "science", "food", "fashion", "animals",
];

export const EXTENDED_INTEREST_OPTIONS = [
  { id: "sports",       label: "Sports & Fitness",     emoji: "⚽" },
  { id: "music",        label: "Music",                emoji: "🎵" },
  { id: "gaming",       label: "Gaming",               emoji: "🎮" },
  { id: "anime",        label: "Anime & Manga",        emoji: "🌸" },
  { id: "art",          label: "Art & Drawing",        emoji: "🎨" },
  { id: "science",      label: "Science",              emoji: "🔬" },
  { id: "food",         label: "Food & Cooking",       emoji: "🍳" },
  { id: "fashion",      label: "Fashion & Style",      emoji: "👗" },
  { id: "animals",      label: "Animals & Nature",     emoji: "🐾" },
  { id: "dance",        label: "Dance",                emoji: "💃" },
  { id: "travel",       label: "Travel & Adventure",   emoji: "✈️" },
  { id: "books",        label: "Books & Reading",      emoji: "📚" },
  { id: "history",      label: "History & Culture",    emoji: "🏛️" },
  { id: "tech",         label: "Tech & Coding",        emoji: "💻" },
  { id: "movies",       label: "Movies & Shows",       emoji: "🎬" },
  { id: "justice",      label: "Justice & Activism",   emoji: "✊" },
];

export const CULTURAL_CONTEXT_OPTIONS = [
  { id: "african_american",   label: "African American",    emoji: "🌍" },
  { id: "latinx",             label: "Latino/a/x",          emoji: "🌮" },
  { id: "south_asian",        label: "South Asian",         emoji: "🪷" },
  { id: "east_asian",         label: "East Asian",          emoji: "🏮" },
  { id: "southeast_asian",    label: "Southeast Asian",     emoji: "🌺" },
  { id: "indigenous",         label: "Indigenous/Native",   emoji: "🪶" },
  { id: "middle_eastern",     label: "Middle Eastern",      emoji: "🌙" },
  { id: "pacific_islander",   label: "Pacific Islander",    emoji: "🌊" },
  { id: "european",           label: "European",            emoji: "🏰" },
  { id: "caribbean",          label: "Caribbean",           emoji: "🌴" },
  { id: "multiracial",        label: "Multiracial / Mixed", emoji: "🌈" },
  { id: "prefer_not",         label: "Prefer not to say",  emoji: "🤝" },
];

export const MUSIC_OPTIONS = [
  { id: "hiphop",    label: "Hip-Hop / Rap",    emoji: "🎤" },
  { id: "rnb",       label: "R&B / Soul",        emoji: "🎶" },
  { id: "pop",       label: "Pop",               emoji: "⭐" },
  { id: "latin",     label: "Latin / Reggaeton", emoji: "🔥" },
  { id: "afrobeats", label: "Afrobeats",         emoji: "🥁" },
  { id: "kpop",      label: "K-Pop",             emoji: "🌸" },
  { id: "rock",      label: "Rock / Metal",      emoji: "🎸" },
  { id: "classical", label: "Classical",         emoji: "🎻" },
  { id: "country",   label: "Country",           emoji: "🤠" },
  { id: "edm",       label: "EDM / Electronic",  emoji: "🎧" },
];

export const PRONOUN_OPTIONS = [
  { id: "she/her",    label: "She / Her" },
  { id: "he/him",     label: "He / Him" },
  { id: "they/them",  label: "They / Them" },
  { id: "xe/xem",     label: "Xe / Xem" },
  { id: "any",        label: "Any / All" },
  { id: "prefer_not", label: "Prefer not to say" },
];

export const LEARNING_STYLE_OPTIONS = [
  { id: "visual",     label: "I learn best by seeing (videos, diagrams, charts)", emoji: "👁️" },
  { id: "reading",    label: "I learn best by reading and taking notes",           emoji: "📖" },
  { id: "listening",  label: "I learn best by listening and talking it through",   emoji: "👂" },
  { id: "doing",      label: "I learn best by doing hands-on activities",          emoji: "✋" },
];

export const GOAL_OPTIONS = [
  { id: "read_better",    label: "Read better and faster",       emoji: "📖" },
  { id: "write_better",   label: "Improve my writing",           emoji: "✍️" },
  { id: "grade_level",    label: "Catch up to my grade level",   emoji: "📈" },
  { id: "college",        label: "Get ready for college",        emoji: "🎓" },
  { id: "confidence",     label: "Feel more confident in class", emoji: "💪" },
  { id: "love_reading",   label: "Learn to love reading",        emoji: "❤️" },
  { id: "test_scores",    label: "Improve test scores",          emoji: "🏆" },
  { id: "vocab",          label: "Build my vocabulary",          emoji: "🔤" },
];

export const AVATAR_OPTIONS = [
  "🦁", "🐯", "🐺", "🦊", "🐸", "🦋", "🌟", "🚀",
  "🔥", "⚡", "🌈", "🎯", "💫", "🏆", "🌺", "🦅",
];

export const ROLE_KEY = "alphabet_ai_role";
export const STUDENT_ID_KEY = "alphabet_ai_student_id";
export const PLACEMENT_COMPLETED_KEY = "alphabet_ai_placement_done";
export const DISPLAY_NAME_KEY = "alphabet_ai_display_name";
// Session-scoped flag: once the landing page has auto-routed a signed-in user
// (right after login), it stops bouncing so the home page stays reachable
// (e.g. via the logo). Cleared on logout so the next login redirects again.
export const HOME_REDIRECTED_KEY = "alphabet_ai_home_redirected";
// Session-scoped: when an admin is previewing one of the three role views
// (student / teacher / caregiver), this holds which view they're currently in.
// Cleared when the admin exits back to the admin portal or logs out.
export const VIEW_AS_KEY = "alphabet_ai_view_as";
