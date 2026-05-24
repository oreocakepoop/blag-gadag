import React, { useState, useEffect } from "react";
import { Post } from "./types";
import Header from "./components/Header";
import PostCard from "./components/PostCard";
import PostDetail from "./components/PostDetail";
import CMSPanel from "./components/CMSPanel";
import { Calendar, User, Clock, ArrowRight, Sparkles, AlertCircle, FileText, Globe, Newspaper, Lock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Robust client-side tool to extract YouTube ID from any YouTube URL format (to avoid player configurations errors)
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

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState("All");
  const [activeView, setActiveView] = useState<'reader' | 'cms'>('reader');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Security gate states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityPinInput, setSecurityPinInput] = useState("");
  const [securityError, setSecurityError] = useState("");

  // Bookmark pocket local storage manager
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem("blog_bookmarks");
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("blog_bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  const handleToggleBookmark = (postId: string) => {
    setBookmarks((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  // Urgent Ticker dynamic state loader
  const [urgentNews, setUrgentNews] = useState<any[]>([]);

  const fetchUrgentNews = async () => {
    try {
      const res = await fetch("/api/urgent-news");
      if (res.ok) {
        const data = await res.json();
        setUrgentNews(data);
      }
    } catch (e) {
      console.error("Error reading decoupled urgent news tickers:", e);
    }
  };

  const handleUpdateUrgentNews = async (updatedNews: any[]) => {
    try {
      const res = await fetch("/api/urgent-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news: updatedNews }),
      });
      if (res.ok) {
        setUrgentNews(updatedNews);
        return { success: true };
      }
    } catch (e) {
      console.error("Error pushing ticker dispatches:", e);
    }
    return { success: false };
  };

  // Fetch posts from Express API on mount
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/posts");
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Error loading decoupled CMS posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchUrgentNews();
  }, []);

  // CRUD operation: Create
  const handleCreatePost = async (postData: Omit<Post, "id" | "slug" | "date">) => {
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      if (response.ok) {
        await fetchPosts();
        return { success: true };
      }
    } catch (error) {
      console.error("Error creating post:", error);
    }
    return { success: false };
  };

  // CRUD operation: Update
  const handleUpdatePost = async (id: string, postData: Partial<Post>) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      if (response.ok) {
        await fetchPosts();
        return { success: true };
      }
    } catch (error) {
      console.error("Error updating post:", error);
    }
    return { success: false };
  };

  // CRUD operation: Delete
  const handleDeletePost = async (id: string) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchPosts();
        if (selectedPostId === id) {
          setSelectedPostId(null);
        }
        return { success: true };
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
    return { success: false };
  };

  // Filter out any working drafts, unless in CMS view, supporting Bookmarked category filtration
  const visiblePosts = posts.filter(
    p =>
      !p.isDraft &&
      (currentCategory === "Bookmarked ✧"
        ? bookmarks.includes(p.id)
        : currentCategory === "All" || p.category === currentCategory)
  );
  
  // Find featured post (of the visible published set)
  const featuredPost = visiblePosts.find(p => p.isFeatured) || visiblePosts[0];
  const standardPosts = visiblePosts.filter(p => p.id !== (featuredPost ? featuredPost.id : ""));

  const activePost = posts.find(p => p.id === selectedPostId);

  return (
    <div id="app-wrapper" className="min-h-screen bg-[#fbfaf5] text-[#121212] select-text">
      {/* Decorative Outer Border Box to capture pristine newsprint layout */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        
        {/* Core Header Navigation */}
        <Header
          currentCategory={currentCategory}
          onSelectCategory={(cat) => {
            setCurrentCategory(cat);
            setSelectedPostId(null);
            setActiveView('reader');
          }}
          onOpenCms={() => {
            setActiveView(activeView === 'cms' ? 'reader' : 'cms');
            setSelectedPostId(null);
          }}
          activeView={activeView}
          urgentNews={urgentNews}
        />

        {/* Content routing wrapper */}
        <main className="min-h-[60vh]">
          {loading ? (
            <div className="py-24 text-center font-mono text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-3">
              <span className="w-6 h-6 border-2 border-[#141414] border-t-transparent animate-spin inline-block"></span>
              <span>INDEXING RECENT CORRESPONDENCE...</span>
            </div>
          ) : activeView === 'cms' ? (
            <CMSPanel
              posts={posts}
              onCreatePost={handleCreatePost}
              onUpdatePost={handleUpdatePost}
              onDeletePost={handleDeletePost}
              urgentNews={urgentNews}
              onUpdateUrgentNews={handleUpdateUrgentNews}
            />
          ) : activePost ? (
            <PostDetail
              post={activePost}
              onBack={() => setSelectedPostId(null)}
              isBookmarked={bookmarks.includes(activePost.id)}
              onToggleBookmark={handleToggleBookmark}
            />
          ) : (
            <AnimatePresence mode="popLayout">
              {/* Reader Landing Page Grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                {visiblePosts.length === 0 ? (
                  <div className="border-2 border-dashed border-[#141414]/35 bg-white py-24 text-center rounded-none shadow-sm">
                    <p className="font-serif italic text-[#141414] text-xl mb-4">No published editorials found in this category.</p>
                    <p className="font-mono text-xs text-stone-500 uppercase tracking-widest leading-loose">
                      OPEN THE SECURED <span className="underline font-bold text-white bg-[#9D3534] border border-[#141414] px-1.5 py-0.5">ADMINISTRATION WORKSTATION</span> AT THE BOTTOM OF THE PAGE TO RETRIEVE OR DRAFT COPIES
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 1. HERO FEATURED COLUMN CELL (Displays only when filtering All or if featured post matches filtered item) */}
                    {featuredPost && (
                      <div className="w-full border-b border-[#141414]/30 pb-8 mb-8 overflow-hidden group">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                           {/* Left Column (Content) */}
                           <div className="lg:col-span-7 flex flex-col justify-between">
                              <div>
                                 <div className="flex items-center gap-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-extrabold text-[#9D3534] mb-3">
                                    <span>✦ TOP STORY</span>
                                    <span className="w-6 h-px bg-[#9D3534]/40"></span>
                                    <span className="text-stone-900">{featuredPost.category}</span>
                                 </div>
                                 
                                 <h2
                                   onClick={() => setSelectedPostId(featuredPost.id)}
                                   className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black text-[#141414] tracking-tight leading-[1.05] mb-4 cursor-pointer hover:text-[#9D3534] transition-colors"
                                 >
                                   {featuredPost.title}
                                 </h2>

                                 <div className="font-sans text-[10px] md:text-[11px] uppercase font-bold text-[#141414] mb-4 pb-2 border-b border-[#141414]/15 w-full flex items-center justify-between">
                                   <span>BY {featuredPost.author}</span>
                                   <span className="text-stone-500 font-mono tracking-widest">{featuredPost.readTime} MIN READ</span>
                                 </div>
                                 
                                 <p className="font-serif text-stone-800 text-sm md:text-base leading-relaxed mb-6 text-justify">
                                   <span className="font-black text-4xl float-left mr-2 mt-1 leading-[0.7] text-[#141414]">
                                      {featuredPost.summary ? featuredPost.summary.charAt(0).toUpperCase() : "T"}
                                   </span>
                                   {featuredPost.summary ? featuredPost.summary.slice(1) : "he latest intelligence briefings indicate significant shifts in established diplomatic circles..."}
                                 </p>
                              </div>

                              <div>
                                <button
                                  onClick={() => setSelectedPostId(featuredPost.id)}
                                  className="px-5 py-2.5 border border-[#141414] bg-[#F9F8F6] text-[#141414] hover:bg-[#141414] hover:text-white font-bold text-[10px] font-mono uppercase tracking-[0.2em] transition-all flex justify-between items-center cursor-pointer rounded-none"
                                >
                                  <span>READ FULL DOSSIER</span>
                                  <ArrowRight size={14} className="ml-4 stroke-[2.5]" />
                                </button>
                              </div>
                           </div>

                           {/* Right Column (Image/Video) - Compact size to prevent pixelation */}
                           {((featuredPost.imageUrls && featuredPost.imageUrls.length > 0) || featuredPost.youtubeId) && (
                             <div className="lg:col-span-5 flex flex-col justify-start">
                               <div className="w-full relative border border-[#141414] aspect-[4/3] bg-[#F0EFED] max-h-[320px] overflow-hidden">
                                 {featuredPost.youtubeId ? (
                                    <iframe
                                      className="absolute inset-0 w-full h-full object-cover"
                                      src={`https://www.youtube.com/embed/${extractYoutubeId(featuredPost.youtubeId)}?modestbranding=1&controls=0&rel=0`}
                                      title="Featured Video"
                                      allowFullScreen
                                      referrerPolicy="no-referrer"
                                    ></iframe>
                                 ) : (
                                   <img
                                      src={featuredPost.imageUrls && featuredPost.imageUrls[0]}
                                      alt="Headlining Editorial"
                                      referrerPolicy="no-referrer"
                                      className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-[1.05] group-hover:grayscale-0 transition-all duration-500 object-center"
                                      onError={(e) => {
                                        (e.target as HTMLElement).parentElement!.style.display = "none";
                                      }}
                                    />
                                 )}
                               </div>
                               <div className="font-mono text-[8px] uppercase tracking-widest font-bold text-stone-500 mt-2 text-right">
                                  ( FIG 1. — PRIMARY ATTACHMENT )
                                </div>
                             </div>
                           )}
                        </div>
                      </div>
                    )}

                    {/* 2. SECONDARY GRID SHELF: OTHER OPINION BRIEFS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {standardPosts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          onClick={() => setSelectedPostId(post.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Newspaper Editorial Footer */}
        <footer className="border-t-4 border-[#141414] mt-16 pt-8 pb-12 select-none text-[#141414]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-[#141414]/10">
            <div>
              <h5 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#9D3534] mb-3.5">
                ✧ BLOG-GADAG JOURNAL
              </h5>
              <p className="font-sans text-xs text-stone-600 leading-relaxed font-normal text-justify">
                Our staff publishes independent critique, policy reviews, and strategic analysis concerning maritime, institutional, and energy sovereignty.
              </p>
            </div>
            
            <div>
              <h5 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#9D3534] mb-3.5">
                ✧ THE DECOUPLED DECK
              </h5>
              <p className="font-mono text-[10px] uppercase font-bold text-stone-600 leading-relaxed text-justify">
                Powered by a stateless front-end framework, persisting dynamically using localized schema objects. Edits are processed and saved in real-time.
              </p>
            </div>

            <div>
              <h5 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white bg-[#141414] px-2.5 py-1 border border-[#141414] uppercase w-fit select-none">
                AI GATEWAY STATUS
              </h5>
              <p className="font-mono text-[9px] uppercase font-bold text-stone-500 mt-2.5 leading-relaxed">
                INTEGRATED: @GOOGLE/GENAI SDK
                <br />
                ACTIVE ENGINE: GEMINI-3.5-FLASH
                <br />
                SYSTEM INGRESS: PORT 3000
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row justify-between items-center text-stone-500 font-mono text-[9px] uppercase tracking-[0.15em] gap-4">
            <span>© 2026 BLOG-GADAG INC. • ALL RECORDS COMMITTED PERSISTENTLY</span>
            <div className="flex gap-4">
              <span>EST. 104 Years • METRIC STACKS STABLE</span>
            </div>
          </div>
        </footer>

        {/* Secure Administrative Zone (Relocated to bottom) */}
        <div className="mt-8 pt-8 border-t-2 border-[#141414]/25 flex flex-col items-center justify-center gap-4 pb-12">
          <div className="text-center max-w-md">
            <h5 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#2C5E5A] mb-1.5 flex items-center justify-center gap-1.5">
              <ShieldCheck className="text-[#2C5E5A] animate-pulse" size={13} /> Secure Administrative Workspace
            </h5>
            <p className="font-sans text-[11px] text-stone-600">
              Only verified content administrators and journalists are permitted to override archives or compose new files.
            </p>
          </div>
          <button
            onClick={() => {
              if (activeView === 'cms') {
                setActiveView('reader');
              } else if (isAdminAuthenticated) {
                setActiveView('cms');
                setSelectedPostId(null);
              } else {
                setShowSecurityModal(true);
                setSecurityPinInput("");
                setSecurityError("");
              }
            }}
            className={`px-8 py-3.5 border-2 border-[#141414] text-[11px] font-mono tracking-widest uppercase transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-[0px] ${
              activeView === 'cms'
                ? "bg-[#9D3534] text-white hover:bg-[#832c2b]"
                : "bg-[#2C5E5A] text-white hover:bg-emerald-950"
            }`}
          >
            {activeView === 'cms' ? (
              <span>Exit CMS Panel Workstation</span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock size={12} className="text-[#D4A359]" /> Open Decoupled CMS Panel
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Security Challenge Modal */}
      <AnimatePresence>
        {showSecurityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#F9F8F6] border-4 border-[#141414] shadow-xl max-w-sm w-full p-6 relative rounded-none text-[#141414]"
            >
              {/* Title block */}
              <div className="flex items-center gap-2 pb-3 border-b-2 border-[#141414] mb-4">
                <span className="p-1.5 bg-[#9D3534] text-white flex items-center justify-center border border-[#141414]">
                  <Lock size={14} />
                </span>
                <div>
                  <h3 className="font-serif text-base font-bold uppercase tracking-tight leading-none text-[#2C5E5A]">
                    Security Clearance Code
                  </h3>
                  <span className="font-mono text-[9px] uppercase font-bold text-stone-500">Blog-Gadag Core Security Gateway</span>
                </div>
              </div>

              {/* Subtext info */}
              <p className="font-sans text-xs text-stone-600 leading-relaxed mb-4">
                This console contains draft-stage reviews and direct API hooks for editorial publishing. To continue, verify your credentials.
              </p>

              {/* Secure Pin hint banner */}
              <div className="bg-[#2C5E5A]/10 border border-[#2C5E5A]/30 p-2.5 mb-4 text-[10px] font-mono text-[#2C5E5A] font-bold uppercase tracking-wide flex items-start gap-1.5">
                <span className="font-bold shrink-0">✧ NOTICE:</span>
                <span>For demonstration review, use PIN: <strong className="bg-[#D4A359]/20 px-1 py-0.2 rounded-none font-bold text-[#9D3534]">Score@8520</strong></span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (securityPinInput === "Score@8520") {
                    setIsAdminAuthenticated(true);
                    setShowSecurityModal(false);
                    setActiveView('cms');
                    setSelectedPostId(null);
                    setSecurityPinInput("");
                    setSecurityError("");
                  } else {
                    setSecurityError("INVALID SECURE PASSCODE. AUDIT RECORD LOGGED.");
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-705 mb-1.5 font-mono">
                    Administration Key PIN
                  </label>
                  <input
                    type="password"
                    maxLength={32}
                    placeholder="••••"
                    value={securityPinInput}
                    onChange={(e) => {
                      setSecurityPinInput(e.target.value);
                      setSecurityError("");
                    }}
                    className="w-full tracking-[1.5em] text-center font-bold font-mono placeholder:tracking-normal p-2.5 bg-white border-2 border-[#141414] text-lg focus:outline-none focus:ring-2 focus:ring-[#2C5E5A] focus:border-[#2C5E5A] rounded-none text-[#141414]"
                    autoFocus
                  />
                </div>

                {securityError && (
                  <p className="text-[9px] uppercase font-bold font-mono text-[#9D3534] bg-[#9D3534]/10 border border-[#9D3534]/30 p-2 text-center animate-pulse">
                    🚨 {securityError}
                  </p>
                )}

                {/* Actions buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSecurityModal(false)}
                    className="w-1/2 py-2 border-2 border-[#141414] hover:bg-stone-100 font-mono text-[10px] font-bold uppercase tracking-wider bg-white text-[#141414] transition-all duration-100 cursor-pointer rounded-none active:translate-y-0.5"
                  >
                    Abort Clear
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 bg-[#2C5E5A] hover:bg-emerald-950 border-2 border-[#141414] text-white font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-100 cursor-pointer rounded-none shadow-sm hover:shadow-md active:translate-y-0.5"
                  >
                    Authorize Desk
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
