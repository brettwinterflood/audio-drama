import FileUploader from "@/components/FileUploader"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Upload DOCX</h1>
      <FileUploader />
    </main>
  )
}

