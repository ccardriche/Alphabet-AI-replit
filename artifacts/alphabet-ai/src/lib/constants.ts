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

export const ROLE_KEY = "alphabet_ai_role";
export const STUDENT_ID_KEY = "alphabet_ai_student_id";
