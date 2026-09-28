"use client";

import { useEffect, useRef, useState } from "react";
import { saveLessonWatchProgress } from "@/lib/actions/courses";

interface LessonPlayerProps {
  lessonId: string;
  videoUrl: string;
  title: string;
  initialWatchedSeconds: number;
}

export default function LessonPlayer({
  lessonId,
  videoUrl,
  title,
  initialWatchedSeconds,
}: LessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const lastSavedTime = useRef(initialWatchedSeconds);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect if URL is a direct video file or an embed URL
  const isDirectVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(videoUrl);
  const isYouTube = /youtube\.com|youtu\.be/i.test(videoUrl);
  const isVimeo = /vimeo\.com/i.test(videoUrl);
  const isLoom = /loom\.com/i.test(videoUrl);

  useEffect(() => {
    if (!isDirectVideo || !videoRef.current) return;

    const video = videoRef.current;

    // Set initial position when video metadata is loaded
    const handleLoadedMetadata = () => {
      if (initialWatchedSeconds > 0 && video.duration > initialWatchedSeconds) {
        video.currentTime = initialWatchedSeconds;
      }
      setIsReady(true);
    };

    // Debounced save function
    const saveProgress = async (currentTime: number) => {
      // Only save if more than 1 second has passed since last save
      if (Math.abs(currentTime - lastSavedTime.current) < 1) {
        return;
      }

      try {
        await saveLessonWatchProgress(lessonId, currentTime);
        lastSavedTime.current = currentTime;
      } catch (error) {
        console.error("Failed to save watch progress:", error);
      }
    };

    // Save progress every 10 seconds while playing
    const handleTimeUpdate = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveProgress(video.currentTime);
      }, 10000); // Save every 10 seconds
    };

    // Save immediately on pause
    const handlePause = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveProgress(video.currentTime);
    };

    // Save on video end
    const handleEnded = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveProgress(video.duration);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [lessonId, initialWatchedSeconds, isDirectVideo]);

  // For direct video files, use HTML5 video player
  if (isDirectVideo) {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // For embed URLs (YouTube, Vimeo, Loom), use iframe
  // Note: Progress tracking requires additional API integration for these platforms
  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      {initialWatchedSeconds > 0 && !isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white text-sm">
          Resume from {Math.floor(initialWatchedSeconds / 60)}:
          {String(Math.floor(initialWatchedSeconds % 60)).padStart(2, "0")}
        </div>
      )}
      <iframe
        src={videoUrl}
        className="w-full h-full"
        allowFullScreen
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
