import { Ionicons } from "@expo/vector-icons";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuestionCard } from "@/components/QuestionCard";
import { SmartScoreBar } from "@/components/SmartScoreBar";
import { useAuth } from "@/contexts/AuthContext";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
interface Activity {
  activityNumber: number;
  question: Question;
  skillCode: string;
  skillName: string;
  domain?: string;
}
interface ActivityResult {
  correct: boolean;
  correctOptionId?: string | null;
  xpEarned: number;
  explanation?: string | null;
  correctAnswerText?: string | null;
  encouragement?: string | null;
  masteryUpdated?: { smartScore?: number | null } | null;
}

export default function PracticeSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActivityResult | null>(null);
  const [isSessionDone, setIsSessionDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const apiHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  async function startSession() {
    const res = await fetch(`https://${DOMAIN}/api/practice/session`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Failed to start session");
    const data = await res.json() as { id: string };
    return data.id;
  }

  async function fetchNextActivity(sid: string): Promise<Activity | null> {
    const res = await fetch(`https://${DOMAIN}/api/practice/session/${sid}/activity`, {
      headers: apiHeaders(),
    });
    if (res.status === 204) return null;
    if (!res.ok) throw new Error("Failed to fetch activity");
    return await res.json() as Activity;
  }

  async function submitAnswer(
    sid: string,
    act: Activity,
    optionId: string
  ): Promise<ActivityResult> {
    const res = await fetch(`https://${DOMAIN}/api/practice/session/${sid}/submit`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({
        questionId: act.question.id,
        selectedOptionId: optionId,
        skillCode: act.skillCode,
      }),
    });
    if (!res.ok) throw new Error("Failed to submit answer");
    return await res.json() as ActivityResult;
  }

  async function completeSession(sid: string) {
    await fetch(`https://${DOMAIN}/api/practice/session/${sid}/complete`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({}),
    }).catch(() => {});
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
        headers: apiHeaders(),
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
        const act = await fetchNextActivity(sid);
        if (!act) {
          setIsSessionDone(true);
        } else {
          setActivity(act);
        }
      } catch {
        Alert.alert("Error", "Could not start practice session. Please try again.");
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
    if (!sessionId || !activity || submitting) return;
    setSelectedOption(optionId);
    setSubmitting(true);
    try {
      const result = await submitAnswer(sessionId, activity, optionId);
      setFeedback(result);
      setTotalXp((x) => x + (result.xpEarned ?? 0));
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
    setLoading(true);
    try {
      const act = await fetchNextActivity(sessionId);
      if (!act) {
        await completeSession(sessionId);
        setIsSessionDone(true);
        setLoading(false);
        return;
      }
      setActivity(act);
    } catch {
      Alert.alert("Error", "Could not load next activity.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingScreen message="Loading your practice…" />;

  if (isSessionDone) {
    return (
      <View
        style={[
          styles.doneContainer,
          { backgroundColor: colors.background, paddingTop: topPad + 24 },
        ]}
      >
        <View style={[styles.doneIcon, { backgroundColor: colors.primary + "18" }]}>
          <Ionicons name="trophy" size={52} color={colors.primary} />
        </View>
        <Text style={[styles.doneTitle, { color: colors.foreground }]}>
          Session Complete!
        </Text>
        <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
          You earned <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{totalXp} XP</Text> this session. Keep it up!
        </Text>
        <TouchableOpacity
          style={[
            styles.doneBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          <Ionicons name="home" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {activity && (
            <>
              <Text style={[styles.skillName, { color: colors.foreground }]}>
                {activity.skillName}
              </Text>
              <Text style={[styles.activityNum, { color: colors.mutedForeground }]}>
                Activity {activity.activityNumber}
              </Text>
            </>
          )}
        </View>

        {activity && (
          <TouchableOpacity
            onPress={() => playTTS(activity.question.questionText)}
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

      {totalXp > 0 && (
        <View style={[styles.xpBar, { backgroundColor: colors.secondary }]}>
          <Ionicons name="flash" size={14} color={colors.primary} />
          <Text style={[styles.xpText, { color: colors.primary }]}>
            +{totalXp} XP earned this session
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activity && (
          <QuestionCard
            questionText={activity.question.questionText}
            passage={activity.question.passage}
            options={activity.question.options}
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
              xpEarned={feedback.xpEarned}
              explanation={feedback.explanation}
              correctAnswerText={feedback.correctAnswerText}
              encouragement={feedback.encouragement}
              smartScore={feedback.masteryUpdated?.smartScore}
              onNext={handleNext}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  closeBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  skillName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  activityNum: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ttsBtn: { padding: 10 },
  xpBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  xpText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 8 },
  doneContainer: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 20,
  },
  doneIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  doneTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  doneSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 12,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
