import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";

const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const INTERESTS = [
  "Sports", "Music", "Art", "Science", "Technology",
  "Animals", "Books", "Movies", "Gaming", "Cooking",
  "Travel", "Nature", "Fashion", "History", "Math",
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [grade, setGrade] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  function toggleInterest(item: string) {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  async function finish() {
    setLoading(true);
    try {
      const res = await fetch(`https://${DOMAIN}/api/students/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          grade,
          interests,
        }),
      });
      if (!res.ok) throw new Error("Failed to create profile");
      router.replace("/placement");
    } catch {
      Alert.alert("Error", "Could not save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    {
      title: "What's your name?",
      subtitle: "This is how you'll appear in the app.",
    },
    {
      title: "What grade are you in?",
      subtitle: "We'll customize your learning experience.",
    },
    {
      title: "What are your interests?",
      subtitle: "We'll use these to personalize your questions.",
    },
  ];

  const canProceed =
    step === 0
      ? displayName.trim().length >= 2
      : step === 1
      ? !!grade
      : interests.length >= 1;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPad },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.progress}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i <= step ? colors.primary : colors.border,
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>
          {steps[step].title}
        </Text>
        <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
          {steps[step].subtitle}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                borderRadius: colors.radius,
              },
            ]}
            placeholder="Your display name"
            placeholderTextColor={colors.mutedForeground}
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus
            maxLength={40}
            returnKeyType="next"
            onSubmitEditing={() => canProceed && setStep(1)}
          />
        )}

        {step === 1 && (
          <View style={styles.gradeGrid}>
            {GRADES.map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.gradeBtn,
                  {
                    backgroundColor:
                      grade === g ? colors.primary : colors.secondary,
                    borderColor:
                      grade === g ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                onPress={() => setGrade(g)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.gradeBtnText,
                    { color: grade === g ? "#fff" : colors.foreground },
                  ]}
                >
                  {g === "K" ? "Kinder" : `Grade ${g}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.interestGrid}>
            {INTERESTS.map((item) => {
              const sel = interests.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.interestChip,
                    {
                      backgroundColor: sel ? colors.primary : colors.secondary,
                      borderColor: sel ? colors.primary : colors.border,
                      borderRadius: 20,
                    },
                  ]}
                  onPress={() => toggleInterest(item)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.interestText,
                      { color: sel ? "#fff" : colors.foreground },
                    ]}
                  >
                    {item}
                  </Text>
                  {sel && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: botPad + 16, backgroundColor: colors.background },
        ]}
      >
        {step > 0 && (
          <TouchableOpacity
            style={[
              styles.backBtn,
              { borderColor: colors.border, borderRadius: colors.radius },
            ]}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            {
              backgroundColor: canProceed ? colors.primary : colors.muted,
              borderRadius: colors.radius,
              flex: 1,
            },
          ]}
          onPress={() => {
            if (!canProceed) return;
            if (step < 2) setStep(step + 1);
            else finish();
          }}
          disabled={!canProceed || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text
                style={[
                  styles.nextBtnText,
                  { color: canProceed ? "#fff" : colors.mutedForeground },
                ]}
              >
                {step < 2 ? "Continue" : "Start Learning"}
              </Text>
              <Ionicons
                name={step < 2 ? "arrow-forward" : "rocket"}
                size={18}
                color={canProceed ? "#fff" : colors.mutedForeground}
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 24, gap: 12 },
  progress: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
  stepTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  stepSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 28 },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    borderWidth: 1.5,
  },
  gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gradeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    minWidth: 90,
    alignItems: "center",
  },
  gradeBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  interestText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backBtn: {
    width: 52,
    height: 52,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
