import React, { useState, useEffect, useRef } from "react";
import { Post } from "../types";
import { 
  ArrowLeft, 
  Youtube, 
  Clock, 
  Calendar, 
  User, 
  CheckSquare, 
  Volume2, 
  Play, 
  Pause, 
  Square, 
  Bookmark, 
  BookmarkCheck, 
  Settings2, 
  X,
  Award,
  BookOpen,
  Compass,
  CornerDownRight
} from "lucide-react";
import { parseEditorialTags } from "../utils/editorialParser";
import { motion, AnimatePresence } from "motion/react";

interface PostDetailProps {
  post: Post;
  onBack: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (postId: string) => void;
}

// Client-side extraction tool to guarantee YouTube link plays correctly
function extractYoutubeId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.length === 11 && !trimmed.includes("/") && !trimmed.includes("?")) {
    return trimmed;
  }
  try {
    const urlString = trimmed.startsWith("http") ? trimmed : "https://" + trimmed;
    const url = new URL(urlString);
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      const v = url.searchParams.get("v");
      if (v) return v;
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] || "";
      }
      if (url.hostname.includes("youtu.be")) {
        return url.pathname.slice(1);
      }
    }
  } catch (err) {
    // URL parsing fallback
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }
  return trimmed;
}

const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  "Foreign Policy": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=85&w=1600",
  "Domestic Politics": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&q=85&w=1600",
  "Economy": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=85&w=1600",
  "Opinion": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=85&w=1600",
  "Society & Tech": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=85&w=1600",
};

