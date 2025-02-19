"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegenerateButtons from "./RegenerateButtons";
import { audioColors } from "../constants/colors";

interface WaveformPaneProps {
  showId: number;
  onTimeUpdate?: (time: number) => void;
  onSeek?: (seekFn: (time: number) => void) => void;
  allowRegeneration?: boolean;  // Add this prop
}

export default function WaveformPane({ showId, onTimeUpdate, onSeek, allowRegeneration = false }: WaveformPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfers = useRef<{ [key: string]: WaveSurfer }>({});
  const [volumes, setVolumes] = useState({ dialogue: 0.6, sfx: 1, music: 0.8 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const audioTypes = ["dialogue", "sfx", "music"];
  const fetchAudio = async (type: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/get-audio/${showId}?type=${type}`);
      if (!response.ok) {
        console.log(`No audio available for ${type}`);
        return false;
      }
      const blob = await response.blob();
      if (blob.size === 0) {
        console.log(`Empty audio file for ${type}`);
        return false;
      }
      setAudioUrls((prev) => ({ ...prev, [type]: URL.createObjectURL(blob) }));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  useEffect(() => {
    setLoading(true);
    setAvailableTypes([]);
    setAudioUrls({});

    const loadAudio = async () => {
      const newTypes = new Set<string>();
      const newUrls: { [key: string]: string } = {};

      for (const type of audioTypes) {
        const hasAudio = await fetchAudio(type);
        if (hasAudio) {
          newTypes.add(type);
        }
      }

      setAvailableTypes(Array.from(newTypes));
      setLoading(false);
    };

    loadAudio();

    return () => {
      Object.values(audioUrls).forEach(URL.revokeObjectURL);
    };
  }, [showId]);

  // Create seek function at component level
  const handleSeek = (time: number) => {
    Object.values(wavesurfers.current).forEach(w => {
      w.setTime(time);
    });
  };

  // Register seek function only once
  useEffect(() => {
    onSeek?.(handleSeek);
  }, [onSeek]);

  useEffect(() => {
    if (loading || !containerRef.current) return;

    containerRef.current.innerHTML = "";
    
    Object.entries(audioUrls).forEach(([type, url]) => {
      const div = document.createElement("div");
      div.style.marginBottom = "20px";
      containerRef.current?.appendChild(div);
      
      const { waveColor, progressColor } = audioColors[type as keyof typeof audioColors];

      wavesurfers.current[type] = WaveSurfer.create({
        container: div,
        waveColor,
        progressColor,
        height: 80,
        normalize: true,
      });
    
      wavesurfers.current[type].load(url);
      wavesurfers.current[type].setVolume(volumes[type as keyof typeof volumes]);

      // Add timeupdate listener
      wavesurfers.current[type].on('timeupdate', (currentTime) => {
        onTimeUpdate?.(currentTime);
      });
    });

    return () => {
      Object.values(wavesurfers.current).forEach((w) => w.destroy());
    };
  }, [audioUrls, loading, onTimeUpdate]);

  const togglePlayPause = () => {
    const playing = Object.values(wavesurfers.current).some((w) => w.isPlaying());
    Object.values(wavesurfers.current).forEach((w) => (playing ? w.pause() : w.play()));
    setIsPlaying(!playing);
  };

  const handleVolumeChange = (type: keyof typeof volumes, value: number) => {
    setVolumes((prev) => ({ ...prev, [type]: value }));
    wavesurfers.current[type]?.setVolume(value);
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      {loading ? (
        <div className="text-white">Loading audio...</div>
      ) : (
        <>
          <div ref={containerRef} className="mb-4" />
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={togglePlayPause}
              disabled={!allowRegeneration}
              className={`px-4 py-2 bg-blue-600 text-white rounded ${
                allowRegeneration ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <div className="flex gap-4">
              {availableTypes.map((type) => (
                <div key={type} className="flex flex-col items-center">
                  <label className="text-white mb-2 capitalize">{type}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volumes[type as keyof typeof volumes]}
                    onChange={(e) => handleVolumeChange(type as keyof typeof volumes, parseFloat(e.target.value))}
                    className="w-24"
                  />
                </div>
              ))}
            </div>
          </div>
          <RegenerateButtons 
            showId={showId} 
            onRegenerateComplete={fetchAudio} 
            disabled={!allowRegeneration}
          />
        </>
      )}
    </div>
  );
}