import { Ionicons } from "@expo/vector-icons";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SmartScoreBar } from "@/components/SmartScoreBar";
import { useAuth } from "@/contexts/AuthContext";
import { useGetStudentProfile, useGetMyBadges } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const PATHWAY_LABELS: Record<string, string> = {
  foundation: "Foundation",
  developing: "Developing",
  proficient: "Proficient",
  advanced: "Advanced",
};

const PATHWAY_COLORS: Record<string, string> = {
  foundation: "#3b82f6",
  developing: "#f59e0b",
  proficient: "#8b5cf6",
  advanced: "#10b981",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const { data: profile, isLoading: profileLoading } = useGetStudentProfile();
  const { data: badges, isLoading: badgesLoading } = useGetMyBadges();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (profileLoading) return <LoadingScreen />;

  const pathway = profile?.placementPathway ?? "developing";
  const pathwayColor = PATHWAY_COLORS[pathway] ?? colors.primary;
  const earnedBadges = (badges ?? []).filter((b: { earned: boolean }) => b.earned);

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 8, paddingBottom: botPad + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profile</Text>

      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(profile?.displayName ?? user?.firstName ?? "?")[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.displayName, { color: colors.foreground }]}>
            {profile?.displayName ?? user?.firstName ?? "Learner"}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {user?.email ?? ""}
          </Text>
          {profile?.grade && (
            <Text style={[styles.grade, { color: colors.mutedForeground }]}>
              Grade {profile.grade}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: "Total XP", value: `${profile?.totalXp ?? 0}`, icon: "flash" as const, color: "#f59e0b" },
          { label: "Streak", value: `${profile?.currentStreak ?? 0}d`, icon: "flame" as const, color: "#ef4444" },
        ].map((s, i) => (
          <View
            key={i}
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
                flex: 1,
              },
            ]}
          >
            <Ionicons name={s.icon} size={22} color={s.color} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {profile?.placementPathway && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Learning Pathway
          </Text>
          <View
            style={[
              styles.pathwayCard,
              {
                backgroundColor: pathwayColor + "12",
                borderColor: pathwayColor + "40",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.pathwayLabel, { color: pathwayColor }]}>
              {PATHWAY_LABELS[pathway] ?? pathway}
            </Text>
            {profile.diagnosedGradeLevel && (
              <Text style={[styles.pathwayLevel, { color: colors.mutedForeground }]}>
                Diagnosed: {profile.diagnosedGradeLevel}
              </Text>
            )}
          </View>
        </View>
      )}

      {earnedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Badges ({earnedBadges.length})
          </Text>
          <View style={styles.badgesGrid}>
            {earnedBadges.slice(0, 9).map((b: { code?: string; icon?: string; title?: string; earned: boolean }, i: number) => (
              <View
                key={b.code ?? i}
                style={[
                  styles.badgeItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text style={styles.badgeEmoji}>{b.icon ?? "🏆"}</Text>
                <Text
                  style={[styles.badgeName, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {b.title ?? "Badge"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {(profile?.interests?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Interests</Text>
          <View style={styles.interestRow}>
            {(profile?.interests ?? []).map((interest, i) => (
              <View
                key={i}
                style={[
                  styles.interestChip,
                  {
                    backgroundColor: colors.primary + "12",
                    borderColor: colors.primary + "30",
                    borderRadius: 20,
                  },
                ]}
              >
                <Text style={[styles.interestText, { color: colors.primary }]}>
                  {interest}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.signOutBtn,
          {
            backgroundColor: colors.destructive + "12",
            borderColor: colors.destructive + "40",
            borderRadius: colors.radius,
          },
        ]}
        onPress={handleSignOut}
        disabled={signingOut}
        activeOpacity={0.75}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 20 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  displayName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  email: { fontSize: 13, fontFamily: "Inter_400Regular" },
  grade: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: {
    padding: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  pathwayCard: {
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  pathwayLabel: { fontSize: 17, fontFamily: "Inter_700Bold" },
  pathwayLevel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeItem: {
    width: 80,
    padding: 10,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  badgeEmoji: { fontSize: 24 },
  badgeName: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 14 },
  interestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  interestText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  signOutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
