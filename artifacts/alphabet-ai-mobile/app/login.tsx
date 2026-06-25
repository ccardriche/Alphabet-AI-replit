import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const REPL_ID = process.env.EXPO_PUBLIC_REPL_ID ?? "";
const OIDC_AUTH_URL = "https://replit.com/oidc/authorize";

function generateVerifier(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let v = "";
  for (let i = 0; i < 96; i++) {
    v += chars[Math.floor(Math.random() * chars.length)];
  }
  return v;
}

async function computeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateState(): string {
  return (
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2)
  );
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const verifier = generateVerifier();
      const challenge = await computeChallenge(verifier);
      const state = generateState();
      const nonce = generateState();

      const redirectUri = Linking.createURL("auth");

      const params = new URLSearchParams({
        client_id: REPL_ID,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: "openid profile email",
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
        nonce,
      });

      const authUrl = `${OIDC_AUTH_URL}?${params.toString()}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
        showInRecents: true,
      });

      if (result.type !== "success") {
        setLoading(false);
        return;
      }

      const parsed = new URL(result.url);
      const code = parsed.searchParams.get("code");
      const returnedState = parsed.searchParams.get("state");

      if (!code || returnedState !== state) {
        Alert.alert("Auth Error", "Invalid response from login provider.");
        setLoading(false);
        return;
      }

      const exchangeRes = await fetch(`https://${DOMAIN}/api/mobile-auth/token-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: verifier,
          redirect_uri: redirectUri,
          state,
          nonce,
        }),
      });

      if (!exchangeRes.ok) {
        const err = await exchangeRes.json().catch(() => ({})) as { error?: string };
        Alert.alert("Login Failed", err.error ?? "Could not complete login. Please try again.");
        setLoading(false);
        return;
      }

      const { token } = await exchangeRes.json() as { token: string };
      await signIn(token);
      router.replace("/");
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPad + 24,
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.hero}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
          <Text style={styles.iconText}>A</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Alphabet AI</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Adaptive ELA learning,{"\n"}personalized for you
        </Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: "trending-up" as const, text: "Adaptive placement that finds your level" },
          { icon: "book-outline" as const, text: "Daily practice tailored to your skills" },
          { icon: "volume-high-outline" as const, text: "Read-aloud support powered by AI" },
          { icon: "trophy-outline" as const, text: "Track your progress with SmartScore" },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name={f.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[
            styles.loginBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
          testID="login-btn"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.loginBtnText}>Continue with Replit</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.terms, { color: colors.mutedForeground }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  hero: {
    alignItems: "center",
    gap: 16,
    paddingTop: 24,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  features: {
    gap: 16,
    paddingVertical: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  bottom: {
    gap: 14,
    paddingBottom: 8,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  terms: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
