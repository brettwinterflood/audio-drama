"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DialogueTiming {
  character: string
  line: string
  emotion: string
  duration: number
  start_time: number
  end_time: number
  file: string
}

interface TimingPaneProps {
  dialogueTiming: DialogueTiming[]
  currentTime: number
  onSeek?: (time: number) => void
}

export default function TimingPane({ dialogueTiming, currentTime, onSeek }: TimingPaneProps) {
  const [selectedLine, setSelectedLine] = useState<number>(-1)

  useEffect(() => {
    const currentLineIndex = dialogueTiming.findIndex(
      (timing) => currentTime >= timing.start_time && currentTime <= timing.end_time
    );
    
    console.log('Current time update:', {
      currentTime,
      foundIndex: currentLineIndex,
      lineInfo: currentLineIndex !== -1 ? dialogueTiming[currentLineIndex] : null
    });

    if (currentLineIndex !== -1 && currentLineIndex !== selectedLine) {
      setSelectedLine(currentLineIndex);
      // Scroll the row into view
      const row = document.querySelector(`[data-row-index="${currentLineIndex}"]`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentTime, dialogueTiming])

  const handleRowClick = async (index: number) => {
    console.log('Row clicked:', {
      index,
      timing: dialogueTiming[index]
    });
    
    setSelectedLine(index);
    if (onSeek && dialogueTiming[index]) {
      const seekTime = dialogueTiming[index].start_time;
      if (isFinite(seekTime) && seekTime >= 0) {
        try {
          console.log('Seeking to time:', seekTime);
          onSeek(seekTime);
        } catch (error) {
          console.error('Error during seek:', error);
        }
      }
    }
  };

  return (
    <div className="w-full h-[250px] mb-4 overflow-auto border rounded">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Character</TableHead>
            <TableHead>Line</TableHead>
            <TableHead className="w-32">Emotion</TableHead>
            <TableHead className="w-24 text-center">Start</TableHead>
            <TableHead className="w-24 text-center">Duration</TableHead>
            <TableHead className="w-24 text-center">End</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dialogueTiming.map((timing, index) => (
            <TableRow
              key={index}
              data-row-index={index}
              className={`cursor-pointer hover:bg-gray-50 ${
                index === selectedLine ? "bg-blue-100" : ""
              }`}
              onClick={() => handleRowClick(index)}
            >
              <TableCell className="font-medium">{timing.character}</TableCell>
              <TableCell className="whitespace-pre-wrap">{timing.line}</TableCell>
              <TableCell className="text-sm text-gray-600 italic">{timing.emotion}</TableCell>
              <TableCell className="text-center font-mono text-sm text-gray-600">{timing.start_time.toFixed(2)}s</TableCell>
              <TableCell className="text-center font-mono text-sm text-gray-600">{timing.duration.toFixed(2)}s</TableCell>
              <TableCell className="text-center font-mono text-sm text-gray-600">{timing.end_time.toFixed(2)}s</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}