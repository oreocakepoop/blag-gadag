import React, { useState, useEffect, useRef } from "react";
import { Globe, BookOpen, Film, Radio, Cpu, Calendar, Settings2, Sparkles, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeaderProps {
  currentCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenCms: () => void;
  activeView: 'reader' | 'cms';
  urgentNews?: any[]; // Dynamic news streams loaded from database
}

const DEFAULT_NEWS_TAPE = [
  { text: "DECOUPLED HEADLESS CMS ONLINE • MULTI-ALIGNMENT DIPLOMACY ON THE RISE", color: "crimson", style: "pulsing" },
  { text: "SUEZ CANAL MARITIME TRANSITS RESTRICTED BY 23% • REGIONAL DEBATES SENSITIZED", color: "amber", style: "normal" },
  { text: "ALGORITHMIC REINFORCEMENT AUDIT DIRECTIVES IN DISCUSSION", color: "sapphire", style: "italic" },
  { text: "GREEN HYDROGEN AMMONIA CARRIERS LAUNCH FROM WESTERN AUSTRALIA", color: "emerald", style: "bold" },
  { text: "NEWSPAPER DESIGN LANGUAGE REVIVED • DIGITAL EDITION 1.0.3", color: "default", style: "normal" }
];

const CATEGORIES = ["All", "Foreign Policy", "Domestic Politics", "Economy", "Opinion", "Society & Tech", "Bookmarked ✧"];

export default function Header({ currentCategory, onSelectCategory, onOpenCms, activeView, urgentNews = [] }: HeaderProps) {
  const [tickerIndex, setTickerIndex] = useState(0);
  const [systime, setSystime] = useState("");
  
  // Dynamic font size visual controller state
  const [tickerSizeState, setTickerSizeState] = useState<'sm' | 'md' | 'lg'>(() => {
    try {
      const saved = localStorage.getItem("ticker_size_pref");
      return (saved as 'sm' | 'md' | 'lg') || 'md';
    } catch {
      return 'md';
    }
  });

  useEffect(() => {
    localStorage.setItem("ticker_size_pref", tickerSizeState);
  }, [tickerSizeState]);
  
  // Morse telegraph sound simulator system via Web Audio API 
  const [isMorsePlaying, setIsMorsePlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const startTelegraph = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(850, ctx.currentTime); // authentic high telegraph tone

      gain.gain.setValueAtTime(0, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscillatorRef.current = osc;
      gainRef.current = gain;

      // Telegraph loop generator
      const playChime = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") return;
        
        // Random telegraph dots/dashes
        const steps = [
          { duration: 80, emit: true },
          { duration: 60, emit: false },
          { duration: 200, emit: true },
          { duration: 60, emit: false },
          { duration: 85, emit: true },
          { duration: 180, emit: false },
        ];
        
        let accumulatedMs = 0;
        steps.forEach((step) => {
          const startSec = ctx.currentTime + accumulatedMs / 1000;
          const endSec = startSec + step.duration / 1000;
          // Very light audio, comfortable 0.03 level
          gain.gain.setValueAtTime(step.emit ? 0.03 : 0, startSec);
          gain.gain.setValueAtTime(0, endSec);
          accumulatedMs += step.duration;
        });

        timeoutRef.current = window.setTimeout(playChime, accumulatedMs + 150);
      };

      playChime();
      setIsMorsePlaying(true);
    } catch (e) {
      console.error("Web Audio Telegraph blocked or unsupported:", e);
    }
  };

  const stopTelegraph = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch (e) {}
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    setIsMorsePlaying(false);
  };

  const toggleTelegraph = () => {
    if (isMorsePlaying) {
      stopTelegraph();
    } else {
      startTelegraph();
    }
  };

  useEffect(() => {
    // Current UTC time ticking
    const updateTime = () => {
      const now = new Date();
      setSystime(now.toISOString().replace("T", " // ").slice(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeNewsList = urgentNews.length > 0 ? urgentNews : DEFAULT_NEWS_TAPE;

  useEffect(() => {
    if (activeNewsList.length === 0) return;
    const tickerInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % activeNewsList.length);
    }, 4500);
    return () => clearInterval(tickerInterval);
  }, [activeNewsList]);

  // Clean-up Audio operations on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (oscillatorRef.current) try { oscillatorRef.current.stop(); } catch (e) {}
      if (audioCtxRef.current) try { audioCtxRef.current.close(); } catch (e) {}
    };
  }, []);

  return (
    <header className="border-b-2 border-[#141414] mb-8 select-none bg-white">
      {/* Top Utility Line */}
      <div className="flex justify-between items-center bg-[#141414] text-white px-8 py-3.5 font-mono text-[10px] tracking-[0.2em] uppercase font-bold">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#9D3534] animate-pulse"></span>
          <span>LIVE ARCHIVE PORTALS ACTIVE // SSL CONNECTED</span>
        </div>
        <div className="hidden md:flex gap-4 items-center">
          <span className="opacity-70">BLOG-GADAG CENTRAL EDITION</span>
          <span className="opacity-40">|</span>
          <span className="text-[#9D3534] font-extrabold">{systime}</span>
        </div>
      </div>

      {/* Main Masthead Title */}
      <div className="py-7 text-center border-b-2 border-[#141414] relative overflow-hidden bg-[#F9F8F6]">
        <div className="absolute inset-0 bg-[radial-gradient(#141414_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.04]"></div>
        
        <p className="font-mono text-[10px] tracking-[0.25em] font-bold uppercase text-stone-500 mb-3">
          - RETRO BROADCASTS, LATEST INSIGHTS & ESSAYS -
        </p>
        
        <h1 className="font-serif text-5xl md:text-7xl font-black uppercase tracking-tight my-2 text-[#800000] hover:text-[#9D3534] transition-colors duration-300 inline-block px-4 italic cursor-pointer">
          Blog-Gadag
        </h1>

        <div className="flex justify-center items-center gap-4 mt-3">
          <span className="font-mono text-[10px] uppercase tracking-wider border border-[#141414]/30 px-2.5 py-0.5 bg-[#F9F8F6] text-[#2C5E5A] font-bold">
            VOL. I // NO. 01
          </span>
          <span className="h-px w-10 bg-[#141414]/30"></span>
          <span className="font-serif italic text-xs text-stone-600">
            Vintage Commentary & Curation
          </span>
          <span className="h-px w-10 bg-[#141414]/30"></span>
          <span className="font-mono text-[10px] uppercase tracking-wider border border-[#141414]/30 px-2.5 py-0.5 bg-[#F9F8F6] text-[#2C5E5A] font-bold">
            EST. 2026
          </span>
        </div>
      </div>

      {/* Ticker Tape */}
      <div className="bg-white border-b-2 border-[#141414] py-3 px-8 overflow-hidden flex items-center text-[11px] font-mono tracking-widest text-[#141414]">
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#9D3534] text-white text-[9px] px-2.5 py-1 font-bold shrink-0 border-2 border-[#141414] uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#141414]">
            <Radio size={11} className="text-white animate-pulse" /> Urgent News
          </div>
          
          {/* Telegraph audio stimulator tool */}
          <button
            onClick={toggleTelegraph}
            title={isMorsePlaying ? "Mute Radio Telegraph" : "Listen to dynamic Morse Chimes"}
            className={`p-1 border border-[#141414] transition-all cursor-pointer mr-2 flex items-center justify-center ${
              isMorsePlaying ? "bg-[#2C5E5A] text-white animate-pulse" : "bg-white hover:bg-[#F0EFED] text-[#141414]"
            }`}
          >
            {isMorsePlaying ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>
        </div>

        <div className="relative flex-1 h-5 overflow-hidden font-bold">
          <AnimatePresence mode="wait">
            {(() => {
              const currentAlert = activeNewsList[tickerIndex];
              if (!currentAlert) {
                return (
                  <motion.div
                    key="empty"
                    className="absolute inset-0 text-stone-400 text-[10px] uppercase font-mono tracking-widest"
                  >
                    ✧ STANDING BY FOR EDITORIAL DISPATCHES...
                  </motion.div>
                );
              }

              const alertText = typeof currentAlert === 'string' ? currentAlert : (currentAlert.text || "");
              const alertColor = typeof currentAlert === 'string' ? 'default' : (currentAlert.color || "default");
              const alertStyle = typeof currentAlert === 'string' ? 'normal' : (currentAlert.style || "normal");
              const alertSize = typeof currentAlert === 'string' ? undefined : currentAlert.fontSize;

              // Derive the active font size
              let finalFontSize = "11px";
              if (alertSize) {
                if (alertSize === 'sm') finalFontSize = "10px";
                else if (alertSize === 'md') finalFontSize = "12px";
                else if (alertSize === 'lg') finalFontSize = "15px";
                else if (!isNaN(Number(alertSize))) finalFontSize = `${alertSize}px`;
                else finalFontSize = alertSize;
              }

              let colorClass = "text-stone-850";
              if (alertColor === "crimson") colorClass = "text-[#9D3534]";
              else if (alertColor === "amber") colorClass = "text-[#b87614]";
              else if (alertColor === "emerald") colorClass = "text-[#2C5E5A]";
              else if (alertColor === "sapphire") colorClass = "text-[#2b5ba3]";

              let fontClass = "font-mono tracking-widest uppercase";
              if (alertStyle === "pulsing") {
                fontClass = "font-mono font-black animate-pulse uppercase tracking-[0.12em]";
              } else if (alertStyle === "italic") {
                fontClass = "font-serif italic tracking-wide normal-case first-letter:uppercase";
              } else if (alertStyle === "bold") {
                fontClass = "font-mono font-extrabold uppercase tracking-[0.15em] border-b border-dashed border-current";
              } else if (alertStyle === "doubleUnderline") {
                fontClass = "font-mono font-bold uppercase underline decoration-double decoration-[#9D3534]/70";
              } else if (alertStyle === "highlight") {
                fontClass = "bg-[#9D3534]/15 border border-[#9D3534]/25 px-2 py-0.5 text-[9px] font-mono font-black uppercase";
              }

              return (
                <motion.div
                  key={tickerIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className={`absolute inset-0 truncate pr-4 flex items-center ${colorClass} ${fontClass}`}
                  style={{ fontSize: finalFontSize }}
                >
                  ✧ {alertText}
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Line */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center p-0.5 gap-0 bg-white">
        {/* Category filters */}
        <div className="flex flex-wrap items-center">
          {CATEGORIES.map((cat) => {
            const isSelected = currentCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`text-[11px] uppercase tracking-[0.15em] font-mono py-4 px-6 border-b-2 md:border-b-0 md:border-r-2 border-[#141414] transition-all duration-150 font-bold relative cursor-pointer ${
                  isSelected
                    ? "bg-[#141414] text-white"
                    : "text-stone-700 hover:bg-stone-50 hover:text-[#9D3534]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
