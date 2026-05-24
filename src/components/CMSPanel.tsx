import React, { useState, useEffect, useRef } from "react";
import { parseEditorialTags } from "../utils/editorialParser";
import { Post, CmsStats } from "../types";
import {
  Database,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Sparkles,
  Tv,
  CheckCircle,
  Save,
  AlertCircle,
  Eye,
  RefreshCw,
  Clock,
  X,
  FileSpreadsheet,
  Layers,
  Image,
  Radio,
  PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CMSPanelProps {
  posts: Post[];
  onCreatePost: (post: Omit<Post, "id" | "slug" | "date">) => Promise<any>;
  onUpdatePost: (id: string, post: Partial<Post>) => Promise<any>;
  onDeletePost: (id: string) => Promise<any>;
  urgentNews: any[];
  onUpdateUrgentNews: (news: any[]) => Promise<any>;
}

// Client-side extraction tool to instantly support copy-pasting YouTube URLs
function extractYoutubeId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  // Standard 11 char ID checking
  if (trimmed.length === 11 && !trimmed.includes("/") && !trimmed.includes("?")) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return trimmed;
}

export default function CMSPanel({ 
  posts, 
  onCreatePost, 
  onUpdatePost, 
  onDeletePost, 
  urgentNews, 
  onUpdateUrgentNews 
}: CMSPanelProps) {
  const [activeTab, setActiveTab] = useState<'manage' | 'editor'>('manage');
  const [stats, setStats] = useState<CmsStats>({ totalPosts: 0, publishedCount: 0, draftsCount: 0, totalReadingTime: 0 });
  const [loading, setLoading] = useState(false);
  
  // Base editor fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Foreign Policy");
  const [youtubeId, setYoutubeId] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]); // Smarter dynamic array of photo links
  const [author, setAuthor] = useState("Alvin Gazette");
  const [readTime, setReadTime] = useState(3);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [titleFontSize, setTitleFontSize] = useState("");

  // Gemini Workspace fields
  const [aiTopic, setAiTopic] = useState("");
  const [aiYoutubeUrl, setAiYoutubeUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  // Urgent Ticker Composer fields
  const [newTickerInput, setNewTickerInput] = useState("");
  const [updatingTickerList, setUpdatingTickerList] = useState(false);
  const [tickerColor, setTickerColor] = useState("default");
  const [tickerStyle, setTickerStyle] = useState("normal");
  const [tickerFontSizeOption, setTickerFontSizeOption] = useState("11");

  const categoriesList = ["Foreign Policy", "Domestic Politics", "Economy", "Opinion", "Society & Tech"];

  const contentRef = useRef<HTMLTextAreaElement>(null);

  const applyStyleToSelection = (styleTag: string) => {
    if (!contentRef.current) return;
    const textarea = contentRef.current;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const currentText = content;
    const selectedText = currentText.substring(start, end);
    const textToWrap = selectedText === "" ? `${styleTag} text` : selectedText;
    
    const wrappedText = `[${styleTag}]${textToWrap}[/${styleTag}]`;
    const newText = currentText.substring(0, start) + wrappedText + currentText.substring(end);
    
    handleContentChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + wrappedText.length);
    }, 50);
  };

  // Fetch metrics stats
  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [posts]);

  // Handle auto-populating fields on editing
  const handleEditSelect = (post: Post) => {
    setEditingId(post.id);
    setTitle(post.title);
    setSummary(post.summary);
    setContent(post.content);
    setCategory(post.category);
    setYoutubeId(post.youtubeId || "");
    setImageUrls(post.imageUrls && post.imageUrls.length > 0 ? [...post.imageUrls] : [""]);
    setAuthor(post.author);
    setReadTime(post.readTime);
    setIsFeatured(post.isFeatured);
    setIsDraft(post.isDraft);
    setTitleFontSize((post as any).titleFontSize || "");
    setUndoStack([]);
    setRedoStack([]);
    setLastSavedTime(null);
    setActiveTab('editor');
  };

  // Clear all form inputs
  const clearForm = () => {
    setEditingId(null);
    setTitle("");
    setSummary("");
    setContent("");
    setCategory("Foreign Policy");
    setYoutubeId("");
    setImageUrls([""]);
    setAuthor("Alvin Gazette");
    setReadTime(3);
    setIsFeatured(false);
    setIsDraft(false);
    setTitleFontSize("");
    setAiSuccessMessage("");
    setUndoStack([]);
    setRedoStack([]);
    setLastSavedTime(null);
  };

  const handleInsertMarkup = (markupText: string) => {
    handleContentChange(content ? content + "\n\n" + markupText : markupText);
  };

  const handleContentChange = (newVal: string) => {
    setUndoStack(prev => [...prev, content].slice(-50));
    setRedoStack([]);
    setContent(newVal);
    setLastSavedTime(new Date());
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, content]);
    setUndoStack(prev => prev.slice(0, -1));
    setContent(previous);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, content]);
    setRedoStack(prev => prev.slice(0, -1));
    setContent(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    }
  };

  const getWordCount = () => content.trim().split(/\s+/).filter(w => w.length > 0).length;
  const getCharCount = () => content.length;
  const getEstReadTime = () => Math.max(1, Math.ceil(getWordCount() / 200));

  // Submit creator/updater
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !category || !author) {
      alert("Please fill in all core fields (Title, Content, Category, Author).");
      return;
    }

    setLoading(true);

    // Clean YouTube value from paste
    const finalYoutubeId = extractYoutubeId(youtubeId);

    // Clean Image URLs from standard state array
    const finalImageUrls = imageUrls
      .map(url => url.trim())
      .filter(Boolean);

    const postPayload = {
      title,
      summary: summary || undefined,
      content,
      category,
      youtubeId: finalYoutubeId || undefined,
      imageUrls: finalImageUrls,
      author,
      readTime: Number(readTime) || 3,
      isFeatured,
      isDraft,
      titleFontSize: titleFontSize || undefined,
    };

    try {
      if (editingId) {
        await onUpdatePost(editingId, postPayload);
      } else {
        await onCreatePost(postPayload);
      }
      clearForm();
      setActiveTab('manage');
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle direct delete
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this political brief? This action is irreversible on our Decoupled API server.")) {
      await onDeletePost(id);
    }
  };

  // Add a new Urgent Ticker Item
  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTickerInput.trim()) return;

    setUpdatingTickerList(true);
    const newItem = {
      text: newTickerInput.trim().toUpperCase(),
      color: tickerColor,
      style: tickerStyle,
      fontSize: tickerFontSizeOption
    };
    const updatedNews = [...urgentNews, newItem];
    try {
      await onUpdateUrgentNews(updatedNews);
      setNewTickerInput("");
      setTickerColor("default");
      setTickerStyle("normal");
      setTickerFontSizeOption("11");
    } catch (err) {
      console.error("Error updating ticker tape:", err);
    } finally {
      setUpdatingTickerList(false);
    }
  };

  // Remove an Urgent Ticker Item
  const handleRemoveTicker = async (idxToRemove: number) => {
    setUpdatingTickerList(true);
    const updatedNews = urgentNews.filter((_, i) => i !== idxToRemove);
    try {
      await onUpdateUrgentNews(updatedNews);
    } catch (err) {
      console.error("Error removing ticker item:", err);
    } finally {
      setUpdatingTickerList(false);
    }
  };

  // Trigger Gemini AI editor
  const handleGeminiGen = async () => {
    if (!aiTopic && !aiYoutubeUrl) {
      setAiStatus("Error: please specify either an Editorial Topic or a YouTube Link.");
      return;
    }

    setAiLoading(true);
    setAiStatus("EDITORIAL CHIEF ACTIVE: QUERYING SERVER ENDPOINT...");
    setAiSuccessMessage("");
    
    // Fun loading sequences to make UX immersive
    const sequences = [
      "ESTABLISHING SECURE CONNECTION TO @GOOGLE/GENAI ON PORT 3000...",
      "SUMMONING BULLET-POINT OUTLINES & POLITICAL DILEMMAS...",
      "RESEARCHING DEBATE HISTORIES...",
      "APPLYING REGIONAL POLICY CONTEXT...",
      "PACKAGING HIGH-CONTRAST MARKDOWN STRUCTURE..."
    ];

    let seqIdx = 0;
    const seqInterval = setInterval(() => {
      if (seqIdx < sequences.length) {
        setAiStatus(`EDITORIAL CHIEF ACTIVE: ${sequences[seqIdx]}`);
        seqIdx++;
      }
    }, 1800);

    try {
      // Clean up YouTube URL client side as well for safety
      const processedYtUrl = aiYoutubeUrl ? aiYoutubeUrl.trim() : "";

      const response = await fetch("/api/cms/suggest-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic, youtubeUrl: processedYtUrl })
      });

      clearInterval(seqInterval);

      if (!response.ok) {
        throw new Error("Unable to contact server-side Gemini gateway.");
      }

      const data = await response.json();
      
      // Auto populate fields
      setTitle(data.title || "The Friction of Multi-Alignment");
      setSummary(data.summary || "Co-existence analysis of contemporary diplomacy.");
      setContent(data.suggestedContent || "### Deep Analysis\nDraft content has been established.");
      setReadTime(data.suggestedReadTime || 5);
      
      if (processedYtUrl) {
        const extractedId = extractYoutubeId(processedYtUrl);
        setYoutubeId(extractedId);
      }

      setAiSuccessMessage(`✧ OUTLINE GENERATED! Loaded: "${data.title}" successfully into editor forms.`);
      setAiTopic("");
      setAiYoutubeUrl("");
      setAiStatus("");
    } catch (error: any) {
      clearInterval(seqInterval);
      setAiStatus(`Gateway Timeout: using offline journalism templates instead.`);
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 font-mono">
      {/* Editorial Dashboard Title */}
      <div className="bg-[#141414] text-white p-6 border-b-2 border-[#141414] mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Layers className="text-[#E2533E] shrink-0 animate-pulse" size={18} />
            <h2 className="text-xs tracking-[0.2em] uppercase font-bold text-[#E2533E]">
              DECOUPLED HEADLESS CMS DESK
            </h2>
          </div>
          <p className="text-xs text-stone-300 font-sans font-light max-w-xl">
            This dashboard communicates directly via mock database API calls (`posts.json`). You can edit drafts, publish video analyses, manage urgent news ticker dispatches, and utilize **Gemini AI** to write columns server-side.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { clearForm(); setActiveTab('manage'); }}
            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-2 border-white transition-all cursor-pointer ${
              activeTab === 'manage' ? 'bg-white text-[#141414]' : 'hover:bg-white/10 text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { clearForm(); setActiveTab('editor'); }}
            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-2 border-white transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'editor' ? 'bg-white text-[#141414]' : 'hover:bg-white/10 text-white'
            }`}
          >
            <Plus size={13} /> Compose Desk
          </button>
        </div>
      </div>

      {activeTab === 'manage' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-8"
        >
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 border-2 border-[#141414] bg-white shadow hover:shadow-md transition-shadow relative overflow-hidden">
              <span className="absolute right-2 top-2 opacity-10 text-[#141414]"><FileText size={70} /></span>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">Total Articles</p>
              <p className="text-3xl font-extrabold tracking-tight mt-1 text-[#141414]">{stats.totalPosts}</p>
            </div>
            <div className="p-5 border-2 border-[#141414] bg-[#FAF7F2] shadow hover:shadow-md transition-shadow relative overflow-hidden">
              <span className="absolute right-2 top-2 opacity-10 text-[#9D3534]"><CheckCircle size={70} /></span>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">Live Published</p>
              <p className="text-3xl font-extrabold tracking-tight mt-1 text-[#141414]">{stats.publishedCount}</p>
            </div>
            <div className="p-5 border-2 border-[#141414] bg-[#FAF7F2] shadow hover:shadow-md transition-shadow relative overflow-hidden">
              <span className="absolute right-2 top-2 opacity-10 text-amber-700"><AlertCircle size={70} /></span>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">Working Drafts</p>
              <p className="text-3xl font-extrabold tracking-tight mt-1 text-amber-900">{stats.draftsCount}</p>
            </div>
            <div className="p-5 border-2 border-[#141414] bg-white shadow hover:shadow-md transition-shadow relative overflow-hidden">
              <span className="absolute right-2 top-2 opacity-10 text-stone-700"><Clock size={70} /></span>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">Total Read Volume</p>
              <p className="text-3xl font-extrabold tracking-tight mt-1 text-[#141414]">{stats.totalReadingTime}m</p>
            </div>
          </div>

          {/* Urgent News Ticker Controller Panel (Solving Urgent News request) */}
          <div className="border-2 border-[#141414] bg-white p-6 shadow-md rounded-none">
            <h3 className="font-serif text-lg font-bold text-[#141414] mb-3 flex items-center gap-2">
              <Radio size={16} className="text-[#9D3534] animate-pulse" /> Urgent News Ticker Dispatches
            </h3>
            <p className="text-xs text-stone-500 font-sans mb-5 leading-normal">
              Manage live alerts looping continuously in the top ticker tape. Updates are directly saved to the decopuled API files.
            </p>

            {/* Quick adding input form */}
            <form onSubmit={handleAddTicker} className="space-y-4 mb-6 p-4 border border-[#141414]/15 bg-[#FAF8F5]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase font-black text-stone-600">Alert Headline text</label>
                <input
                  type="text"
                  value={newTickerInput}
                  onChange={(e) => setNewTickerInput(e.target.value)}
                  placeholder="ENTER CAPITALIZED ALERT... (e.g., INHERENT TRADE DISRUPTIONS STABILIZED)"
                  className="w-full border-2 border-[#141414] p-2.5 text-xs font-mono font-bold uppercase tracking-wide bg-white rounded-none focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase font-black text-stone-600">Emphasized Color</label>
                  <select
                    value={tickerColor}
                    onChange={(e) => setTickerColor(e.target.value)}
                    className="border-2 border-[#141414] p-2 bg-white text-xs font-mono font-bold rounded-none focus:outline-none cursor-pointer"
                  >
                    <option value="default">Charcoal (Default)</option>
                    <option value="crimson">Crimson Red (Urgent / Danger)</option>
                    <option value="amber">Amber Gold (Notice / Warning)</option>
                    <option value="emerald">Emerald Teal (Success / Stability)</option>
                    <option value="sapphire">Intellect Sapphire (International / Tech)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase font-black text-stone-600">Font & Style mode</label>
                  <select
                    value={tickerStyle}
                    onChange={(e) => setTickerStyle(e.target.value)}
                    className="border-2 border-[#141414] p-2 bg-white text-xs font-mono font-bold rounded-none focus:outline-none cursor-pointer"
                  >
                    <option value="normal">Standard Monospace Block</option>
                    <option value="pulsing">Pulsing Active Danger Alert</option>
                    <option value="italic">Vintage Lowercase Editorial Serif </option>
                    <option value="bold">Bold Dashed Highlight Line</option>
                    <option value="doubleUnderline">Double Underlined Headline Type</option>
                    <option value="highlight">Glowing Border Highlight Frame</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase font-black text-stone-600">Dispatch Font Size (px)</label>
                  <select
                    value={tickerFontSizeOption}
                    onChange={(e) => setTickerFontSizeOption(e.target.value)}
                    className="border-2 border-[#141414] p-2 bg-white text-xs font-mono font-bold rounded-none focus:outline-none cursor-pointer"
                  >
                    <option value="9">9px - Fine Print</option>
                    <option value="10">10px - Compact</option>
                    <option value="11">11px - Standard</option>
                    <option value="12">12px - Normal</option>
                    <option value="13">13px - Medium</option>
                    <option value="14">14px - Large</option>
                    <option value="15">15px - Extra Large</option>
                    <option value="16">16px - Display Small</option>
                    <option value="18">18px - Display Large</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingTickerList || !newTickerInput.trim()}
                  className="px-5 py-2.5 bg-[#9D3534] hover:bg-[#832c2b] text-white border-2 border-[#141414] font-bold text-xs uppercase cursor-pointer rounded-none flex items-center gap-1.5 shrink-0"
                >
                  <PlusCircle size={14} /> Dispatch Alert
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-[250px] overflow-y-auto border border-[#141414]/15 p-3 bg-stone-50">
              {urgentNews.length === 0 ? (
                <div className="text-stone-400 text-xs py-4 text-center font-sans">
                  No custom news dispatches configured. Showing default news stream instead.
                </div>
              ) : (
                urgentNews.map((item, index) => {
                  const itemText = typeof item === 'string' ? item : (item.text || "");
                  const itemColor = typeof item === 'string' ? 'default' : (item.color || "default");
                  const itemStyle = typeof item === 'string' ? 'normal' : (item.style || "normal");

                  return (
                    <div key={index} className="flex justify-between items-center bg-white p-2.5 border border-[#141414] text-xs font-mono gap-4">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="truncate font-black text-stone-900 font-mono">✧ {itemText}</span>
                        <div className="flex flex-wrap gap-2 items-center text-[9px] uppercase font-bold text-stone-500 mt-1">
                          <span className="bg-stone-50 border border-stone-200 px-1.5 py-0.5">Color: {itemColor}</span>
                          <span className="bg-stone-50 border border-stone-200 px-1.5 py-0.5">Style: {itemStyle}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTicker(index)}
                        className="p-1 px-2 text-red-750 hover:bg-stone-100 transition-colors cursor-pointer border border-[#141414] flex items-center gap-1 text-[10px] uppercase font-bold text-red-700 shrink-0"
                        title="Kill Alert"
                      >
                        <Trash2 size={11} /> Kill
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Stories Management Panel */}
          <div className="border-2 border-[#141414] bg-white p-6 shadow-md rounded-none">
            <h3 className="font-serif text-lg font-bold text-[#141414] mb-5 flex items-center gap-2">
              <Database size={16} className="text-[#E2533E]" /> Decoupled DB Feed ({posts.length} entries stored)
            </h3>

            {posts.length === 0 ? (
              <div className="py-12 text-center text-stone-400 font-sans font-light">
                No articles discovered in live Firestore database. Feel free to compose a brand-new issue using our tool!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#141414] text-[10px] text-stone-500 uppercase bg-[#F0EFED] tracking-wider">
                      <th className="py-3 px-3 font-bold font-mono">Title / Topic</th>
                      <th className="py-3 px-3 font-bold font-mono">Category</th>
                      <th className="py-3 px-3 font-bold font-mono">Author</th>
                      <th className="py-3 px-3 font-bold font-mono">Publish Date</th>
                      <th className="py-3 px-3 font-bold font-mono">Platform</th>
                      <th className="py-3 px-3 font-bold font-mono text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="border-b border-[#141414]/10 hover:bg-[#F9F8F6] text-xs text-stone-850 transition-colors">
                        <td className="py-3 px-3 font-serif font-bold max-w-[250px] truncate block md:table-cell text-[#141414]">
                          <span className="inline-block mr-2">{post.title}</span>
                          {post.isFeatured && (
                            <span className="bg-[#E2533E] text-white text-[9px] px-1.5 py-0.2 border border-[#141414] uppercase font-mono font-bold">
                              Featured
                            </span>
                          )}
                          {post.imageUrls && post.imageUrls.length > 0 && (
                            <span className="bg-[#2C5E5A] text-white text-[9px] px-1.5 py-0.2 border border-[#141414] uppercase font-mono font-bold ml-1.5">
                              {post.imageUrls.length} pic(s)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] font-bold text-[#141414]/80">{post.category}</td>
                        <td className="py-3 px-3 font-mono uppercase text-[10px] text-stone-600">{post.author}</td>
                        <td className="py-3 px-3 font-mono text-[10px] text-stone-600">{post.date}</td>
                        <td className="py-3 px-3 font-mono">
                          {post.youtubeId ? (
                            <span className="text-[#E2533E] bg-[#E2533E]/10 px-1.5 py-0.5 border border-[#E2533E]/30 text-[9px] uppercase font-bold flex items-center w-fit gap-1">
                              <Tv size={10} /> Broadcast
                            </span>
                          ) : (
                            <span className="text-stone-700 bg-stone-100 px-1.5 py-0.5 border border-stone-200 text-[9px] uppercase font-bold flex items-center w-fit gap-1">
                              <FileText size={10} /> Briefing
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleEditSelect(post)}
                              className="p-1.5 border border-[#141414] bg-white hover:bg-[#F0EFED] text-[#141414] transition-colors cursor-pointer"
                              title="Edit Story"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="p-1.5 border border-[#E2533E] bg-red-50 hover:bg-[#E2533E] hover:text-white text-[#E2533E] transition-all cursor-pointer"
                              title="Delete Story"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Main Composing Form (Left Panel 7cols) */}
          <form onSubmit={handleSubmit} className="lg:col-span-12 xl:col-span-8 space-y-6 border-2 border-[#141414] bg-white p-6 shadow-md rounded-none">
            <h3 className="font-serif text-lg font-bold border-b-2 border-[#141414] pb-3 text-[#141414] flex justify-between items-center">
              <span>{editingId ? `Edit Headline: GA-P${editingId}` : "Draft a New Editorial Column"}</span>
              <button
                type="button"
                onClick={clearForm}
                className="text-[10px] font-mono py-1 px-2.5 border-2 border-[#141414] bg-[#F0EFED] hover:bg-white text-[#141414] font-bold uppercase transition-all tracking-wide cursor-pointer"
              >
                Clear Fields
              </button>
            </h3>

            {/* Quick Informational Error */}
            <AnimatePresence>
              {aiSuccessMessage && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-amber-50 text-amber-900 border-2 border-[#141414] p-3.5 text-xs flex gap-2 items-start"
                >
                  <Sparkles className="text-amber-500 shrink-0" size={16} />
                  <span>{aiSuccessMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">Article Headline</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Navigating Inflationary Pressures in Sovereign Debt"
                  className="w-full border-2 border-[#141414] p-2.5 text-xs bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#141414] font-serif font-bold text-[#141414] rounded-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">Category Section</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border-2 border-[#141414] p-2.5 text-xs bg-stone-50 focus:bg-white focus:outline-none font-bold text-[#141414] rounded-none"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1.5 font-mono">Author Correspondent</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full border-2 border-[#141414] p-2.5 text-xs bg-stone-50 font-mono font-bold text-[#141414] rounded-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#9D3534] mb-1.5 font-mono">
                  📺 Companion YouTube Link
                </label>
                <input
                  type="text"
                  value={youtubeId}
                  onChange={(e) => setYoutubeId(e.target.value)}
                  placeholder="Paste URL or ID (e.g. h..."
                  className="w-full border-2 border-[#141414] p-2.5 text-xs bg-stone-50 font-mono font-bold text-[#141414] rounded-none focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1.5 font-mono">Read Time index (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={readTime}
                  onChange={(e) => setReadTime(Number(e.target.value))}
                  className="w-full border-2 border-[#141414] p-2.5 text-xs bg-stone-50 font-mono font-bold text-[#141414] rounded-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2C5E5A] mb-1.5 font-mono">
                  Headline Font Size
                </label>
                <select
                  value={titleFontSize}
                  onChange={(e) => setTitleFontSize(e.target.value)}
                  className="w-full border-2 border-[#141414] p-2.5 text-xs bg-stone-50 font-mono font-bold text-[#141414] rounded-none focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="">Default Size</option>
                  <option value="20">20px</option>
                  <option value="24">24px</option>
                  <option value="28">28px</option>
                  <option value="32">32px</option>
                  <option value="36">36px</option>
                  <option value="40">40px</option>
                  <option value="44">44px</option>
                  <option value="48">48px</option>
                  <option value="52">52px</option>
                  <option value="56">56px</option>
                  <option value="60">60px</option>
                  <option value="64">64px</option>
                  <option value="72">72px</option>
                  <option value="80">80px</option>
                </select>
              </div>
            </div>

            {/* Smarter dynamic attached photos list with plus button (Feature 2/2) */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2C5E5A] flex items-center gap-1.5 font-mono">
                <Image size={13} className="text-[#2C5E5A]" /> Single or Multiple Photo URL Links (Dynamic Smarter Set)
              </label>
              
              <div className="space-y-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const nextUrls = [...imageUrls];
                        nextUrls[index] = e.target.value;
                        setImageUrls(nextUrls);
                      }}
                      placeholder={`Image URL Link #${index + 1} (e.g., https://images.unsplash.com/photo-...)`}
                      className="flex-1 border-2 border-[#141414] p-2.5 text-xs bg-stone-50 font-mono font-medium text-stone-800 rounded-none focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#141414]"
                    />
                    {imageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrls(imageUrls.filter((_, i) => i !== index));
                        }}
                        className="px-3.5 border-2 border-[#141414] bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs select-none cursor-pointer"
                        title="Delete this image placeholder block"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setImageUrls([...imageUrls, ""])}
                  className="px-3.5 py-1.5 border-2 border-[#141414] bg-[#2C5E5A] text-white hover:bg-[#1a403d] font-bold text-[10px] font-mono uppercase tracking-wider cursor-pointer shadow-[3px_3px_0px_#141414] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 select-none"
                >
                  <span>+ Add URL Link Placeholder</span>
                </button>
                <span className="text-[9px] text-stone-400 font-mono block leading-normal uppercase">
                  Add clean photographic illustration segments. First url matches standard banner; supplementary blocks align inline.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">Executive Summary (Slug Deck)</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief summary deck for the homepage index. If left empty, it represents the first 120 characters of the body."
                className="w-full border-2 border-[#141414] p-2.5 text-xs bg-stone-50 h-16 font-sans font-normal text-stone-800 rounded-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600">Markdown Essay Body</label>
                <span className="text-[10px] text-stone-400 font-sans">Supports headers (###), lists (*), and blockquotes (&gt;)</span>
              </div>

              {/* Aesthetic In-line Document Layout Inserters */}
              <div className="mb-2 bg-[#FAF8F5] border border-[#141414]/20 p-2 flex flex-wrap gap-1.5 items-center text-xs font-mono">
                <span className="text-[9px] font-extrabold uppercase text-stone-500 mr-1.5">Editorial Inserters:</span>
                <button
                  type="button"
                  onClick={() => handleInsertMarkup("### The Death of the Nuanced Narrative")}
                  className="px-2.5 py-1 bg-white border border-stone-300 hover:bg-[#E2533E] hover:text-white text-[10px] font-bold cursor-pointer transition-all"
                  title="Adds a standard subheading formatted with a partition divider line below it"
                >
                  + Subheading
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMarkup("> This selection bias has several profound consequences on democracy:")}
                  className="px-2.5 py-1 bg-white border border-stone-300 hover:bg-[#E2533E] hover:text-white text-[10px] font-bold cursor-pointer transition-all"
                  title="Adds an italic blockquote with left thick block borders"
                >
                  + Callout Quote
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMarkup("* **Siloed Consensus:** Audiences are fed algorithmic confirmation feeds.")}
                  className="px-2.5 py-1 bg-white border border-stone-300 hover:bg-[#E2533E] hover:text-white text-[10px] font-bold cursor-pointer transition-all"
                  title="Adds a list item highlighted with solid black bulletin bullets and bold headers"
                >
                  + Bulletin Point
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertMarkup("I n traditional political theory, the town square represented a physical locus...")}
                  className="px-2.5 py-1 bg-white border border-stone-300 hover:bg-[#E2533E] hover:text-white text-[10px] font-bold cursor-pointer transition-all"
                  title="First letter is styled into a premium boxed drop-cap character at starting of body blocks"
                >
                  + Drop-Cap Starter
                </button>
              </div>

              {/* Special Editorial Style Press Toolbar Selection Helper (Feature requested by user) */}
              <div className="mb-2 bg-[#F5F8F7] border-2 border-dashed border-[#2C5E5A]/40 p-2.5 flex flex-wrap gap-1.5 items-center">
                <div className="w-full text-[9px] font-mono font-black text-[#2C5E5A] uppercase tracking-wide mb-1 flex items-center gap-1">
                  <span>✦ EDITORIAL TYPE PRESS TOOLBAR:</span>
                  <span className="font-semibold text-stone-500 normal-case">(Highlight any text in the text area below and click a tag helper to style automatically)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("dropcap")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Elegant boxed Drop-cap first-character style"
                  >
                    Drop-cap
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("lead")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Heavy Lead Paragraph bold intro layout block"
                  >
                    Lead Block
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("pullquote")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Centered quoting highlight section block"
                  >
                    Pullquote
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("highlight")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Fluorescent highlighter pen background trace"
                  >
                    Highlighter
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("redink")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Red Lead Ink stamp frame marker"
                  >
                    Red Stamp
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("blueink")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Blue handwritten signatures pen tag"
                  >
                    Blue Sign
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("letterpress")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Traditional hot metal letterpress block engraving"
                  >
                    Letterpress
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("double-underline")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Custom double underline editorial focus text"
                  >
                    Double Line
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("carbon")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Siloed carbon sheet monospace typeface"
                  >
                    Carbon copy
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("smallcaps")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Drawn in small capital letters"
                  >
                    Smallcaps
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("sidenote")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="In-line margin note section"
                  >
                    Sidenote
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("glowing")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Pulsating radar highlight frame"
                  >
                    Radar Pulse
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("tealink")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Elegant teal italicized link style"
                  >
                    Teal Ink
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("gothichero")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Bold medieval gothic block text"
                  >
                    Gothic Block
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("marginalia")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Accentuated orange margin memo box"
                  >
                    Marginalia
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("subscriptnotes")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Superscript miniature editorial reference notes"
                  >
                    Memo Subtext
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("goldleaf")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Shining gold embossed layout text"
                  >
                    Gold Leaf
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("strikethrough-red")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Authentic red editorial pen crossing strike"
                  >
                    Red Pen Strike
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("crimson-box")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Clean crimson background summary block"
                  >
                    Crimson Box
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("vintage-italic")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Smooth vintage column reading italics"
                  >
                    Retro Italic
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("stamp-green")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Rotated minty-green ink dispatch stamp"
                  >
                    Green Stamp
                  </button>
                  <button
                    type="button"
                    onClick={() => applyStyleToSelection("classified")}
                    className="px-2 py-0.5 bg-white border border-[#2C5E5A] text-[#2C5E5A] hover:bg-[#2C5E5A] hover:text-white text-[9px] font-bold cursor-pointer transition-all rounded-sm uppercase font-mono"
                    title="Blackened out classified documentation tape block"
                  >
                    Classified
                  </button>
                </div>
              </div>

              <div className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-[#F9F8F6] p-4 flex flex-col pt-12 overflow-y-auto" : ""}`}>
                {isFullscreen && (
                  <button type="button" onClick={() => setIsFullscreen(false)} className="absolute top-4 right-4 px-3 py-1 bg-[#141414] text-white text-xs font-bold font-mono">
                    Close Fullscreen
                  </button>
                )}
                
                <div className="flex justify-between items-center mb-1 bg-[#141414] text-white p-2">
                  <div className="flex gap-2 font-mono text-[10px]">
                    <button type="button" onClick={undo} disabled={undoStack.length === 0} className="px-2 py-1 bg-stone-800 disabled:opacity-50 font-bold uppercase transition-all">Undo (Ctrl+Z)</button>
                    <button type="button" onClick={redo} disabled={redoStack.length === 0} className="px-2 py-1 bg-stone-800 disabled:opacity-50 font-bold uppercase transition-all">Redo (Ctrl+Y)</button>
                    <button type="button" onClick={() => handleContentChange("")} className="px-2 py-1 bg-[#9D3534] disabled:opacity-50 font-bold uppercase transition-all">Clear</button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsFullscreen(!isFullscreen)} className="px-2 py-1 bg-stone-800 font-bold font-mono text-[10px] uppercase transition-all hidden md:block">
                      {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    </button>
                  </div>
                </div>

                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Start writing the political brief here using Markdown structure..."
                  className={`w-full border-2 border-[#141414] p-4 text-sm bg-stone-50 font-mono leading-relaxed text-stone-900 rounded-none focus:outline-none focus:ring-1 focus:ring-[#141414] ${isFullscreen ? "flex-1 min-h-0 resize-none shadow-xl" : "h-96"} selection:bg-[#2C5E5A] selection:text-white caret-[#9D3534]`}
                  required
                />
                
                {/* Status Bar */}
                <div className="flex flex-wrap justify-between items-center bg-[#F0EFED] border-2 border-t-0 border-[#141414] p-2 text-[10px] font-mono whitespace-nowrap text-stone-700">
                  <div className="flex gap-4">
                    <span>{getWordCount()} Words</span>
                    <span>{getCharCount()} Chars</span>
                    <span>~{getEstReadTime()} min read</span>
                  </div>
                  <div>
                     {lastSavedTime ? <span className="text-[#2C5E5A] font-bold">Draft saved at {lastSavedTime.toLocaleTimeString()}</span> : <span>Unsaved Draft</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Checkbox triggers */}
            <div className="flex flex-wrap gap-6 items-center p-4 bg-[#F0EFED] border-2 border-[#141414] rounded-none">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[#E2533E] cursor-pointer"
                />
                <span className="tracking-wide">Pin as Top Featured Story</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDraft}
                  onChange={(e) => setIsDraft(e.target.checked)}
                  className="w-4 h-4 accent-[#E2533E] cursor-pointer"
                />
                <span className="tracking-wide">Keep as CMS Draft (Invisible on Feed)</span>
              </label>
            </div>

            {/* Action trigger button */}
            <div className="pt-4 flex justify-end gap-3 text-[#141414]">
              <button
                type="button"
                onClick={() => { clearForm(); setActiveTab('manage'); }}
                className="px-5 py-2.5 bg-[#F0EFED] border-2 border-[#141414] border-stone-800 hover:bg-stone-100 font-bold uppercase text-xs tracking-wider transition-all rounded-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#E2533E] hover:bg-[#c9412e] border-2 border-[#141414] text-white font-bold uppercase text-xs tracking-wider flex items-center gap-2 shadow-sm hover:shadow-md active:translate-y-0.5 duration-100 cursor-pointer rounded-none"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} /> Saving Database...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingId ? "Apply Content Edits" : "Publish to Bulletin Feed"}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Gemini AI Helper Desk (Right Panel 4cols) */}
          <div className="lg:col-span-12 xl:col-span-4 space-y-6">
            <div className="border-2 border-[#141414] bg-[#FAF7F2] p-5 shadow-md rounded-none relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#E2533E] rotate-45 translate-x-8 -translate-y-8 flex items-center justify-center">
                <Sparkles size={14} className="text-white rotate-45 -translate-x-1.5 translate-y-1" />
              </div>

              <div className="flex items-center gap-2 pb-3.5 border-b-2 border-[#141414] mb-4">
                <Sparkles size={18} className="text-[#E2533E] fill-[#E2533E]" />
                <h4 className="font-serif text-base font-bold text-[#141414] leading-tight">
                  Gemini AI Editorial Assistant
                </h4>
              </div>

              <p className="text-[11px] font-sans text-stone-700 leading-relaxed font-normal mb-4 text-justify">
                Need to jumpstart a deep column analysis of a global trend or YouTube debate? Specify a core topic or paste a political YouTube link. Our integrated Gemini AI endpoint will automatically structure a custom, non-partisan article overview complete with suggested headlines, summary decks, quotes, and deep-dive markdown lists.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1 tracking-wider">
                    Journalism Directive or Topic
                  </label>
                  <textarea
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Geopolitics of solar-to-green-hydrogen corridors in Northern Morocco..."
                    className="w-full border-2 border-[#141414] p-2 text-xs bg-white h-16 focus:outline-none focus:ring-1 focus:ring-[#141414] font-sans leading-relaxed rounded-none text-stone-900"
                    disabled={aiLoading}
                  />
                </div>

                <div className="relative flex items-center justify-center my-2 text-stone-400 text-[10px] select-none font-bold uppercase font-mono">
                  <span className="bg-[#FAF7F2] px-2 z-10">or link video context</span>
                  <span className="absolute w-full h-px bg-black/10 inset-x-0"></span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    YouTube Video URL
                  </label>
                  <input
                    type="url"
                    value={aiYoutubeUrl}
                    onChange={(e) => setAiYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=sS... "
                    className="w-full border-2 border-[#141414] p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#141414] font-mono rounded-none text-stone-900"
                    disabled={aiLoading}
                  />
                </div>

                {aiStatus && (
                  <div className="p-2.5 bg-[#141414] text-white font-mono text-[9px] uppercase leading-relaxed border-2 border-[#141414] font-bold overflow-hidden">
                    <span className="flex items-center gap-1.5 select-none text-[#E2533E]">
                      <RefreshCw size={10} className="animate-spin text-white" />
                      <span className="text-white">{aiStatus}</span>
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGeminiGen}
                  disabled={aiLoading}
                  className="w-full py-2.5 bg-[#141414] hover:bg-stone-800 text-white font-bold uppercase text-xs tracking-wider border-2 border-[#141414] shadow-sm hover:shadow-md active:translate-y-0.5 duration-100 cursor-pointer rounded-none"
                >
                  <Sparkles size={14} className={aiLoading ? "animate-pulse" : ""} />
                  <span>{aiLoading ? "Drafting Editorial Column..." : "Launch Editorial Chief"}</span>
                </button>
              </div>
            </div>

            {/* Live Print Preview Widget */}
            <div className="border-2 border-[#141414] bg-white p-5 shadow-md rounded-none">
              <h4 className="font-mono text-[10px] font-bold uppercase text-[#141414]/70 border-b-2 border-[#141414]/10 pb-2 mb-3.5 flex items-center gap-1.5 select-none tracking-wider">
                <Eye size={13} /> Live Print Layout Preview
              </h4>
              <div className="border-l-4 border-[#E2533E] pl-4 py-1">
                {title ? (
                  <h5 className="font-serif text-lg font-bold text-[#141414] leading-tight mb-2">
                    {title}
                  </h5>
                ) : (
                  <span className="text-stone-350 font-serif italic text-sm">Untitled Article</span>
                )}
                
                <div className="flex gap-2 text-[9px] text-[#2C5E5A] font-mono font-bold uppercase mb-3.5">
                  <span>CAT: {category || "NONE"}</span>
                  <span>•</span>
                  <span>TIME: {readTime || "0"} MIN</span>
                  <span>•</span>
                  <span className="text-[#9D3534]">Author: {author}</span>
                </div>

                <p className="text-xs font-serif font-black underline mb-3 text-[#141414] uppercase tracking-wide text-[9px]">
                  ✧ Executive Deck (Summary):
                </p>
                <p className="text-xs font-sans text-stone-600 mb-5 leading-relaxed font-normal italic">
                  {summary || "No description provided."}
                </p>

                <p className="text-xs font-serif font-black underline mb-3 text-[#141414] uppercase tracking-wide text-[9px]">
                  ✧ Live Column Typography Proof:
                </p>
                
                {/* Live formatted design preview */}
                <div className="border border-[#141414]/15 bg-stone-50/50 p-3 mb-4 max-h-[250px] overflow-y-auto">
                  {(() => {
                    if (!content) return <p className="text-[11px] text-stone-400 font-mono italic">Start typing the Markdown body to preview columns.</p>;
                    const blocks = content.split("\n\n").map(p => p.trim()).filter(Boolean);
                    let isFirstParagraph = true;

                    return blocks.map((block, pIdx) => {
                      if (block.startsWith("### ")) {
                        return (
                          <h6 key={pIdx} className="font-serif text-xs font-black mt-3 mb-1.5 border-b border-[#141414]/30 pb-1 text-[#141414]">
                            {block.replace("### ", "")}
                          </h6>
                        );
                      } else if (block.startsWith("> ")) {
                        return (
                          <blockquote key={pIdx} className="border-l-2 border-[#9D3534] pl-2.5 py-0.5 my-2.5 font-serif italic text-[11px] text-stone-700 bg-stone-100/50 pr-2">
                            {block.replace("> ", "")}
                          </blockquote>
                        );
                      } else if (block.startsWith("* ") || block.startsWith("- ") || block.startsWith("1. ") || block.includes("\n* ") || block.includes("\n- ")) {
                        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
                        return (
                          <ul key={pIdx} className="space-y-1.5 my-2.5 font-sans text-[11px] text-stone-850">
                            {lines.map((line, lIdx) => {
                              const cleaned = line.replace(/^(\*|-|\d+\.)\s+/, "").trim();
                              const boldMatch = cleaned.match(/^\*\*(.*?)\*\*(.*)/);
                              if (boldMatch) {
                                return (
                                  <li key={lIdx} className="relative pl-3.5">
                                    <span className="absolute left-0.5 top-1.5 w-1 h-1 bg-[#141414] rounded-full"></span>
                                    <strong className="font-bold text-stone-900">{boldMatch[1]}</strong>
                                    {boldMatch[2]}
                                  </li>
                                );
                              }
                              return (
                                <li key={lIdx} className="relative pl-3.5">
                                  <span className="absolute left-0.5 top-1.5 w-1 h-1 bg-[#141414] rounded-full"></span>
                                  {cleaned}
                                </li>
                              );
                            })}
                          </ul>
                        );
                      } else {
                        const isShort = block.length < 80;
                        const hasCustomTag = block.startsWith("[") && block.includes("]");

                        if (isFirstParagraph && !isShort && !hasCustomTag) {
                          isFirstParagraph = false;
                          const letter = block.charAt(0);
                          const remainder = block.slice(1);
                          return (
                            <p key={pIdx} className="text-[11px] font-serif leading-relaxed text-[#141414] mb-2 text-justify">
                              <span className="float-left text-xl font-serif font-black mr-1 mt-0.5 px-1 py-0.2 border border-[#141414] bg-[#FAF8F5] leading-none">
                                {letter}
                              </span>
                              {parseEditorialTags(remainder)}
                            </p>
                          );
                        }
                        if (hasCustomTag) {
                          isFirstParagraph = false;
                        }
                        return (
                          <div key={pIdx} className={`text-[11px] ${isShort ? 'font-serif italic text-stone-500/90 pl-2 border-l-2 border-[#141414]/20 mb-2' : 'font-sans text-stone-750 mb-2'} leading-relaxed`}>
                            {parseEditorialTags(block)}
                          </div>
                        );
                      }
                    });
                  })()}
                </div>

                {imageUrls.filter(Boolean).length > 0 && (
                  <div className="mt-3.5">
                    <p className="text-xs font-serif font-black underline mb-2 text-[#141414] uppercase tracking-wide text-[9px]">
                      ✧ Photographic Brief Proofs ({imageUrls.filter(Boolean).length} links noted):
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {imageUrls.filter(Boolean).map((trimmed, idx) => {
                        return (
                          <div key={idx} className="border border-[#141414] p-0.5 bg-white aspect-square overflow-hidden">
                            <img 
                              src={trimmed} 
                              alt="preview" 
                              className="w-full h-full object-cover" 
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
