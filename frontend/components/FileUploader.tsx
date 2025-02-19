'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a .docx file to upload.",
        variant: "destructive",
      })
      return
    }

    if (!file.name.endsWith('.docx')) {
      toast({
        title: "Invalid file type",
        description: "Please select a .docx file.",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Upload successful",
          description: "Your file has been uploaded and processed.",
        })
        setFile(null)
        
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Input
        type="file"
        accept=".docx"
        onChange={handleFileChange}
        className="max-w-xs"
      />
      <Button onClick={handleUpload} disabled={!file}>
        Upload DOCX
      </Button>
    </div>
  )
}
