import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

export function LazyVideo({
  src,
  poster,
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInView) {
            setIsInView(true);
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [isInView]);

  // Load and play video when it comes into view
  useEffect(() => {
    const video = videoRef.current;
    if (isInView && video) {
      video.load();
      if (autoPlay) {
        video.play().catch(() => {
          // Autoplay was prevented, which is fine
        });
      }
    }
  }, [isInView, autoPlay]);

  return (
    <video
      ref={videoRef}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      className={className}
      poster={poster}
      preload="none"
    >
      {isInView && <source src={src} type="video/mp4" />}
      {poster && (
        <img
          src={poster}
          alt="Video fallback"
          className="w-full h-full object-cover"
        />
      )}
    </video>
  );
}
