import { useState, useCallback, useRef, useEffect } from "react";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `tts_${Math.abs(hash).toString(36)}`;
}

let _audioUnlocked = false;
export function setupIOSAudioUnlock() {
  if (_audioUnlocked) return;
  const unlock = () => {
    if (_audioUnlocked) return;
    _audioUnlocked = true;
    const silent = new Audio(
      "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjMyLjEwNAAAAAAAAAAAAAAA"
    );
    silent.play().catch(() => {});
  };
  document.addEventListener("touchstart", unlock, { once: true, passive: true });
  document.addEventListener("click", unlock, { once: true });
}

export function useTTS(text: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setupIOSAudioUnlock();
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const fetchAudioSrc = useCallback(async (): Promise<string | null> => {
    if (!text.trim()) return null;
    const cacheKey = simpleHash(text);

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      credentials: "include",
    });
    if (!res.ok) throw new Error(`TTS error ${res.status}`);

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const dataUrl = `data:audio/mpeg;base64,${btoa(binary)}`;

    try {
      sessionStorage.setItem(cacheKey, dataUrl);
    } catch {
      // sessionStorage full — skip caching
    }

    return dataUrl;
  }, [text]);

  const play = useCallback(async () => {
    if (isLoading) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current && !audioRef.current.ended && audioRef.current.paused && audioRef.current.readyState > 0) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        // stale audio — re-fetch below
      }
      return;
    }

    setIsLoading(true);
    try {
      const src = await fetchAudioSrc();
      if (!src) return;

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(src);
      audioRef.current = audio;

      audio.addEventListener("ended", () => setIsPlaying(false));
      audio.addEventListener("pause", () => setIsPlaying(false));
      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("error", () => { setIsPlaying(false); setIsLoading(false); });

      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("[TTS] play error", err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isPlaying, fetchAudioSrc]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const replay = useCallback(async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        await play();
      }
    } else {
      await play();
    }
  }, [play]);

  return { play, pause, replay, isLoading, isPlaying };
}
