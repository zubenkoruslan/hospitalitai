import { useEffect, useRef, useCallback } from "react";

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private renderTimes: Map<string, number[]> = new Map();
  private slowOperationThreshold = 16; // 60fps = 16.67ms per frame

  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(label: string) {
    this.metrics.set(label, performance.now());
  }

  endTiming(label: string): number {
    const start = this.metrics.get(label);
    if (start === undefined) return 0;

    const duration = performance.now() - start;
    this.metrics.delete(label);

    // Store render times for analysis
    if (label.startsWith("render-") || label.startsWith("mount-")) {
      const componentName = label.split("-")[1];
      const times = this.renderTimes.get(componentName) || [];
      times.push(duration);
      // Keep only last 10 measurements
      if (times.length > 10) times.shift();
      this.renderTimes.set(componentName, times);
    }

    // Log slow operations in development
    if (
      process.env.NODE_ENV === "development" &&
      duration > this.slowOperationThreshold
    ) {
      console.warn(
        `🐌 Slow operation detected: ${label} took ${duration.toFixed(2)}ms`
      );
    }

    return duration;
  }

  measureRender<T>(component: string, fn: () => T): T {
    this.startTiming(`render-${component}`);
    const result = fn();
    this.endTiming(`render-${component}`);
    return result;
  }

  getAverageRenderTime(componentName: string): number {
    const times = this.renderTimes.get(componentName);
    if (!times || times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getPerformanceReport(): Record<
    string,
    { average: number; samples: number; isOptimal: boolean }
  > {
    const report: Record<
      string,
      { average: number; samples: number; isOptimal: boolean }
    > = {};

    this.renderTimes.forEach((times, componentName) => {
      const average = this.getAverageRenderTime(componentName);
      report[componentName] = {
        average,
        samples: times.length,
        isOptimal: average <= this.slowOperationThreshold,
      };
    });

    return report;
  }

  logPerformanceReport() {
    const report = this.getPerformanceReport();
    console.group("📊 Performance Report");

    Object.entries(report).forEach(([component, stats]) => {
      const status = stats.isOptimal ? "✅" : "⚠️";
      console.log(
        `${status} ${component}: ${stats.average.toFixed(2)}ms avg (${
          stats.samples
        } samples)`
      );
    });

    console.groupEnd();
  }

  clearMetrics() {
    this.metrics.clear();
    this.renderTimes.clear();
  }
}

// Hook for component performance measurement
export const usePerformanceMonitor = (componentName: string) => {
  const monitor = PerformanceMonitor.getInstance();
  const mountTimeRef = useRef<number>();
  const renderCountRef = useRef(0);

  // Track component mount time
  useEffect(() => {
    const mountStart = performance.now();
    mountTimeRef.current = mountStart;
    monitor.startTiming(`mount-${componentName}`);

    return () => {
      if (mountTimeRef.current) {
        const mountDuration = monitor.endTiming(`mount-${componentName}`);
        if (process.env.NODE_ENV === "development") {
          console.log(
            `🏗️ ${componentName} mounted in ${mountDuration.toFixed(2)}ms`
          );
        }
      }
    };
  }, [componentName, monitor]);

  // Track render performance
  const measureRender = useCallback(
    <T>(operation: () => T, operationName?: string): T => {
      renderCountRef.current += 1;
      return monitor.measureRender(componentName, operation);
    },
    [componentName, monitor]
  );

  // Get performance stats
  const getStats = useCallback(() => {
    return {
      averageRenderTime: monitor.getAverageRenderTime(componentName),
      renderCount: renderCountRef.current,
      isOptimal: monitor.getAverageRenderTime(componentName) <= 16,
    };
  }, [componentName, monitor]);

  return {
    measureRender,
    getStats,
    monitor,
  };
};

// Hook for measuring async operations
export const useAsyncPerformance = () => {
  const monitor = PerformanceMonitor.getInstance();

  const measureAsync = useCallback(
    async <T>(operation: () => Promise<T>, label: string): Promise<T> => {
      monitor.startTiming(label);
      try {
        const result = await operation();
        const duration = monitor.endTiming(label);

        if (process.env.NODE_ENV === "development") {
          console.log(`⏱️ ${label} completed in ${duration.toFixed(2)}ms`);
        }

        return result;
      } catch (error) {
        monitor.endTiming(label);
        throw error;
      }
    },
    [monitor]
  );

  return { measureAsync };
};

// Hook for measuring user interactions
export const useInteractionPerformance = () => {
  const monitor = PerformanceMonitor.getInstance();

  const measureInteraction = useCallback(
    <T>(
      interaction: () => T,
      interactionType: "click" | "hover" | "scroll" | "input" | "custom",
      elementId?: string
    ): T => {
      const label = `interaction-${interactionType}${
        elementId ? `-${elementId}` : ""
      }`;
      monitor.startTiming(label);

      const result = interaction();
      const duration = monitor.endTiming(label);

      // Log interactions that take too long
      if (duration > 100) {
        // 100ms threshold for interactions
        console.warn(
          `🐌 Slow ${interactionType} interaction: ${duration.toFixed(2)}ms`
        );
      }

      return result;
    },
    [monitor]
  );

  return { measureInteraction };
};

// Hook for observing memory usage
export const useMemoryMonitor = (componentName: string) => {
  const memoryRef = useRef<number>();

  useEffect(() => {
    // Check if performance.memory is available (Chrome/Edge)
    if ("memory" in performance) {
      const memoryInfo = (performance as any).memory;
      memoryRef.current = memoryInfo.usedJSHeapSize;

      if (process.env.NODE_ENV === "development") {
        console.log(
          `💾 ${componentName} mounted - Memory: ${(
            memoryInfo.usedJSHeapSize /
            1024 /
            1024
          ).toFixed(2)}MB`
        );
      }
    }

    return () => {
      if ("memory" in performance && memoryRef.current) {
        const memoryInfo = (performance as any).memory;
        const memoryDiff = memoryInfo.usedJSHeapSize - memoryRef.current;

        if (
          process.env.NODE_ENV === "development" &&
          Math.abs(memoryDiff) > 1024 * 1024
        ) {
          // 1MB threshold
          console.log(
            `💾 ${componentName} unmounted - Memory change: ${(
              memoryDiff /
              1024 /
              1024
            ).toFixed(2)}MB`
          );
        }
      }
    };
  }, [componentName]);
};

// Hook for FPS monitoring
export const useFPSMonitor = () => {
  const fpsRef = useRef<number[]>([]);
  const frameRef = useRef<number>();

  useEffect(() => {
    let lastTime = performance.now();

    const measureFPS = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      const fps = 1000 / delta;

      fpsRef.current.push(fps);

      // Keep only last 60 measurements (1 second at 60fps)
      if (fpsRef.current.length > 60) {
        fpsRef.current.shift();
      }

      lastTime = currentTime;
      frameRef.current = requestAnimationFrame(measureFPS);
    };

    frameRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const getAverageFPS = useCallback(() => {
    if (fpsRef.current.length === 0) return 0;
    return (
      fpsRef.current.reduce((sum, fps) => sum + fps, 0) / fpsRef.current.length
    );
  }, []);

  const isPerformanceGood = useCallback(() => {
    return getAverageFPS() >= 55; // Consider 55+ FPS as good performance
  }, [getAverageFPS]);

  return {
    getAverageFPS,
    isPerformanceGood,
    getCurrentFPS: () => fpsRef.current[fpsRef.current.length - 1] || 0,
  };
};

// Development only performance debugging
export const usePerformanceDebugger = (
  enabled: boolean = process.env.NODE_ENV === "development"
) => {
  const monitor = PerformanceMonitor.getInstance();

  useEffect(() => {
    if (!enabled) return;

    // Log performance report every 30 seconds
    const interval = setInterval(() => {
      monitor.logPerformanceReport();
    }, 30000);

    // Log performance report when the page is about to unload
    const handleUnload = () => {
      monitor.logPerformanceReport();
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [enabled, monitor]);

  // Keyboard shortcut to manually log performance (Ctrl+Shift+P)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === "P") {
        event.preventDefault();
        monitor.logPerformanceReport();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, monitor]);
};
