import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function SmartScoreBar({
  score,
  label,
  size = "md",
  showValue = true,
}: Props) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(100, Math.max(0, score));

  useEffect(() => {
    Animated.spring(anim, {
      toValue: clamped / 100,
      useNativeDriver: false,
      tension: 60,
      friction: 8,
    }).start();
  }, [clamped]);

  const barH = size === "sm" ? 6 : size === "lg" ? 12 : 8;
  const valSize = size === "sm" ? 12 : size === "lg" ? 20 : 15;

  const barColor =
    clamped >= 80
      ? "#10b981"
      : clamped >= 60
      ? "#8b5cf6"
      : clamped >= 40
      ? "#f59e0b"
      : "#6b7a95";

  return (
    <View style={styles.container}>
      {(label || showValue) ? (
        <View style={styles.row}>
          {label ? (
            <Text
              style={[
                styles.label,
                { color: colors.mutedForeground, fontSize: valSize - 2 },
              ]}
            >
              {label}
            </Text>
          ) : null}
          {showValue ? (
            <Text style={[styles.value, { color: barColor, fontSize: valSize }]}>
              {Math.round(clamped)}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.track,
          { height: barH, borderRadius: barH, backgroundColor: colors.muted },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            { height: barH, borderRadius: barH, backgroundColor: barColor },
            {
              width: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontFamily: "Inter_500Medium" },
  value: { fontFamily: "Inter_700Bold" },
  track: { width: "100%", overflow: "hidden" },
  fill: {},
});
