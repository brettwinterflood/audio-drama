"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ShowType {
  name: string
  events: {
    time: string
    speaker: string
    line: string
    effect: string
  }[]
  characters: Record<string, any> // Assuming characters are stored in an object format
}

interface ScriptPaneProps {
  show: ShowType
}

export default function ScriptPane({ show }: ScriptPaneProps) {
  const [currentLine, setCurrentLine] = useState(0)


  return (
    <div className="w-full h-[250px] mb-4 overflow-auto border rounded">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24 text-center">Time</TableHead>
            <TableHead className="w-32">Speaker</TableHead>
            <TableHead>Line</TableHead>
            <TableHead className="w-32">Effect/Emotion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {show?.events?.map((line, index) => (
            <TableRow
              key={index}
              className={`cursor-pointer hover:bg-gray-50 ${index === currentLine ? "bg-blue-100" : ""}`}
              onClick={() => setCurrentLine(index)}
            >
              <TableCell className="text-center font-mono text-sm text-gray-600">{line.time}</TableCell>
              <TableCell className="font-medium">{line.speaker}</TableCell>
              <TableCell className="whitespace-pre-wrap">{line.line}</TableCell>
              <TableCell className="text-sm text-gray-600 italic">{line.effect}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}