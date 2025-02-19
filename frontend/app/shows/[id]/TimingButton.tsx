'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"

interface TimingButtonProps {
  showId: string;
  disabled?: boolean;
  onComplete?: () => void;  // Add this prop
}

export default function TimingButton({ showId, disabled, onComplete }: TimingButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const analyzeTiming = async () => {
    setIsLoading(true)
    const url = `http://localhost:8000/analyze-timing/${showId}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze timing')
      }
      
      const data = await response.json()
      console.log('Timing analysis complete:', data)
      onComplete?.();  // Call the onComplete callback after successful timing analysis
    } catch (error) {
      console.error('Error analyzing timing:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={analyzeTiming}
      disabled={disabled || isLoading}
    >
      {isLoading ? 'Analyzing Timing...' : 'Analyze Timing'}
    </Button>
  )
}