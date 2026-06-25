import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  correct: boolean;
  xpEarned: number;
  explanation?: string | null;
  correctAnswerText?: string | null;
  encouragement?: string | null;
  smartScore?: number | null;
  onNext: () => void;
  isLast?: boolean;
}

export function FeedbackPanel({
  correct,
  xpEarned,
  explanation,
  correctAnswerText,
  encouragement,
  smartScore,
  onNext,
  isLast = false,
}: Props) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const bgColor = correct ? "#dcfce7" : "#fee2e2";
  const accentColor = correct ? "#16a34a" : "#dc2626";
  const iconName: "checkmark-circle" | "close-circle" = correct
    ? "checkmark-circle"
    : "close-circle";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor: accentColor,
          borderRadius: colors.radius,
        },
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name={iconName} size={28} color={accentColor} />
        <Text style={[styles.label, { color: accentColor }]}>
          {correct ? "Correct!" : "Incorrect"}
        </Text>
        <View style={[styles.xpBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.xpText}>+{xpEarned} XP</Text>
        </View>
      </View>

      {!correct && correctAnswerText ? (
        <Text style={styles.correctAnswer}>
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>Correct: </Text>
          {correctAnswerText}
        </Text>
      ) : null}

      {explanation ? (
        <Text style={styles.explanation}>{explanation}</Text>
      ) : null}

      {encouragement ? (
        <Text style={[styles.encouragement, { color: accentColor }]}>{encouragement}</Text>
      ) : null}

      {smartScore != null ? (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>SmartScore</Text>
          <Text style={[styles.scoreValue, { color: accentColor }]}>
            {Math.round(smartScore)}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: accentColor, borderRadius: colors.radius }]}
        onPress={onNext}
        activeOpacity={0.85}
        testID="next-question-btn"
      >
        <Text style={styles.nextBtnText}>
          {isLast ? "Finish Session" : "Continue"}
        </Text>
        <Ionicons name={isLast ? "trophy" : "arrow-forward"} size={18} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  xpBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  xpText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  correctAnswer: {
    fontSize: 14,
    color: "#7f1d1d",
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  explanation: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  encouragement: {
    fontSize: 14,
    fontStyle: "italic",
    fontFamily: "Inter_500Medium",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontFamily: "Inter_500Medium",
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    marginTop: 4,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
