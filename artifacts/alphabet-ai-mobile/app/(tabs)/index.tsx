import { Ionicons } from "@expo/vector-icons";
import { SmartScoreBar } from "@/components/SmartScoreBar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useGetStudentDashboard } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const DOMAIN_NAMES: Record<string, string> = {
  RL: "Reading Literature",
  RI: "Reading Info",
  RF: "Foundational",
  W: "Writing",
  SL: "Speaking & Listening",
  L: "Language",
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const {
    data: dashboard,
    isLoading,
    refetch,
    isRefetching,
  } = useGetStudentDashboard();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) return <LoadingScreen />;

  const profile = dashboard?.profile;
  const today = dashboard?.todayStats;
  const name = profile?.displayName ?? user?.firstName ?? "Learner";

  function getDomainColor(domain: string): string {
    const map: Record<string, string> = {
      RL: colors.domainRL,
      RI: colors.domainRI,
      RF: colors.domainRF,
      W: colors.domainW,
      SL: colors.domainSL,
      L: colors.domainL,
    };
    return map[domain] ?? colors.primary;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 8, paddingBottom: botPad + 100 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Good learning,</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{name} 👋</Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: colors.primary + "18" }]}>
          <Ionicons name="flame" size={18} color={colors.primary} />
          <Text style={[styles.streakNum, { color: colors.primary }]}>
            {dashboard?.streakDays ?? 0}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          {
            icon: "flash" as const,
            label: "Total XP",
            value: `${dashboard?.totalXp ?? 0}`,
            color: "#f59e0b",
          },
          {
            icon: "checkmark-circle" as const,
            label: "Today",
            value: `${today?.xpEarned ?? 0} XP`,
            color: "#10b981",
          },
          {
            icon: "book-outline" as const,
            label: "Sessions",
            value: `${dashboard?.completedSessionCount ?? 0}`,
            color: colors.primary,
          },
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
            <View style={[styles.statIcon, { backgroundColor: s.color + "18" }]}>
              <Ionicons name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.practiceCard,
          { backgroundColor: colors.primary, borderRadius: colors.radius },
        ]}
        onPress={() => router.push("/practice-session")}
        activeOpacity={0.88}
        testID="start-practice-btn"
      >
        <View style={styles.practiceLeft}>
          <Text style={styles.practiceTitle}>Daily Practice</Text>
          <Text style={styles.practiceSubtitle}>5 adaptive activities await</Text>
        </View>
        <View style={styles.practiceIcon}>
          <Ionicons name="play-circle" size={44} color="rgba(255,255,255,0.9)" />
        </View>
      </TouchableOpacity>

      {(dashboard?.domainProgress?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Domain Progress
          </Text>
          <View
            style={[
              styles.domainCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            {(dashboard?.domainProgress ?? []).slice(0, 6).map((dp, i) => (
              <View
                key={dp.domain ?? i}
                style={[
                  styles.domainRow,
                  i < (dashboard?.domainProgress?.length ?? 1) - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.domainDot,
                    { backgroundColor: getDomainColor(dp.domain ?? "") },
                  ]}
                />
                <Text style={[styles.domainName, { color: colors.foreground }]}>
                  {DOMAIN_NAMES[dp.domain ?? ""] ?? dp.domain}
                </Text>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <SmartScoreBar
                    score={dp.avgScore ?? 0}
                    size="sm"
                    showValue={false}
                  />
                </View>
                <Text style={[styles.domainScore, { color: colors.mutedForeground }]}>
                  {Math.round(dp.avgScore ?? 0)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {(dashboard?.nextSkills?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Up Next</Text>
          {(dashboard?.nextSkills ?? []).slice(0, 3).map((skill, i) => (
            <TouchableOpacity
              key={skill.skillCode ?? i}
              style={[
                styles.skillCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => router.push("/practice-session")}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.skillDomainBadge,
                  { backgroundColor: getDomainColor(skill.domain ?? "") + "18" },
                ]}
              >
                <Text
                  style={[
                    styles.skillDomainText,
                    { color: getDomainColor(skill.domain ?? "") },
                  ]}
                >
                  {skill.domain}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.skillName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {skill.skillName}
                </Text>
                <Text style={[styles.skillCode, { color: colors.mutedForeground }]}>
                  {skill.skillCode}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  practiceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginBottom: 24,
  },
  practiceLeft: { flex: 1 },
  practiceTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  practiceSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2 },
  practiceIcon: {},
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  domainCard: { borderWidth: 1, overflow: "hidden" },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  domainDot: { width: 10, height: 10, borderRadius: 5 },
  domainName: { fontSize: 13, fontFamily: "Inter_500Medium", width: 90 },
  domainScore: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 28, textAlign: "right" },
  skillCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  skillDomainBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  skillDomainText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  skillName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  skillCode: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
