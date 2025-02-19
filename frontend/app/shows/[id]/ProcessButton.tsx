"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface Provider {
  value: string;
  label: string;
  models: string[];
  defaultModel: string;
}

interface ProcessButtonProps {
  showId: string;
  onComplete?: () => void;
}

export default function ProcessButton({ showId, onComplete }: ProcessButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isDummy, setIsDummy] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("http://localhost:8000/llm-config");
        const data = await response.json();
        setProviders(data.providers);
        
        // Set default provider and model
        if (data.providers.length > 0) {
          const defaultProvider = data.providers[0];
          setSelectedProvider(defaultProvider.value);
          setSelectedModel(defaultProvider.defaultModel);
        }
      } catch (err) {
        setError("Failed to load providers");
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const processScript = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        ...(isDummy ? { dummy: "1" } : {}),
        provider: selectedProvider,
        model: selectedModel
      });
      
      const url = `http://localhost:8000/process/${showId}?${queryParams}`;
      
      const response = await fetch(url, {
        method: "POST",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process script');
      }
      
      const data = await response.json();
      console.log("Processed script:", data.processed_script);
      onComplete?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (configLoading) {
    return <div>Loading configuration...</div>;
  }

  const currentProvider = providers.find(p => p.value === selectedProvider);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        <Select
          value={selectedProvider}
          onValueChange={(value) => {
            setSelectedProvider(value);
            const provider = providers.find(p => p.value === value);
            setSelectedModel(provider?.defaultModel || "");
          }}
          disabled={loading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.value} value={provider.value}>
                {provider.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentProvider && (
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
            disabled={loading}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {currentProvider.models.map((model) => 
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}

        <Button onClick={processScript} disabled={loading || !selectedProvider || !selectedModel}>
          {loading ? "Processing..." : isDummy ? "Use Dummy JSON" : "Convert to JSON"}
        </Button>

        <div className="flex items-center space-x-2">
          <Switch
            id="dummy-mode"
            checked={isDummy}
            onCheckedChange={setIsDummy}
            disabled={loading}
          />
          <Label htmlFor="dummy-mode">Dummy Mode</Label>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}