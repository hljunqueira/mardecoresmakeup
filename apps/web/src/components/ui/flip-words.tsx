import { useEffect, useState } from "react";

type FlipWordsProps = {
  words: string[];
  intervalMs?: number;
  className?: string;
};

export default function FlipWords({ words, intervalMs = 2200, className = "" }: FlipWordsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span key={index} className={`inline-block animate-fade-in ${className}`}>{words[index]}</span>
  );
}


