import { useEffect } from "react";
import { Volume2, VolumeX, Loader2, RotateCcw } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { cn } from "@/lib/utils";

interface TTSButtonProps {
  text: string;
  autoPlay?: boolean;
  showReplay?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export default function TTSButton({
  text,
  autoPlay = false,
  showReplay = false,
  size = "sm",
  className,
}: TTSButtonProps) {
  const { play, replay, isLoading, isPlaying } = useTTS(text);

  useEffect(() => {
    if (autoPlay && text.trim()) {
      play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const btnSize = size === "md" ? "w-8 h-8" : "w-7 h-7";

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={play}
        disabled={isLoading}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors",
          "bg-indigo-100 hover:bg-indigo-200 text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed",
          btnSize,
          className
        )}
      >
        {isLoading ? (
          <Loader2 className={cn(iconSize, "animate-spin")} />
        ) : isPlaying ? (
          <VolumeX className={iconSize} />
        ) : (
          <Volume2 className={iconSize} />
        )}
      </button>

      {showReplay && !isLoading && (
        <button
          type="button"
          onClick={replay}
          aria-label="Replay audio"
          className={cn(
            "inline-flex items-center justify-center rounded-full transition-colors",
            "bg-gray-100 hover:bg-gray-200 text-gray-600",
            btnSize
          )}
        >
          <RotateCcw className={iconSize} />
        </button>
      )}
    </span>
  );
}
