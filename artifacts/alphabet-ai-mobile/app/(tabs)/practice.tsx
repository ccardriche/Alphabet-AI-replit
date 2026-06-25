import { Ionicons } from "@expo/vector-icons";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SmartScoreBar } from "@/components/SmartScoreBar";
import { useGetPracticeHistory, useGetMasterySummary } from "@workspace/api-client-react";
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

const DOMAIN_COLORS: Record<string, string> = {
  RL: "#3b82f6",
  RI: "#06b6d4",
  RF: "#8b5cf6",
  W: "#10b981",
  SL: "#f59e0b",
  L: "#f43f5e",
};

const DOMAIN_NAMES: Record<string, string> = {
  RL: "Reading Literature",
  RI: "Reading Informational",
  RF: "Reading Foundational",
  W: "Writing",
  SL: "Speaking & Listening",
  L: "Language",
};

export default function PracticeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    data: history,
    isLoading: histLoading,
    refetch,
    isRefetching,
  } = useGetPracticeHistory();

  const { data: mastery, isLoading: mastLoading } = useGetMasterySummary();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (histLoading || mastLoading) return <LoadingScreen />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 8, paddingBottom: botPad + 100 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Practice</Text>

      <TouchableOpacity
        style={[
          styles.startCard,
          { backgroundColor: colors.primary, borderRadius: colors.radius },
        ]}
        onPress={() => router.push("/practice-session")}
        activeOpacity={0.88}
        testID="start-practice-btn"
      >
        <View>
          <Text style={styles.startTitle}>Start Session</Text>
          <Text style={styles.startSub}>5 adaptive activities</Text>
        </View>
        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
      </TouchableOpacity>

      {(mastery?.domains?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Skill Mastery by Domain
          </Text>
          {(mastery?.domains ?? []).map((d, i) => (
            <View
              key={d.domain ?? i}
              style={[
                styles.masteryCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  marginBottom: 10,
                },
              ]}
            >
              <View style={styles.masteryHeader}>
                <View
                  style={[
                    styles.masteryDot,
                    { backgroundColor: DOMAIN_COLORS[d.domain ?? ""] ?? colors.primary },
                  ]}
                />
                <Text style={[styles.masteryDomain, { color: colors.foreground }]}>
                  {DOMAIN_NAMES[d.domain ?? ""] ?? d.domain}
                </Text>
                <Text style={[styles.masteryCount, { color: colors.mutedForeground }]}>
                  {d.totalSkills} skills
                </Text>
              </View>
              <SmartScoreBar
                score={d.avgSmartScore ?? 0}
                label="Average SmartScore"
                size="md"
              />
            </View>
          ))}
        </View>
      )}

      {(history?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent Sessions
          </Text>
          {(history ?? []).slice(0, 5).map((session, i) => (
            <View
              key={session.id ?? i}
              style={[
                styles.sessionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  marginBottom: 8,
                },
              ]}
            >
              <View
                style={[
                  styles.sessionIcon,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons name="book-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sessionDate, { color: colors.foreground }]}>
                  {session.createdAt
                    ? new Date(session.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Recent"}
                </Text>
                <Text style={[styles.sessionDetail, { color: colors.mutedForeground }]}>
                  {session.activitiesCompleted ?? 0} activities
                </Text>
              </View>
              {session.xpEarned != null && (
                <View style={[styles.xpPill, { backgroundColor: "#f59e0b18" }]}>
                  <Ionicons name="flash" size={12} color="#f59e0b" />
                  <Text style={styles.xpPillText}>+{session.xpEarned}</Text>
                </View>
              )}
              {session.status === "completed" ? (
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              ) : (
                <Ionicons name="ellipse-outline" size={18} color={colors.mutedForeground} />
              )}
            </View>
          ))}
        </View>
      )}

      {(history?.length ?? 0) === 0 && (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Ionicons name="book-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No sessions yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Start your first practice session above
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 20 },
  startCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    marginBottom: 28,
  },
  startTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  startSub: { fontSize: 14, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  masteryCard: { borderWidth: 1, padding: 16, gap: 12 },
  masteryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  masteryDot: { width: 10, height: 10, borderRadius: 5 },
  masteryDomain: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  masteryCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  sessionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sessionDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sessionDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  xpPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#f59e0b" },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 48,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: 12,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
