import { useState, useRef, useEffect, memo } from 'react';
import { getLqipUrl, isCloudinaryUrl, getResponsiveSrcSet } from '@/lib/imageOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  width?: number;
  height?: number;
  /** If true, loads eagerly (above-the-fold). Default: lazy with IntersectionObserver */
  priority?: boolean;
  /** Fallback image on error */
  fallback?: string;
  /** Extra style */
  style?: React.CSSProperties;
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
}

/**
 * OptimizedImage — drop-in <img> replacement with:
 * 1. LQIP blur-up placeholder (313 bytes, loads instantly)
 * 2. IntersectionObserver-based lazy loading (200px ahead of viewport)
 * 3. Smooth fade-in transition when the full image loads
 * 4. Responsive srcSet for Cloudinary images
 */
function OptimizedImageInner({
  src,
  alt,
  className = '',
  sizes,
  priority = false,
  fallback = '/placeholder-drink.jpg',
  style,
  fetchPriority,
  onLoad,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority); // priority images are always "in view"
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lqip = getLqipUrl(src);
  const srcSet = isCloudinaryUrl(src) ? getResponsiveSrcSet(src) : undefined;

  // IntersectionObserver for lazy loading — triggers 200px before entering viewport
  useEffect(() => {
    if (priority || inView) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' } // start loading 200px before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, inView]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  const displaySrc = error ? fallback : src;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {/* LQIP blurred placeholder — shows instantly, fades out when full image loads */}
      {lqip && !loaded && (
        <img
          src={lqip}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter: 'blur(8px)' }}
        />
      )}

      {/* Solid color fallback when no LQIP available */}
      {!lqip && !loaded && (
        <div className="absolute inset-0 bg-secondary animate-pulse" />
      )}

      {/* Full resolution image — only starts loading when in view */}
      {inView && (
        <img
          src={displaySrc}
          srcSet={!error ? srcSet : undefined}
          sizes={sizes}
          alt={alt}
          decoding="async"
          fetchPriority={priority ? 'high' : (fetchPriority || 'low')}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}

export const OptimizedImage = memo(OptimizedImageInner);
export default OptimizedImage;
