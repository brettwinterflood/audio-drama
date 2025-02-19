"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Show {
  id: number;
  original_script: string;
  parsed_script: string;
}

export default function Sidebar() {
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const response = await fetch("/api/shows");
        if (!response.ok) {
          throw new Error("Failed to fetch shows");
        }
        const data = await response.json();
        setShows(data);
      } catch (err) {
        setError("Failed to load shows");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShows();
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading shows...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <aside className="w-32 h-full bg-gray-100 p-4 overflow-y-auto">
      <Link href={`/`}>
        <h2 className="text-xl font-semibold mb-4">Shows</h2>
      </Link>
      {shows.length === 0 ? (
        <p>No shows found</p>
      ) : (
        <ul className="space-y-2">
          {shows.map((show) => (
            <li key={show.id}>
              <Link href={`/shows/${show.id}`}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left"
                >
                  Show {show.id}
                </Button>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/`}>
              <Button
                variant="ghost"
                className="w-full justify-start text-left"
              >
                Create New
              </Button>
            </Link>
          </li>
        </ul>
      )}
    </aside>
  );
}
