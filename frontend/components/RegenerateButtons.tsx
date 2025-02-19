"use client";

import { useState } from "react";
import { audioColors } from "../constants/colors";

interface RegenerateButtonsProps {
  showId: number;
  onRegenerateComplete?: (type: string) => void;
  disabled?: boolean;
}

export default function RegenerateButtons({ showId, onRegenerateComplete, disabled = false }: RegenerateButtonsProps) {
  const audioTypes = ["dialogue", "sfx", "music"];
  const [isRegenerating, setIsRegenerating] = useState<{ [key: string]: boolean }>({
    dialogue: false,
    sfx: false,
    music: false,
  });

  const regenerateAudio = async (type: string) => {
    setIsRegenerating((prev) => ({ ...prev, [type]: true }));
    try {
      const response = await fetch(`http://127.0.0.1:8000/generate-audio/${showId}?type=${type}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Failed to regenerate ${type} audio`);
      onRegenerateComplete?.(type);
    } catch (error) {
      console.error(error);
    }
    setIsRegenerating((prev) => ({ ...prev, [type]: false }));
  };

  return (
    <div className="flex gap-4">
      {audioTypes.map((type) => (
        <div key={type}>
          <button
            onClick={() => regenerateAudio(type)}
            disabled={disabled || isRegenerating[type]}
            style={{ 
              backgroundColor: audioColors[type as keyof typeof audioColors].waveColor,
              opacity: disabled || isRegenerating[type] ? 0.5 : 1
            }}
            className="px-3 py-1 text-sm text-white rounded hover:opacity-80 transition-opacity"
          >
            {isRegenerating[type] ? `Regenerating ${type}...` : `Regenerate ${type}`}
          </button>
        </div>
      ))}
    </div>
  );
}
