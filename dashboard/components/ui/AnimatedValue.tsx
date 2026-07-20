"use client";

import { useEffect, useRef, useState } from "react";

interface Props { value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; }

export default function AnimatedValue({ value, decimals = 0, prefix = "", suffix = "", duration = 240 }: Props) {
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedMotionId = window.setTimeout(() => { previous.current = value; setDisplay(value); }, 0);
      return () => window.clearTimeout(reducedMotionId);
    }
    const startValue = previous.current;
    const start = performance.now();
    let frame = 0;
    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(startValue + (value - startValue) * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
      else previous.current = value;
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);
  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}