export default function PostDetail({ post, onBack, isBookmarked, onToggleBookmark }: PostDetailProps) {
  // --- 1. Custom Reader Settings state ---
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [textAlignment, setTextAlignment] = useState<'left' | 'justify'>('left');
  const [paperTheme, setPaperTheme] = useState<'classic' | 'newsprint' | 'charcoal'>('newsprint');
  const isDark = paperTheme === 'charcoal';
  const [scrollPercent, setScrollPercent] = useState(0);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // --- 2. Client-side Text-To-Speech (TTS) Voice Engine ---
  const [ttsState, setTtsState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [ttsVolume, setTtsVolume] = useState(0.8);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // --- 3. Stamped Reactions Room (Toggleable Approval Fix) ---
  const getInitialReactions = () => {
    const seed = parseInt(post.id.slice(-3)) || 42;
    return {
      cerebral: (seed % 15) + 3,
      verified: ((seed * 3) % 20) + 5,
      dissenting: ((seed * 7) % 12) + 1,
      historical: ((seed + 12) % 18) + 4
    };
  };

  const [reactions, setReactions] = useState<{ [key: string]: number }>(() => {
    const cached = localStorage.getItem(`reactions_${post.id}`);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return getInitialReactions();
  });

  const [hasReacted, setHasReacted] = useState<{ [key: string]: boolean }>(() => {
    const cached = localStorage.getItem(`reacted_${post.id}`);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(`reactions_${post.id}`, JSON.stringify(reactions));
  }, [reactions, post.id]);

  useEffect(() => {
    localStorage.setItem(`reacted_${post.id}`, JSON.stringify(hasReacted));
  }, [hasReacted, post.id]);

  // Fix the stamp reactor toggle so clicking a reacted stamp removes the rating
  const handleReact = (type: string) => {
    const currentlyReacted = hasReacted[type];
    setReactions(prev => ({
      ...prev,
      [type]: currentlyReacted ? Math.max(0, prev[type] - 1) : prev[type] + 1
    }));
    setHasReacted(prev => ({
      ...prev,
      [type]: !currentlyReacted
    }));
  };

  // --- 4. Speech Synthesis Setup ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleStartTts = () => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    // Clean formatting patterns before speaking
    const plainContent = post.content
      .replace(/###/g, "")
      .replace(/>/g, "")
      .replace(/\*/g, "")
      .replace(/-/g, "");

    const narrationText = `${post.title}. Written by ${post.author}. ${plainContent}`;
    const utterance = new SpeechSynthesisUtterance(narrationText);
    
    utterance.volume = ttsVolume;
    utterance.rate = 1.0;
    
    utterance.onend = () => {
      setTtsState('idle');
    };
    utterance.onerror = () => {
      setTtsState('idle');
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setTtsState('playing');
  };

  const handlePauseTts = () => {
    if (!synthRef.current) return;
    if (ttsState === 'playing') {
      synthRef.current.pause();
      setTtsState('paused');
    } else if (ttsState === 'paused') {
      synthRef.current.resume();
      setTtsState('playing');
    }
  };

  const handleStopTts = () => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setTtsState('idle');
  };

  // --- 5. Scroll Estimator Top Progress Bar ---
  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      if (scrollHeight <= 0) {
        setScrollPercent(0);
        return;
      }
      const winScroll = doc.scrollTop || window.pageYOffset;
      const percent = (winScroll / scrollHeight) * 100;
      setScrollPercent(Math.min(percent, 100));
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- 6. Styling Class Builders ---
  const getThemeClasses = () => {
    switch (paperTheme) {
      case 'classic': return "bg-white text-[#141414] border-[#141414]";
      case 'newsprint': return "bg-[#FAF7F2] text-[#16120D] border-[#3D3325]";
      case 'charcoal': return "bg-[#1E1D1B] text-[#ECE7DE] border-[#4D4841]";
    }
  };

  const getParagraphClasses = (isShort: boolean) => {
    let classes = "";
    
    if (fontSize === 'sm') classes += " text-base md:text-lg leading-relaxed mb-6 ";
    else if (fontSize === 'md') classes += " text-lg md:text-xl leading-loose mb-8 ";
    else classes += " text-xl md:text-2xl leading-loose mb-10 ";

    if (fontFamily === 'serif') classes += " font-serif ";
    else if (fontFamily === 'sans') classes += " font-sans ";
    else classes += " font-mono ";

    if (textAlignment === 'justify') classes += " text-justify ";
    else classes += " text-left ";

    if (isShort) {
      classes += " border-l-4 border-current pl-4 italic opacity-80 py-1 font-serif ";
    }

    return classes;
  };

  // Parse YouTube Companion Link safely
  const parsedYoutubeId = post.youtubeId ? extractYoutubeId(post.youtubeId) : null;

  // Render text smart design, including inline images
  const renderSmartContent = () => {
    if (!post.content) return null;

    const rawBlocks = post.content.split("\n\n").map(p => p.trim()).filter(Boolean);
    const imagesList = post.imageUrls || [];

    // Image 0 is reserved for the cover image at the top. Inline images start from 1.
    // If there is only 1 image, it remains at the cover and doesn't repeat.
    let imageCounter = imagesList.length > 1 ? 1 : 999;
    let isFirstParagraph = true;

    return rawBlocks.map((block, idx) => {
      let isHeader = false;
      let element: React.ReactNode = null;

      // Subheaders support
      if (block.startsWith("### ")) {
        isHeader = true;
        element = (
          <h4 key={`header-${idx}`} className="font-serif text-xl md:text-2xl font-black mt-8 mb-4 border-b-2 border-current pb-2 tracking-tight">
            {block.replace("### ", "")}
          </h4>
        );
      }
      // Blockquotes
      else if (block.startsWith("> ")) {
        element = (
          <blockquote 
            key={`quote-${idx}`} 
            className="border-l-4 border-current pl-5 py-3 my-6 font-serif italic text-base md:text-lg bg-black/5 pr-4 relative rounded-none"
          >
            <span className="absolute -top-3 left-2 text-4xl opacity-20 select-none font-serif">“</span>
            {block.replace("> ", "").replace(/"/g, "")}
          </blockquote>
        );
      }
      // Lists formatted properly with solid round bullets and bold labels
      else if (block.startsWith("* ") || block.startsWith("- ") || block.startsWith("1. ") || block.includes("\n* ") || block.includes("\n- ")) {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        element = (
          <ul key={`list-${idx}`} className="space-y-3.5 my-5 font-sans leading-relaxed text-sm md:text-base text-current">
            {lines.map((line, lineIdx) => {
              const cleanedLine = line.replace(/^(\*|-|\d+\.)\s+/, "").trim();
              const boldMatch = cleanedLine.match(/^\*\*(.*?)\*\*(.*)/);
              if (boldMatch) {
                return (
                  <li key={lineIdx} className="relative pl-6">
                    <span className="absolute left-1.5 top-1.5 w-1.5 h-1.5 bg-current rounded-full"></span>
                    <strong className="font-extrabold text-current">{boldMatch[1]}</strong>
                    {boldMatch[2]}
                  </li>
                );
              }
              return (
                <li key={lineIdx} className="relative pl-6">
                  <span className="absolute left-1.5 top-1.5 w-1.5 h-1.5 bg-current rounded-full"></span>
                  {cleanedLine}
                </li>
              );
            })}
          </ul>
        );
      }
      // Normal Paragraph Blocks
      else {
        // Smart paragraph grouping to auto-design density based on length
        const isShortParagraph = block.length < 80;
        const hasCustomTag = block.startsWith("[") && block.includes("]");

        if (isFirstParagraph && !isShortParagraph && !hasCustomTag) {
          isFirstParagraph = false;
          const letter = block.charAt(0);
          const remainder = block.slice(1);
          element = (
            <div key={`p-${idx}`} className={getParagraphClasses(false)}>
              {imagesList.length > 0 && (
                <div className="float-right ml-4 sm:ml-6 mb-4 w-full sm:w-[260px] md:w-[320px] shrink-0 border-2 border-current p-1.5 bg-current/5 select-none font-mono">
                  <img 
                    src={imagesList[0]} 
                    alt={post.title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-cover max-h-[220px] transition-all duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).parentElement!.style.display = "none";
                    }}
                  />
                  <div className="text-[9px] uppercase font-bold text-current/60 mt-1.5 text-center leading-tight">
                     ✦ FIG 1. Lead Illustration
                  </div>
                </div>
              )}
              <span className="float-left text-5xl md:text-6xl font-black mr-2.5 mt-1 px-3 pb-1 border-2 border-current bg-black/5 leading-none font-serif select-none">
                {letter}
              </span>
              {parseEditorialTags(remainder)}
            </div>
          );
        } else {
          if (hasCustomTag) {
            isFirstParagraph = false;
          }
          element = (
            <div key={`p-${idx}`} className={getParagraphClasses(isShortParagraph)}>
              {parseEditorialTags(block)}
            </div>
          );
        }
      }

      // We inject an inline image precisely between paragraphs to create a premium magazine aesthetic
      const shouldAppendImage = !isHeader && (idx > 0) && (idx % 2 === 0) && (imageCounter < imagesList.length);
      
      if (shouldAppendImage) {
        const activeImageUrl = imagesList[imageCounter];
        imageCounter++;
        return (
          <React.Fragment key={`group-${idx}`}>
            {element}
            <div className="my-8 border-t border-b border-dashed border-current/30 py-6 flex flex-col md:flex-row gap-6 items-center">
              <div className="w-full md:w-1/2 shrink-0 overflow-hidden border border-current bg-current/5 p-1.5 shadow-[4px_4px_0px_0px_rgba(20,20,20,0.15)]">
                <img
                  src={activeImageUrl}
                  alt="Editorial Illustration Component"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover max-h-[250px] transition-all duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="md:w-1/2 font-mono text-[10px] uppercase font-bold tracking-tight leading-relaxed text-current/70">
                <div className="text-current text-[11px] font-black border-b border-current/20 pb-1 mb-2">✦ Fig {imageCounter}. Dispatch Proof</div>
                This photographic verification correlates with arguments noted within the paragraph above. Images are rendered in high resolution and vivid true color.
              </div>
            </div>
          </React.Fragment>
        );
      }

      return element;
    });
  };

  return (
    <div className="relative">
      {/* 1. Sticky Scroll Indicator Top Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-[#F0EFED] z-50">
        <div 
          className="h-full bg-[#9D3534] transition-all duration-100" 
          style={{ width: `${scrollPercent}%` }}
        ></div>
      </div>

      {/* 2. COMPANION BROADCAST CINEMA STAGE (Entirely OUTSIDE the essay card) */}
      {parsedYoutubeId && (
        <div className="w-full mb-8 bg-[#141414] text-white p-5 border-2 border-[#141414] shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#9D3534]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex justify-between items-center border-b border-white/20 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#E94E41] flex items-center gap-1.5">
                <Youtube size={14} className="text-red-500" /> Active Video Companion
              </span>
            </div>
            <div className="font-mono text-[9px] text-stone-400 bg-white/5 border border-white/10 px-2.5 py-0.5 uppercase tracking-wide">
              Studio Port // {parsedYoutubeId}
            </div>
          </div>

          <div className="relative aspect-video w-full max-w-4xl mx-auto bg-black border-2 border-white/15 overflow-hidden shadow-lg">
            <iframe
              id={`yt-player-outside-${post.id}`}
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${parsedYoutubeId}?modestbranding=1&rel=0`}
              title={`${post.title} Companion Broadcast Frame`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
            ></iframe>
          </div>

          <div className="mt-3 text-center">
            <p className="font-serif italic text-stone-300 text-xs text-center px-4 leading-normal">
              - Broadcast Commentary relating to "{post.title}" -
            </p>
          </div>
        </div>
      )}

      {/* 3. PRIMARY ESSAY CARD CONTAINER */}
      <motion.article
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={`w-full border-2 p-6 md:p-10 mb-12 rounded-none transition-all duration-300 ${getThemeClasses()}`}
      >
        {/* Header Block Actions & Clean Toggle Trigger Menu Icon */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b-2 border-current">
          <button
            onClick={onBack}
            className="font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 py-2.5 px-4 border-2 border-current bg-black/5 hover:bg-black/10 transition-all rounded-none cursor-pointer"
          >
            <ArrowLeft size={12} className="stroke-[2.5]" />
            <span>Return to Front Page</span>
          </button>

          {/* Bookmarks, and Dial Panel Toggle Trigger */}
          <div className="flex items-center gap-2 font-mono">
            {/* Toggle dial icon drawer (Clean panel solution) */}
            <button
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className={`px-3 py-2 border-2 border-current text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                showSettingsDropdown 
                  ? "bg-[#2C5E5A] text-white" 
                  : "bg-black/5 hover:bg-[#F0EFED] text-current"
              }`}
            >
              <Settings2 size={13} className="stroke-[2]" />
              <span>Reader Options Dial</span>
            </button>

            <button
              onClick={() => onToggleBookmark(post.id)}
              className={`px-3 py-2 border-2 border-current text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                isBookmarked 
                  ? "bg-[#9D3534] text-white" 
                  : "bg-black/5 hover:bg-black/10 text-current"
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck size={12} />
                  <span>Pinned in Pocket</span>
                </>
              ) : (
                <>
                  <Bookmark size={12} />
                  <span>Pocket Bookmark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. ANIMATED POP-UP DRAMATIC TYPOGRAPHIC DIAL SETTINGS VIEW */}
        <AnimatePresence>
          {showSettingsDropdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className={`border-2 border-current p-5 mb-8 overflow-hidden rounded-none ${
                isDark ? "bg-[#252422] text-[#ECE7DE]" : "bg-[#F3EFE9] text-[#141414]"
              }`}
            >
              <div className="flex justify-between items-center border-b border-current/20 pb-2 mb-4 font-mono text-xs">
                <span className="font-extrabold uppercase tracking-widest text-[#9D3534]">✦ Configure Reader Layout</span>
                <button 
                  onClick={() => setShowSettingsDropdown(false)}
                  className="p-1 hover:bg-current/10 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono text-xs">
                {/* Dial 1: Font Face Selector */}
                <div className="space-y-1.5">
                  <span className="font-black text-[10px] uppercase opacity-70 block">Typography Group</span>
                  <div className={`flex border border-current rounded-none overflow-hidden ${isDark ? 'bg-stone-900 border-current' : 'bg-white'}`}>
                    <button 
                      onClick={() => setFontFamily('serif')} 
                      className={`flex-1 py-1 px-1 text-[10px] font-serif border-r border-current transition-colors cursor-pointer ${
                        fontFamily === 'serif' 
                          ? 'bg-[#E2533E] text-white font-black hover:bg-[#c9412e]' 
                          : 'hover:bg-current/10 text-current bg-transparent'
                      }`}
                    >
                      Serif
                    </button>
                    <button 
                      onClick={() => setFontFamily('sans')} 
                      className={`flex-1 py-1 px-1 text-[10px] font-sans border-r border-current transition-colors cursor-pointer ${
                        fontFamily === 'sans' 
                          ? 'bg-[#E2533E] text-white font-black hover:bg-[#c9412e]' 
                          : 'hover:bg-current/10 text-current bg-transparent'
                      }`}
                    >
                      Sans
                    </button>
                    <button 
                      onClick={() => setFontFamily('mono')} 
                      className={`flex-1 py-1 px-1 text-[10px] font-mono transition-colors cursor-pointer ${
                        fontFamily === 'mono' 
                          ? 'bg-[#E2533E] text-white font-black hover:bg-[#c9412e]' 
                          : 'hover:bg-current/10 text-current bg-transparent'
                      }`}
                    >
                      Mono
                    </button>
                  </div>
                </div>

                {/* Dial 3: Alignment Selector */}
                <div className="space-y-1.5">
                  <span className="font-black text-[10px] uppercase opacity-70 block">Margins & Grid</span>
                  <div className={`flex border border-current rounded-none overflow-hidden ${isDark ? 'bg-stone-900 border-current' : 'bg-white'}`}>
                    <button 
                      onClick={() => setTextAlignment('left')} 
                      className={`flex-1 py-1 text-[10px] border-r border-current transition-colors cursor-pointer ${
                        textAlignment === 'left' 
                          ? 'bg-[#E2533E] text-white font-bold' 
                          : 'hover:bg-current/10 text-current bg-transparent'
                      }`}
                    >
                      Left
                    </button>
                    <button 
                      onClick={() => setTextAlignment('justify')} 
                      className={`flex-1 py-1 text-[10px] transition-colors cursor-pointer ${
                        textAlignment === 'justify' 
                          ? 'bg-[#E2533E] text-white font-bold' 
                          : 'hover:bg-current/10 text-current bg-transparent'
                      }`}
                    >
                      Block
                    </button>
                  </div>
                </div>

                {/* Dial 4: Parchment Color Theme */}
                <div className="space-y-1.5">
                  <span className="font-black text-[10px] uppercase opacity-70 block">Newsprint Tone</span>
                  <div className={`flex border border-current rounded-none overflow-hidden ${isDark ? 'bg-stone-900 border-current' : 'bg-white'}`}>
                    <button 
                      onClick={() => setPaperTheme('classic')} 
                      className={`flex-1 py-1.5 text-[9px] font-bold border-r border-current uppercase ${
                        paperTheme === 'classic' 
                          ? 'bg-[#2C5E5A] text-white' 
                          : 'hover:bg-current/10 text-current bg-transparent'
                      }`}
                    >
                      Paper
                    </button>
                    <button 
                      onClick={() => setPaperTheme('newsprint')} 
                      className={`flex-1 py-1.5 text-[9px] font-bold border-r border-current uppercase ${
                        paperTheme === 'newsprint' 
                          ? 'bg-[#2C5E5A] text-white' 
                          : 'hover:bg-current/10 text-current bg-transparent'
                      }`}
                    >
                      Vintage
                    </button>
                    <button 
                      onClick={() => setPaperTheme('charcoal')} 
                      className={`flex-1 py-1.5 text-[9px] font-bold uppercase ${
                        paperTheme === 'charcoal' 
                          ? 'bg-[#2C5E5A] text-white' 
                          : 'hover:bg-current/10 text-current bg-transparent'
                      }`}
                    >
                      Ink
                    </button>
                  </div>
                </div>
              </div>

              {/* Broadcaster TTS Player inside the expandable settings to declutter the reader */}
              <div className="mt-5 border-t border-current/25 pt-4 flex flex-col md:flex-row gap-4 items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <Volume2 size={14} className="animate-pulse text-[#9D3534]" />
                  <span className="font-bold uppercase text-[10px] tracking-wider">Telegraph Broadcaster Switch:</span>
                </div>

                <div className="flex items-center gap-2 font-bold">
                  {ttsState === 'idle' ? (
                    <button
                      onClick={handleStartTts}
                      className={`px-4 py-1.5 border border-current font-bold text-[10px] uppercase transition-all tracking-wider cursor-pointer rounded-none flex items-center gap-1 ${
                        isDark 
                          ? "bg-white text-stone-900 hover:bg-[#ECE7DE]" 
                          : "bg-[#141414] text-white hover:bg-[#9A302F]"
                      }`}
                    >
                      <Play size={10} className="fill-white" /> Speak Essay
                    </button>
                  ) : (
                    <div className={`flex gap-1.5 p-1 border border-current ${isDark ? "bg-[#1E1D1B]" : "bg-white"}`}>
                      <button
                        onClick={handlePauseTts}
                        className={`px-2 py-1 text-[10px] uppercase transition-all cursor-pointer ${
                          isDark ? "bg-stone-850 text-white hover:bg-stone-750" : "bg-stone-100 hover:bg-stone-200 text-stone-900"
                        }`}
                      >
                        {ttsState === 'paused' ? 'Resume' : 'Sleep'}
                      </button>
                      <button
                        onClick={handleStopTts}
                        className="px-2 py-1 bg-red-650 hover:bg-red-700 text-white text-[10px] uppercase transition-all cursor-pointer"
                      >
                        Turn Off
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pl-3 border-l border-current/30">
                    <span className="text-[9px] uppercase opacity-60">Vol</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={ttsVolume}
                      onChange={(e) => setTtsVolume(Number(e.target.value))}
                      className="w-16 h-1 scale-y-75 cursor-pointer accent-[#9D3534]"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. VINTAGE NEWS TITLE HEADER DECK */}
        <div className="border-b-2 border-current pb-6 mb-8 text-current">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="bg-[#9D3534] text-white px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.15em] font-bold select-none border border-current">
              {post.category}
            </span>
            <span className="h-px w-5 bg-current opacity-45"></span>
            <span className="font-mono text-[10px] uppercase font-bold opacity-70 flex items-center gap-1">
              <Calendar size={12} /> Published: {post.date}
            </span>
          </div>

          <h2 
            className="font-serif font-extrabold tracking-tight leading-none mb-5 text-current"
            style={{ fontSize: (post as any).titleFontSize ? `${(post as any).titleFontSize}px` : undefined }}
          >
            {post.title}
          </h2>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/5 border-2 border-current p-4 font-mono text-[10px] uppercase font-bold text-current">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-[#9D3534]" />
                <span>Written by {post.author}</span>
              </span>
              <span className="opacity-40">//</span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                <span>{post.readTime} Minute read index</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="opacity-60 font-medium">Serial Brief:</span>
              <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                isDark ? "bg-[#ECE7DE] text-[#1E1D1B]" : "bg-[#141414] text-white"
              }`}>
                GAZETTE-P{post.id}
              </span>
            </div>
          </div>
        </div>

        {/* Smart Cover Image removed and inline floated above */}

        {/* 6. PRIMARY ESSAY CONTENT GRID */}
        <div className="text-current">
          {renderSmartContent()}
        </div>

        {/* 7. READER STAMP REACTOR (Now supporting seamless retracting/unclicking) */}
        <div className="border-t-2 border-current mt-12 pt-6">
          <h4 className="font-mono text-[11px] font-black uppercase tracking-wider text-current mb-4">
            🗳️ Reader Stamp Reactor Room
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/5 p-4 border-2 border-current rounded-none">
            {/* Reaction Type 1: Cerebral */}
            <button
              onClick={() => handleReact('cerebral')}
              className={`p-3 border-2 border-current flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group select-none ${
                hasReacted['cerebral'] 
                  ? "bg-[#2C5E5A] text-white shadow-none" 
                  : "bg-white hover:bg-stone-50 text-[#141414] shadow-sm active:translate-y-[1px]"
              }`}
            >
              <Award size={15} className="mb-1" />
              <span className="font-mono text-[9px] font-black uppercase tracking-wider">Cerebral</span>
              <span className="font-mono text-xs font-bold mt-1 bg-black/10 px-1.5 rounded-none">{reactions.cerebral}</span>
              {hasReacted['cerebral'] && (
                <div className="absolute inset-x-0 bottom-0 py-0.5 bg-red-800 flex items-center justify-center font-mono text-[8px] tracking-widest text-white uppercase font-extrabold rotate-3">
                  STAMPED
                </div>
              )}
            </button>

            {/* Reaction Type 2: Authentic */}
            <button
              onClick={() => handleReact('verified')}
              className={`p-3 border-2 border-current flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group select-none ${
                hasReacted['verified'] 
                  ? "bg-[#2C5E5A] text-white shadow-none" 
                  : "bg-white hover:bg-stone-50 text-[#141414] shadow-sm active:translate-y-[1px]"
              }`}
            >
              <CheckSquare size={15} className="mb-1" />
              <span className="font-mono text-[9px] font-black uppercase tracking-wider">Authentic</span>
              <span className="font-mono text-xs font-bold mt-1 bg-black/10 px-1.5 rounded-none">{reactions.verified}</span>
              {hasReacted['verified'] && (
                <div className="absolute inset-x-0 bottom-0 py-0.5 bg-red-800 flex items-center justify-center font-mono text-[8px] tracking-widest text-white uppercase font-extrabold -rotate-3">
                  STAMPED
                </div>
              )}
            </button>

            {/* Reaction Type 3: Dissenting */}
            <button
              onClick={() => handleReact('dissenting')}
              className={`p-3 border-2 border-current flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group select-none ${
                hasReacted['dissenting'] 
                  ? "bg-[#2C5E5A] text-white shadow-none" 
                  : "bg-white hover:bg-stone-50 text-[#141414] shadow-sm active:translate-y-[1px]"
              }`}
            >
              <Compass size={15} className="mb-1" />
              <span className="font-mono text-[9px] font-black uppercase tracking-wider">Dissenting</span>
              <span className="font-mono text-xs font-bold mt-1 bg-black/10 px-1.5 rounded-none">{reactions.dissenting}</span>
              {hasReacted['dissenting'] && (
                <div className="absolute inset-x-0 bottom-0 py-0.5 bg-amber-800 flex items-center justify-center font-mono text-[8px] tracking-widest text-white uppercase font-extrabold">
                  STAMPED
                </div>
              )}
            </button>

            {/* Reaction Type 4: Historical */}
            <button
              onClick={() => handleReact('historical')}
              className={`p-3 border-2 border-current flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group select-none ${
                hasReacted['historical'] 
                  ? "bg-[#2C5E5A] text-white shadow-none" 
                  : "bg-white hover:bg-stone-50 text-[#141414] shadow-sm active:translate-y-[1px]"
              }`}
            >
              <BookOpen size={15} className="mb-1" />
              <span className="font-mono text-[9px] font-black uppercase tracking-wider">Crucial Doc</span>
              <span className="font-mono text-xs font-bold mt-1 bg-black/10 px-1.5 rounded-none">{reactions.historical}</span>
              {hasReacted['historical'] && (
                <div className="absolute inset-x-0 bottom-0 py-0.5 bg-red-800 flex items-center justify-center font-mono text-[8px] tracking-widest text-white uppercase font-extrabold rotate-6">
                  STAMPED
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 8. EDITOR SIGN-OFF STAMP FOOTER */}
        <div className="border-t-2 border-current mt-8 pt-6 flex flex-col md:flex-row justify-between items-center bg-black/5 p-4 border-2 border-current shrink-0 relative rounded-none text-current">
          <div className="flex items-center gap-2 mb-3 md:mb-0">
            <CheckSquare className="text-current shrink-0" size={16} />
            <span className="font-mono text-[10px] tracking-wide">
              MOCK DATABASE AUDIT COMPILED: GAZETTE-P{post.id}-VERIFIED
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-serif italic text-xs">Blog-Gadag Editorial Desk</span>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
