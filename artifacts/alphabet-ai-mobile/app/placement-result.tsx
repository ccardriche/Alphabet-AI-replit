import { Ionicons } from "@expo/vector-icons";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";

interface PlacementResult {
  sessionId: string;
  diagnosedGradeLevel: string;
  placementPathway: "foundation" | "developing" | "proficient" | "advanced";
  thetaFinal: number;
}

const PATHWAY_INFO = {
  foundation: {
    label: "Foundation",
    color: "#3b82f6",
    icon: "leaf-outline" as const,
    description: "We'll build core literacy skills with foundational reading and language practice.",
  },
  developing: {
    label: "Developing",
    color: "#f59e0b",
    icon: "fitness-outline" as const,
    description: "You're on your way! We'll strengthen key skills and fill any gaps.",
  },
  proficient: {
    label: "Proficient",
    color: "#8b5cf6",
    icon: "ribbon-outline" as const,
    description: "Great foundation! We'll challenge you with complex texts and analysis.",
  },
  advanced: {
    label: "Advanced",
    color: "#10b981",
    icon: "trophy-outline" as const,
    description: "Excellent! We'll push you with advanced ELA concepts and critical thinking.",
  },
};

export default function PlacementResultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [result, setResult] = useState<PlacementResult | null>(null);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    (async () => {
      try {
        const listRes = await fetch(`https://${DOMAIN}/api/students/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!listRes.ok) throw new Error();
        const profile = await listRes.json() as {
          diagnosedGradeLevel?: string;
          placementPathway?: string;
        };
        setResult({
          sessionId: "",
          diagnosedGradeLevel: profile.diagnosedGradeLevel ?? "Unknown",
          placementPathway: (profile.placementPathway as PlacementResult["placementPathway"]) ?? "developing",
          thetaFinal: 0,
        });
      } catch {
        setResult({
          sessionId: "",
          diagnosedGradeLevel: "Your Grade",
          placementPathway: "developing",
          thetaFinal: 0,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingScreen message="Calculating your results…" />;

  const pathway = result?.placementPathway ?? "developing";
  const info = PATHWAY_INFO[pathway];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPad + 16,
          paddingBottom: botPad + 24,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: info.color + "18" }]}>
          <Ionicons name={info.icon} size={48} color={info.color} />
        </View>

        <View style={styles.titleGroup}>
          <Text style={[styles.congrats, { color: colors.mutedForeground }]}>
            Assessment Complete!
          </Text>
          <Text style={[styles.grade, { color: colors.foreground }]}>
            {result?.diagnosedGradeLevel}
          </Text>
          <View
            style={[
              styles.pathwayBadge,
              { backgroundColor: info.color + "18", borderColor: info.color },
            ]}
          >
            <Text style={[styles.pathwayLabel, { color: info.color }]}>
              {info.label} Pathway
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.descCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.descText, { color: colors.foreground }]}>
            {info.description}
          </Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: "Reading Level", value: result?.diagnosedGradeLevel ?? "—" },
            { label: "Pathway", value: info.label },
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
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {s.label}
              </Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.cta,
          { backgroundColor: colors.primary, borderRadius: colors.radius },
        ]}
        onPress={() => router.replace("/(tabs)")}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>Start Learning</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  content: { gap: 24, alignItems: "center" },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  titleGroup: { alignItems: "center", gap: 8 },
  congrats: { fontSize: 15, fontFamily: "Inter_500Medium" },
  grade: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  pathwayBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  pathwayLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  descCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  descText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  statsRow: { flexDirection: "row", gap: 12, alignSelf: "stretch" },
  statCard: {
    padding: 16,
    borderWidth: 1,
    gap: 4,
    alignItems: "center",
  },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  ctaText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
});
