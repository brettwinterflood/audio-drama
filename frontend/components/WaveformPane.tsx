"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformPaneProps {
  dialogueUrl: string;
  sfxUrl: string;
  musicUrl: string;
  onTimeUpdate?: (time: number) => void;
}

export default function WaveformPane({
  dialogueUrl,
  sfxUrl,
  musicUrl,
  onTimeUpdate,
}: WaveformPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wavesurfers, setWavesurfers] = useState<{
    dialogue?: WaveSurfer;
    sfx?: WaveSurfer;
    music?: WaveSurfer;
  }>({});
  const [volumes, setVolumes] = useState({
    dialogue: 1,
    sfx: 1,
    music: 0.3,
  });
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create containers for each track
    const containers = {
      dialogue: document.createElement("div"),
      sfx: document.createElement("div"),
      music: document.createElement("div"),
    };

    Object.values(containers).forEach((container) => {
      container.style.marginBottom = "20px";
      containerRef.current?.appendChild(container);
    });

    // Initialize WaveSurfer instances
    const ws = {
      dialogue: WaveSurfer.create({
        container: containers.dialogue,
        waveColor: "#4a9eff",
        progressColor: "#2251ff",
        height: 80,
        normalize: true,
        backend: "WebAudio",
      }),
      sfx: WaveSurfer.create({
        container: containers.sfx,
        waveColor: "#ff4a4a",
        progressColor: "#ff2222",
        height: 80,
        normalize: true,
        backend: "WebAudio",
      }),
      music: WaveSurfer.create({
        container: containers.music,
        waveColor: "#4aff4a",
        progressColor: "#22ff22",
        height: 80,
        normalize: true,
        backend: "WebAudio",
      }),
    };

    // Load audio files
    ws.dialogue.load(dialogueUrl);
    ws.sfx.load(sfxUrl);
    ws.music.load(musicUrl);

    // Set initial volumes
    Object.entries(volumes).forEach(([key, value]) => {
      ws[key as keyof typeof ws]?.setVolume(value);
    });

    // Sync playback between tracks
    Object.values(ws).forEach((wavesurfer) => {
      wavesurfer.on("play", () => {
        Object.values(ws).forEach((w) => {
          if (w !== wavesurfer && !w.isPlaying()) {
            w.play();
          }
        });
        setIsPlaying(true);
      });

      wavesurfer.on("pause", () => {
        Object.values(ws).forEach((w) => {
          if (w !== wavesurfer && w.isPlaying()) {
            w.pause();
          }
        });
        setIsPlaying(false);
      });

      wavesurfer.on("seek", (progress) => {
        Object.values(ws).forEach((w) => {
          if (w !== wavesurfer) {
            w.seekTo(progress);
          }
        });
        if (onTimeUpdate) {
          onTimeUpdate(progress * wavesurfer.getDuration());
        }
      });
    });

    setWavesurfers(ws);

    return () => {
      Object.values(ws).forEach((wavesurfer) => wavesurfer.destroy());
    };
  }, [dialogueUrl, sfxUrl, musicUrl]);

  const handleVolumeChange = (track: keyof typeof volumes, value: number) => {
    setVolumes((prev) => ({ ...prev, [track]: value }));
    wavesurfers[track]?.setVolume(value);
  };

  const togglePlayPause = () => {
    Object.values(wavesurfers).forEach((wavesurfer) => {
      if (wavesurfer?.isPlaying()) {
        wavesurfer.pause();
      } else {
        wavesurfer?.play();
      }
    });
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <div ref={containerRef} className="mb-4">
        {/* Waveforms will be rendered here */}
      </div>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={togglePlayPause}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <div className="flex gap-4">
          {Object.entries(volumes).map(([track, volume]) => (
            <div key={track} className="flex flex-col items-center">
              <label className="text-white mb-2 capitalize">{track}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) =>
                  handleVolumeChange(
                    track as keyof typeof volumes,
                    parseFloat(e.target.value)
                  )
                }
                className="w-24"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
