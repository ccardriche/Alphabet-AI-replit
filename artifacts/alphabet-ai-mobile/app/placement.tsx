import { Ionicons } from "@expo/vector-icons";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuestionCard } from "@/components/QuestionCard";
import { useAuth } from "@/contexts/AuthContext";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";

interface Option { id: string; text: string }
interface Question {
  id: string;
  questionText: string;
  passage?: string | null;
  options: Option[];
  skillCode: string;
}

export default function PlacementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean; explanation?: string | null; correctOptionId?: string | null
  } | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function startSession() {
    const res = await fetch(`https://${DOMAIN}/api/placement/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Failed to start placement");
    const data = await res.json() as { id: string };
    return data.id;
  }

  async function fetchNextQuestion(sid: string) {
    const res = await fetch(`https://${DOMAIN}/api/placement/${sid}/question`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204) return null;
    if (!res.ok) throw new Error("Failed to fetch question");
    return await res.json() as Question;
  }

  async function submitAnswer(sid: string, q: Question, optionId: string) {
    const res = await fetch(`https://${DOMAIN}/api/placement/${sid}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        questionId: q.id,
        selectedOptionId: optionId,
        skillCode: q.skillCode,
      }),
    });
    if (!res.ok) throw new Error("Failed to submit answer");
    return await res.json() as { correct: boolean; correctOptionId: string; complete: boolean; explanation?: string | null };
  }

  async function playTTS(text: string) {
    setTtsLoading(true);
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const res = await fetch(`https://${DOMAIN}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const data = await res.json() as { audioBase64: string };
      const { sound } = await Audio.Sound.createAsync({
        uri: `data:audio/mpeg;base64,${data.audioBase64}`,
      });
      soundRef.current = sound;
      await sound.playAsync();
    } catch {}
    setTtsLoading(false);
  }

  useEffect(() => {
    (async () => {
      try {
        const sid = await startSession();
        setSessionId(sid);
        const q = await fetchNextQuestion(sid);
        if (!q) {
          setIsComplete(true);
        } else {
          setQuestion(q);
          setQuestionCount(1);
        }
      } catch {
        Alert.alert("Error", "Could not start placement. Please try again.");
        router.back();
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  async function handleAnswer(optionId: string) {
    if (!sessionId || !question || submitting) return;
    setSelectedOption(optionId);
    setSubmitting(true);
    try {
      const result = await submitAnswer(sessionId, question, optionId);
      setFeedback({ correct: result.correct, explanation: result.explanation, correctOptionId: result.correctOptionId });
      if (result.complete) setIsComplete(true);
    } catch {
      Alert.alert("Error", "Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (!sessionId) return;
    setFeedback(null);
    setSelectedOption(null);
    if (isComplete) {
      router.replace("/placement-result");
      return;
    }
    setLoading(true);
    try {
      const q = await fetchNextQuestion(sessionId);
      if (!q) {
        setIsComplete(true);
        router.replace("/placement-result");
      } else {
        setQuestion(q);
        setQuestionCount((c) => c + 1);
      }
    } catch {
      Alert.alert("Error", "Could not load next question.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingScreen message="Loading your assessment…" />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="school-outline" size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              Placement
            </Text>
          </View>
          <Text style={[styles.counter, { color: colors.mutedForeground }]}>
            Question {questionCount}
          </Text>
        </View>
        {question && (
          <TouchableOpacity
            onPress={() => playTTS(question.questionText)}
            disabled={ttsLoading}
            style={[styles.ttsBtn, { backgroundColor: colors.secondary, borderRadius: 20 }]}
          >
            <Ionicons
              name={ttsLoading ? "hourglass-outline" : "volume-high-outline"}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {question && (
          <QuestionCard
            questionText={question.questionText}
            passage={question.passage}
            options={question.options}
            correctOptionId={selectedOption ? feedback?.correctOptionId ?? undefined : undefined}
            selectedOptionId={selectedOption}
            onSelect={handleAnswer}
            disabled={submitting || !!feedback}
          />
        )}

        {feedback && (
          <View style={{ marginTop: 20 }}>
            <FeedbackPanel
              correct={feedback.correct}
              xpEarned={0}
              explanation={feedback.explanation}
              onNext={handleNext}
              isLast={isComplete}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { gap: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  counter: { fontSize: 13, fontFamily: "Inter_500Medium" },
  ttsBtn: { padding: 10 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 8 },
});
