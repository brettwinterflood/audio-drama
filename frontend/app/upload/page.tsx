'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.id) {
        router.push(`/shows/${data.id}`)
      } else {
        console.error('Upload failed:', data.error)
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Upload Script</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          name="file"
          accept=".docx"
          required
          className="mb-4 block"
        />
        <button 
          type="submit"
          disabled={uploading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  )
}
