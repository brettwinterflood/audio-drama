"use client";

import { useState, useRef, useEffect } from "react";
import ScriptPane from "@/components/ScriptPane";
import WaveformPane from "@/components/WaveformPane";
import FileUploader from "@/components/FileUploader";

export default function Home() {
  const [audioUrls, setAudioUrls] = useState<{
    dialogue?: string;
    sfx?: string;
    music?: string;
  }>({});
  const [currentLine, setCurrentLine] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [script, setScript] = useState<string[][]>([]);
  const [scriptTimepoints, setScriptTimepoints] = useState<number[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  interface Character {
    name: string;
    voice: {
      pitch: string;
      tempo: string;
      accent: string;
    };
    bio: string;
  }

  const handleGenerate = async (scriptContent: string[][]) => {
    try {
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script: scriptContent }), // Send full script
      });

      if (!response.ok) {
        throw new Error("Failed to generate audio");
      }

      const data = await response.json();
      setAudioUrls({
        dialogue: `/api/audio/full_show_dialogue.mp3`,
        sfx: `/api/audio/full_show_sfx.mp3`,
        music: `/api/audio/full_music.mp3`,
      });
    } catch (error) {
      console.error("Error generating audio:", error);
      // TODO: Add proper error handling and user feedback
    }
  };

  const handleWordChange = (wordIndex: number) => {
    const lineIndex = Math.floor(wordIndex / 10); // Assume 10 words per line
    if (lineIndex !== currentLine) {
      setCurrentLine(lineIndex);
    }
  };

  const handleTimeClick = (time: number) => {
    audioPaneRef.current?.jumpToTime(time);
  };

  const handleScriptUpdate = async (
    newScript: string[][],
    timepoints: number[]
  ) => {
    setScript(newScript);
    setScriptTimepoints(timepoints);
  };

  // Update characters whenever script changes
  useEffect(() => {
    const loadCharacters = async () => {
      if (script.length === 0) return;

      try {
        const response = await fetch("/api/parse-script", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scriptText: script.map((line) => line[2]).join("\n"),
          }),
        });

        const { success, data } = await response.json();
        if (success && data.characters) {
          setCharacters(data.characters);
        }
      } catch (error) {
        console.error("Error fetching character information:", error);
      }
    };

    loadCharacters();
  }, [script]);

  const handleRegenerateAudio = () => {
    handleGenerate(script);
  };

  const handleGenerateFullShow = async () => {
    try {
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script, fullShow: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate full show");
      }

      const data = await response.json();
      setAudioUrls({
        dialogue: `/api/audio/full_show_dialogue.mp3`,
        sfx: `/api/audio/full_show_sfx.mp3`,
        music: `/api/audio/full_music.mp3`,
      });
    } catch (error) {
      console.error("Error generating full show:", error);
      // TODO: Add proper error handling and user feedback
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-12 bg-gray-800">
      <h1 className="text-4xl font-bold mb-8 text-white">
        Audio Drama Generator
      </h1>
      <div className="flex w-full max-w-[90rem] gap-6">
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">DOCX Uploader</h1>
        <FileUploader />
      </div>

        <div className="flex-1">
          <ScriptPane
            onGenerate={handleGenerate}
            currentLine={currentLine}
            currentTime={currentTime}
            onScriptUpdate={handleScriptUpdate}
            onTimeClick={handleTimeClick}
            onParse={handleRegenerateAudio}
          />
        </div>
        <div className="flex-1">
          {audioUrls.dialogue && audioUrls.sfx && audioUrls.music && (
            <WaveformPane
              dialogueUrl={audioUrls.dialogue}
              sfxUrl={audioUrls.sfx}
              musicUrl={audioUrls.music}
              // onTimeUpdate={handleTimeUpdate}
            />
          )}
        </div>
      </div>
    </main>
  );
}
