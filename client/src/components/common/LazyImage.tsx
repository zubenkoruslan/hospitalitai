import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  PhotoIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number;
  rootMargin?: string;
  blurDataURL?: string;
  priority?: boolean;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = "",
  placeholder = "/images/menu-placeholder.jpg",
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = "50px",
  blurDataURL,
  priority = false,
}) => {
  const [imageSrc, setImageSrc] = useState(priority ? src : placeholder);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(priority);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imageRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          setImageSrc(src);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(imageRef);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [imageRef, src, threshold, rootMargin, priority]);

  // Handle successful image load
  const handleLoad = useCallback(() => {
    setHasLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image load error
  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Preload image when it becomes visible
  useEffect(() => {
    if (isIntersecting && src !== placeholder && !hasLoaded && !hasError) {
      const img = new Image();
      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = src;
    }
  }, [
    isIntersecting,
    src,
    placeholder,
    hasLoaded,
    hasError,
    handleLoad,
    handleError,
  ]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Main image */}
      <motion.img
        ref={setImageRef}
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-500 ${
          hasLoaded && isIntersecting
            ? "opacity-100 blur-0"
            : "opacity-60 blur-sm"
        }`}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{
          opacity: hasLoaded && isIntersecting ? 1 : 0.6,
          scale: hasLoaded && isIntersecting ? 1 : 1.1,
        }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? "eager" : "lazy"}
      />

      {/* Blur placeholder overlay */}
      {blurDataURL && !hasLoaded && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-md scale-110"
          style={{ backgroundImage: `url(${blurDataURL})` }}
        />
      )}

      {/* Loading state */}
      {!hasLoaded && !hasError && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: hasLoaded ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-center space-y-2">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <PhotoIcon className="h-8 w-8 text-gray-400" />
            </motion.div>

            {/* Loading progress indicator */}
            <div className="w-16 h-1 bg-gray-300 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Error state */}
      {hasError && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-center space-y-2 text-red-500">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
            >
              <ExclamationTriangleIcon className="h-6 w-6" />
            </motion.div>
            <span className="text-xs font-medium">Failed to load</span>

            {/* Retry button */}
            <motion.button
              className="text-xs text-red-600 hover:text-red-800 underline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setHasError(false);
                setHasLoaded(false);
                setImageSrc(src);
              }}
            >
              Retry
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Success indicator (brief flash) */}
      {hasLoaded && isIntersecting && (
        <motion.div
          className="absolute top-2 right-2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.5 }}
          />
        </motion.div>
      )}
    </div>
  );
};

export default LazyImage;
