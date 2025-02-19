"use client"

import { useState, useEffect, useRef } from "react";
import { notFound } from "next/navigation";
import { getShowById } from "@/lib/db";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import ScriptPane from "@/components/ScriptPane";
import AudioPane from "@/components/AudioPane";
import ProcessButton from "./ProcessButton"; 
import TimingButton from "./TimingButton";
import WaveformPane2 from "@/components/WaveformPane2";
import TimingPane from "@/components/TimingPane";
import CharacterAvatars from "@/components/CharacterAvatars";

export default function Viewshow({ params }: { params: { id: string } }) {
  const [currentTime, setCurrentTime] = useState(0);
  const seekToRef = useRef<((time: number) => void) | null>(null);
  const [show, setShow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShow = async () => {
      try {
        const response = await fetch(`/api/shows/${params.id}`);
        if (!response.ok) {
          notFound();
        }
        const data = await response.json();
        setShow(data);
      } catch (error) {
        console.error('Failed to fetch show:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShow();
  }, [params.id]);

  const refreshShow = async () => {
    try {
      const response = await fetch(`/api/shows/${params.id}`);
      if (!response.ok) {
        notFound();
      }
      const data = await response.json();
      setShow(data);
    } catch (error) {
      console.error('Failed to fetch show:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!show) {
    notFound();
  }

  let audioUrls = {
    dialogue: `/api/audio/full_show_dialogue.mp3`,
    sfx: `/api/audio/full_show_sfx.mp3`,
    music: `/api/audio/full_music.mp3`,
  };

  const parsedData = show.parsed_script && JSON.parse(show.parsed_script);
  const eventTiming = show.event_timing && JSON.parse(show.event_timing);
  const events = parsedData?.events || [];

  console.log("parsedData", parsedData.characters);

  const getCurrentSpeaker = (time: number) => {
    if (!eventTiming?.dialogue_timing) return "";
    const currentLine = eventTiming.dialogue_timing.find(
      (timing) => time >= timing.start_time && time <= timing.end_time
    );
    return currentLine?.character || "";
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Show {params.id}:  {show.name}</h1>

      <div className="grid grid-cols-2 gap-4">
        {/* Left Column - All Script Content */}
        <div className="space-y-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="original-script">
              <AccordionTrigger>Original Script txt</AccordionTrigger>
              <AccordionContent>
                <pre className="whitespace-pre-wrap">{show.original_script}</pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {events.length > 0 && !eventTiming?.dialogue_timing && <> 
            <h2 className="text-lg font-bold mb-2">Parsed Script</h2>
          <ScriptPane show={parsedData} /> </>}
          {eventTiming?.dialogue_timing && (
            <>      
              <h2 className="text-lg font-bold mb-2">Timing</h2>
              <TimingPane 
                dialogueTiming={eventTiming.dialogue_timing}
                currentTime={currentTime}
                onSeek={(time) => seekToRef.current?.(time)}
              />
            </>
          )}

          <div className="space-y-2">
            <p>Convert txt to formatted json</p>
            <ProcessButton showId={params.id} onComplete={refreshShow} />
            <p>Analyze timing</p>
            <TimingButton 
              showId={params.id} 
              disabled={events.length === 0} 
              onComplete={refreshShow}
            />
          </div>
        </div>

        <div>
        {events.length > 0 &&
        <CharacterAvatars 
                characters={parsedData.characters || []}
                currentSpeaker={getCurrentSpeaker(currentTime)}
              />}

          {events.length > 0 &&
            audioUrls.dialogue &&
            audioUrls.sfx &&
            audioUrls.music && (
              <WaveformPane2
                showId={Number(params.id)}
                onTimeUpdate={setCurrentTime}
                onSeek={(fn) => {
                  seekToRef.current = fn;
                }}
                allowRegeneration={!!eventTiming?.dialogue_timing}
              />
            )}

        </div>
      </div>
    </div>
  );
}
