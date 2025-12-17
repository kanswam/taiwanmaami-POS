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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            setIsInView(true);
            setIsLoaded(true);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [isLoaded]);

  return (
    <video
      ref={videoRef}
      autoPlay={autoPlay && isInView}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      className={className}
      poster={poster}
      preload={isInView ? 'auto' : 'none'}
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
