import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { script, fullShow } = await request.json()

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Generate random audio data (60 seconds of audio at 44.1kHz)
  const sampleRate = 44100
  const duration = fullShow ? 60 : 10 // 60 seconds for full show, 10 seconds for first 2 lines
  const audioData = new Float32Array(sampleRate * duration)
  for (let i = 0; i < audioData.length; i++) {
    audioData[i] = (Math.random() * 2 - 1) * 0.1 // Reduced amplitude for better visualization
  }

  return NextResponse.json({
    characters: script.map((line: string[]) => line[0]),
    description: fullShow
      ? "A 60-second audio drama based on the provided script."
      : "First 2 lines of the audio drama.",
    audioData: Array.from(audioData),
  })
}

