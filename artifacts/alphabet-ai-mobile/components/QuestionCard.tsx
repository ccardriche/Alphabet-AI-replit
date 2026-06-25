import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Option {
  id: string;
  text: string;
}

interface Props {
  questionText: string;
  passage?: string | null;
  options: Option[];
  correctOptionId?: string;
  selectedOptionId?: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
}

export function QuestionCard({
  questionText,
  passage,
  options,
  correctOptionId,
  selectedOptionId,
  onSelect,
  disabled = false,
}: Props) {
  const colors = useColors();

  function handleSelect(optionId: string) {
    if (disabled || selectedOptionId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(optionId);
  }

  return (
    <View style={styles.container}>
      {passage ? (
        <View
          style={[
            styles.passage,
            { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Text style={[styles.passageText, { color: colors.foreground }]}>{passage}</Text>
        </View>
      ) : null}

      <Text style={[styles.question, { color: colors.foreground }]}>{questionText}</Text>

      <View style={styles.options}>
        {options.map((opt, idx) => {
          const isSelected = selectedOptionId === opt.id;
          const isCorrect = !!(correctOptionId && selectedOptionId && opt.id === correctOptionId);
          const isWrong = !!(isSelected && correctOptionId && opt.id !== correctOptionId);

          let bgColor = colors.card;
          let borderColor = colors.border;
          let textColor = colors.foreground;

          if (isCorrect) {
            bgColor = "#dcfce7";
            borderColor = "#16a34a";
            textColor = "#15803d";
          } else if (isWrong) {
            bgColor = "#fee2e2";
            borderColor = "#dc2626";
            textColor = "#b91c1c";
          } else if (isSelected) {
            bgColor = colors.primary + "18";
            borderColor = colors.primary;
            textColor = colors.primary;
          }

          const letterBg =
            isCorrect ? "#16a34a" : isWrong ? "#dc2626" : isSelected ? colors.primary : "transparent";
          const letterColor = isCorrect || isWrong || isSelected ? "#fff" : textColor;

          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.option,
                { backgroundColor: bgColor, borderColor, borderRadius: colors.radius },
              ]}
              onPress={() => handleSelect(opt.id)}
              disabled={disabled || !!selectedOptionId}
              activeOpacity={0.75}
              testID={`option-${opt.id}`}
            >
              <View style={styles.optionInner}>
                <View
                  style={[
                    styles.optionLetter,
                    { borderColor: borderColor, backgroundColor: letterBg },
                  ]}
                >
                  <Text style={[styles.optionLetterText, { color: letterColor }]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt.text}</Text>
                {isCorrect ? (
                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                ) : isWrong ? (
                  <Ionicons name="close-circle" size={20} color="#dc2626" />
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  passage: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 4,
    maxHeight: 160,
  },
  passageText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  question: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: "Inter_600SemiBold",
  },
  options: { gap: 10 },
  option: {
    borderWidth: 1.5,
    padding: 14,
  },
  optionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionLetterText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
});
