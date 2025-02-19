"use client";

import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface Character {
  name: string;
  gender: "man" | "woman";
  voice: {
    pitch: string;
    tempo: string;
    accent: string;
  };
  bio: string;
}

interface AudioPaneProps {
  audioData: {
    description?: string;
    audioData: number[];
  } | null;
  onWordChange: (wordIndex: number) => void;
  characters: Character[];
  onRegenerateAudio: () => void;
  onGenerateFullShow: () => void;
  script?: string[][];
  onScriptUpdate?: (script: string[][], timepoints: number[]) => void;
}

interface AudioPaneRef {
  jumpToTime: (time: number) => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const AudioPane = React.forwardRef<AudioPaneRef, AudioPaneProps>(
  (props, ref) => {
    const {
      audioData,
      onWordChange,
      onRegenerateAudio,
      onGenerateFullShow,
      script,
      show
    } = props;

    const characters = show.characters || [];

    const [description, setDescription] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSpeaker, setCurrentSpeaker] = useState("");
    const [currentTime, setCurrentTime] = useState(0);
    const [currentLine, setCurrentLine] = useState(0);
    const [scriptTimepoints, setScriptTimepoints] = useState<number[]>([]);

    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const audioContext = useRef<AudioContext | null>(null);

    React.useImperativeHandle(ref, () => ({
      jumpToTime: (time: number) => {
        if (wavesurfer.current) {
          wavesurfer.current.setTime(time);
          updateTimeAndPosition();
        }
      },
    }));

    const updateTimeAndPosition = () => {
      if (!wavesurfer.current) return;

      const currentTime = wavesurfer.current.getCurrentTime();
      setCurrentTime(currentTime);

      // Find current line based on timepoints
      const currentIndex = scriptTimepoints.findIndex(
        (time, index) =>
          time <= currentTime &&
          (index === scriptTimepoints.length - 1 ||
            scriptTimepoints[index + 1] > currentTime)
      );

      if (currentIndex !== -1) {
        setCurrentLine(currentIndex);
        if (characters.length > 0) {
          setCurrentSpeaker(characters[currentIndex % characters.length].name);
        }

        // Scroll the script pane to the current line
        requestAnimationFrame(() => {
          const scriptElement = document.querySelector(
            `[data-script-line="${currentIndex}"]`
          );
          if (scriptElement) {
            const container = scriptElement.closest(".overflow-auto");
            if (container) {
              const containerRect = container.getBoundingClientRect();
              const elementRect = scriptElement.getBoundingClientRect();

              if (
                elementRect.top < containerRect.top ||
                elementRect.bottom > containerRect.bottom
              ) {
                scriptElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }
          }
        });
      }

      const wordIndex = Math.floor(currentTime * 2); // Assume 2 words per second
      onWordChange(wordIndex);
    };

    useEffect(() => {
      if (!audioData || !waveformRef.current) return;

      setDescription(audioData.description || "");

      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }

      // Initialize WaveSurfer
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "violet",
        progressColor: "purple",
        cursorColor: "navy",
        barWidth: 3,
        barRadius: 3,
        cursorWidth: 1,
        height: 100,
        barGap: 3,
        interact: true,
      });

      // Add click handler
      const handleWaveformClick = (e: MouseEvent) => {
        if (!waveformRef.current || !wavesurfer.current) return;

        const rect = waveformRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const duration = wavesurfer.current.getDuration();
        const clickTime = (x / rect.width) * duration;
        wavesurfer.current.setTime(clickTime);
        updateTimeAndPosition();
      };

      waveformRef.current.addEventListener("click", handleWaveformClick);

      // Set up WaveSurfer events
      wavesurfer.current.on("audioprocess", updateTimeAndPosition);
      wavesurfer.current.on("seek", updateTimeAndPosition);
      wavesurfer.current.on("interaction", updateTimeAndPosition);
      wavesurfer.current.on("finish", () => setIsPlaying(false));

      // Create and process audio
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContext.current = ctx;

      const buffer = ctx.createBuffer(
        1,
        audioData.audioData.length,
        ctx.sampleRate
      );
      buffer.getChannelData(0).set(new Float32Array(audioData.audioData));

      const wavBuffer = bufferToWave(buffer, 0, buffer.length);
      const blob = new Blob([wavBuffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      wavesurfer.current.load(url);

      return () => {
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
        }
        if (audioContext.current) {
          audioContext.current.close();
        }
        waveformRef.current?.removeEventListener("click", handleWaveformClick);
        URL.revokeObjectURL(url);
      };
    }, [audioData, onWordChange]);

    const togglePlayPause = () => {
      if (!wavesurfer.current) return;

      try {
        if (isPlaying) {
          wavesurfer.current.pause();
        } else {
          wavesurfer.current.play();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error("Error during playback:", error);
        setIsPlaying(false);
      }
    };

    function bufferToWave(abuffer: AudioBuffer, offset: number, len: number) {
      const numOfChan = abuffer.numberOfChannels;
      const length = len * numOfChan * 2 + 44;
      const buffer = new ArrayBuffer(length);
      const view = new DataView(buffer);
      const channels = [];
      let pos = 0;

      // Write WAV header
      const writeUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
      };

      const writeUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
      };

      writeUint32(0x46464952); // "RIFF"
      writeUint32(length - 8); // file length - 8
      writeUint32(0x45564157); // "WAVE"
      writeUint32(0x20746d66); // "fmt " chunk
      writeUint32(16); // length = 16
      writeUint16(1); // PCM (uncompressed)
      writeUint16(numOfChan);
      writeUint32(abuffer.sampleRate);
      writeUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
      writeUint16(numOfChan * 2); // block-align
      writeUint16(16); // 16-bit
      writeUint32(0x61746164); // "data" - chunk
      writeUint32(len * numOfChan * 2); // chunk length

      // Write interleaved data
      for (let i = 0; i < abuffer.numberOfChannels; i++) {
        channels.push(abuffer.getChannelData(i));
      }

      for (let i = 0; i < len; i++) {
        for (let channel = 0; channel < numOfChan; channel++) {
          let sample = Math.max(-1, Math.min(1, channels[channel][i]));
          sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
          view.setInt16(44 + i * numOfChan * 2 + channel * 2, sample, true);
        }
      }

      return buffer;
    }

    return (
      <div className="w-1/2 p-4 border rounded-lg">
          <>
            <div>
              <h3 className="text-xl font-semibold mb-2">Waveform:</h3>
              <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
                <div ref={waveformRef} className="w-full h-32" />
                <div className="p-2 text-center text-sm text-gray-600">
                  {formatTime(currentTime)}
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <Button onClick={togglePlayPause}>
                  {isPlaying ? (
                    <Pause className="mr-2 h-4 w-4" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button onClick={onRegenerateAudio}>Regenerate Audio</Button>
              </div>
            </div>
          </>
      </div>
    );
  }
);

AudioPane.displayName = "AudioPane";

export default AudioPane;
