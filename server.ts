import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dns from "dns";

// Initialize Firebase SDK
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { getDatabase, ref as rtdbRef, get as rtdbGet, set as rtdbSet, child as rtdbChild } from "firebase/database";

// Fix for Node ESM directory resolver
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Setup Firestore Error Logger for security diagnostic rules (Firebase Integration Skill)
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: "server-admin",
      email: "server@internal.node"
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Check and load Firebase configuration
const CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");
const LOCAL_POSTS_PATH = path.join(process.cwd(), "local-posts.json");
const LOCAL_URGENT_NEWS_PATH = path.join(process.cwd(), "local-urgent-news.json");

let isFirebaseConfigured = false;
let isRtdbConfigured = false;
let firebaseApp: any = null;
let db: any = null;
let rtdb: any = null;

try {
  if (fs.existsSync(CONFIG_PATH)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    if (
      firebaseConfig &&
      firebaseConfig.projectId &&
      firebaseConfig.projectId !== "remixed-project-id" &&
      !firebaseConfig.projectId.includes("placeholder")
    ) {
      firebaseApp = initializeApp(firebaseConfig);
      db = getFirestore(firebaseApp);
      isFirebaseConfigured = true;
      console.log("Firebase initialized successfully with Project ID:", firebaseConfig.projectId);

      if (firebaseConfig.databaseURL) {
        rtdb = getDatabase(firebaseApp);
        isRtdbConfigured = true;
        console.log("Firebase Realtime Database initialized successfully with URL:", firebaseConfig.databaseURL);
      }
    } else {
      console.log("Firebase is unconfigured or has placeholder credentials. Running in local sandbox mode.");
    }
  } else {
    console.log("firebase-applet-config.json not found. Running in local sandbox mode.");
  }
} catch (error) {
  console.error("Error setting up Firebase SDK, entering local sandbox mode:", error);
}

// Seed Post Generator for beautiful default data
function getSeedPosts() {
  return [
    {
      id: "seed-post-1",
      title: "The Friction of Modern Multi-Alignment",
      slug: "the-friction-of-modern-multi-alignment",
      category: "Foreign Policy",
      author: "Alistair Vance",
      date: new Date().toISOString().split("T")[0],
      readTime: 5,
      isFeatured: true,
      isDraft: false,
      summary: "An inquiry into how contemporary middle powers navigate trade and military alliances in a multi-polar global economy.",
      content: `### The Strategy of Non-Committal Leverage\n\nIn the geopolitical models of the twentieth century, nations were largely forced to pledge fealty to one of two competing absolute power blocs. Today, however, a new breed of diplomatic pragmatism has emerged. Across Southeast Asia, South America, and the Middle East, rising economic engines are pioneering strategies of "multi-alignment."\n\n#### Strategic Commodity Hedging\nThis autonomy is not merely rhetorical; it is backed by concrete resources. Consider the following levers:\n* **The Semiconductor Supply Chain**: Sourcing advanced packaging while hosting foundational silicon fabrication.\n* **The Rare Earth Monopolies**: Negotiating mineral extraction rights on a project-by-project basis.\n* **Capital Sourcing Diversification**: Raising sovereign funds from both Brussels and Beijing synchronously.\n\n> "True sovereignty is no longer purchased through permanent treaties. It is rented through fluid, calculated contracts."\n\n#### Policy Implications\nAs a result, diplomatic efforts must pivot from proposing ideological packages to offering high-value technology transfers and concrete supply guarantees. The future belongs to those who view alliances as dynamic networks rather than static walls.`
    },
    {
      id: "seed-post-2",
      title: "The Rise of Sovereign Ledger Networks",
      slug: "rise-of-sovereign-ledger-networks",
      category: "Economy",
      author: "Clara DuPont",
      date: new Date().toISOString().split("T")[0],
      readTime: 4,
      isFeatured: false,
      isDraft: false,
      summary: "How modern central banks are designing domestic digital ledgers to bypass traditional international correspondent banking systems.",
      content: `### Fragmenting Globality\n\nFor nearly five decades, the SWIFT banking system has acted as the undisputed nervous system of global finance. However, recent sanctions and the weaponization of dollar-denominated financial instruments have accelerated a silent migration toward Sovereign Ledger Networks (SLNs).\n\n#### Direct Clearing Corridors\nSeveral bilateral corridors are currently undergoing trials, removing intermediate correspondent nodes entirely:\n1. **The Euro-Rupee Corridor**: Automating trade settlements for agricultural imports.\n2. **The East Asian Settlement Corridor**: Enabling instant QR-code-based merchant clearing for tourists.\n\n#### Liquidity Risks\nWhile these networks promise immediate clearing times and near-zero fees, they introduce significant liquidity risks. Without deep global market liquidity pools, regional central banks must carry vast balances of exotic currencies, increasing vulnerability to sudden inflationary adjustments.`
    },
    {
      id: "seed-post-3",
      title: "The Algorithm and the Red Tape",
      slug: "algorithm-and-red-tape",
      category: "Society & Tech",
      author: "Julian Rivers",
      date: new Date().toISOString().split("T")[0],
      readTime: 6,
      isFeatured: false,
      isDraft: false,
      summary: "An examination of the struggle to regulate generative artificial intelligence under contrasting continental legal structures.",
      content: `### Regulatory Divergence\n\nAs artificial intelligence capabilities scale exponentially, the legal framework governing its deployment is splitting along traditional lines of continental governance.\n\n* **The Code of Precaution:** The European route, focused on ex-ante categorization of risk, banning specific predictive modeling applications, and imposing mandatory watermarking.\n* **The Code of Optimization:** The North American approach, prioritizing post-hoc liability and intellectual property litigation, allowing the marketplace to dictate safe parameters.\n\n#### The Transatlantic Arbitrage\nTechnology companies are already exploiting these legal divisions, launching high-powered modeling tools in light-touch jurisdictions while withholding advanced capabilities from regulated zones. This arbitrage of intelligence will shape the next decade of capital allocation.`
    }
  ];
}

function getSeedUrgentNews() {
  return [
    { text: "DECOUPLED SANDBOX ONLINE • DYNAMIC RETRO-NEWSPAPER READY TO READ", color: "emerald", style: "pulsing" },
    { text: "LOCAL PREVIEW LOADED • FIRESTORE REAL-TIME SYNCHRONIZATION OPTIONAL", color: "default", style: "normal" },
    { text: "DIGITAL EDITION V1.0.5 • INTEGRATED GEOPOLITICAL CMS OPEN AT BASE", color: "default", style: "normal" }
  ];
}

// 1. Helper function to read posts from Firestore/RTDB with fast timeout fallback
async function readPostsFromFirestore(): Promise<any[]> {
  if (isRtdbConfigured && rtdb) {
    try {
      const dbRef = rtdbRef(rtdb);
      const readPromise = rtdbGet(rtdbChild(dbRef, "posts"));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("RTDB posts read timeout")), 3000)
      );
      const snapshot: any = await Promise.race([readPromise, timeoutPromise]);
      const posts: any[] = [];
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (val && typeof val === "object") {
          Object.keys(val).forEach((key) => {
            posts.push({ id: key, ...val[key] });
          });
        }
      }
      posts.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
      try {
        fs.writeFileSync(LOCAL_POSTS_PATH, JSON.stringify(posts, null, 2), "utf-8");
      } catch (e) {}
      return posts;
    } catch (error) {
      console.error("RTDB error reading posts:", error);
    }
  } else if (isFirebaseConfigured && db) {
    try {
      const docPromise = getDocs(collection(db, "posts"));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore database read timeout")), 3000)
      );
      const querySnapshot = await Promise.race([docPromise, timeoutPromise]);
      const posts: any[] = [];
      querySnapshot.forEach((docSnap) => {
        posts.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by date descending
      posts.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
      
      // Mirror to local file storage for robustness
      try {
        fs.writeFileSync(LOCAL_POSTS_PATH, JSON.stringify(posts, null, 2), "utf-8");
      } catch (e) {
        // Safe skip local write issues
      }
      return posts;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "posts");
    }
  }

  // Local storage fallback
  try {
    if (fs.existsSync(LOCAL_POSTS_PATH)) {
      const data = fs.readFileSync(LOCAL_POSTS_PATH, "utf-8");
      return JSON.parse(data);
    } else {
      const seeds = getSeedPosts();
      fs.writeFileSync(LOCAL_POSTS_PATH, JSON.stringify(seeds, null, 2), "utf-8");
      return seeds;
    }
  } catch (err) {
    console.error("Error reading posts from local fallback data system:", err);
    return getSeedPosts();
  }
}

// 2. Helper to save a single post to Firestore/RTDB & Local File System
async function savePostToFirestore(post: any): Promise<boolean> {
  let savedToFirebase = false;
  if (isRtdbConfigured && rtdb) {
    try {
      const postRef = rtdbRef(rtdb, `posts/${post.id}`);
      const writePromise = rtdbSet(postRef, post);
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("RTDB write timeout")), 3000)
      );
      await Promise.race([writePromise, timeoutPromise]);
      savedToFirebase = true;
    } catch (error) {
      console.error("RTDB error saving post:", error);
    }
  } else if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "posts", post.id);
      const writePromise = setDoc(docRef, post);
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore write timeout")), 3000)
      );
      await Promise.race([writePromise, timeoutPromise]);
      savedToFirebase = true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${post.id}`);
    }
  }

  // Always save locally to ensure decoupled workspace durability
  try {
    let posts = [];
    if (fs.existsSync(LOCAL_POSTS_PATH)) {
      posts = JSON.parse(fs.readFileSync(LOCAL_POSTS_PATH, "utf-8"));
    } else {
      posts = getSeedPosts();
    }

    const idx = posts.findIndex((p: any) => p.id === post.id);
    if (idx !== -1) {
      posts[idx] = post;
    } else {
      posts.push(post);
    }

    posts.sort((a: any, b: any) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });

    fs.writeFileSync(LOCAL_POSTS_PATH, JSON.stringify(posts, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write to local posts file system:", err);
    return savedToFirebase;
  }
}

// 3. Helper to delete a single post from Firestore/RTDB & Local File System
async function deletePostFromFirestore(id: string): Promise<boolean> {
  let deletedFromFirebase = false;
  if (isRtdbConfigured && rtdb) {
    try {
      const postRef = rtdbRef(rtdb, `posts/${id}`);
      const deletePromise = rtdbSet(postRef, null);
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("RTDB delete timeout")), 3000)
      );
      await Promise.race([deletePromise, timeoutPromise]);
      deletedFromFirebase = true;
    } catch (error) {
      console.error("RTDB error deleting post:", error);
    }
  } else if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "posts", id);
      const deletePromise = deleteDoc(docRef);
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore delete timeout")), 3000)
      );
      await Promise.race([deletePromise, timeoutPromise]);
      deletedFromFirebase = true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
    }
  }

  // Maintain local sync deleted state change
  try {
    if (fs.existsSync(LOCAL_POSTS_PATH)) {
      let posts = JSON.parse(fs.readFileSync(LOCAL_POSTS_PATH, "utf-8"));
      posts = posts.filter((p: any) => p.id !== id);
      fs.writeFileSync(LOCAL_POSTS_PATH, JSON.stringify(posts, null, 2), "utf-8");
    }
    return true;
  } catch (err) {
    console.error("Failed to delete post locally:", err);
    return deletedFromFirebase;
  }
}

// 4. Helper function to read urgent news from Firestore/RTDB
async function readUrgentNewsFromFirestore(): Promise<any[]> {
  if (isRtdbConfigured && rtdb) {
    try {
      const dbRef = rtdbRef(rtdb);
      const readPromise = rtdbGet(rtdbChild(dbRef, "urgent_news"));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("RTDB read news timeout")), 3000)
      );
      const snapshot: any = await Promise.race([readPromise, timeoutPromise]);
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list = Array.isArray(val) ? val : (val?.news || []);
        try {
          fs.writeFileSync(LOCAL_URGENT_NEWS_PATH, JSON.stringify(list, null, 2), "utf-8");
        } catch (e) {}
        return list;
      }
    } catch (error) {
      console.error("RTDB error reading urgent news:", error);
    }
  } else if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "settings", "urgent_news");
      const readPromise = getDoc(docRef);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore read timeout")), 3000)
      );
      const docSnap: any = await Promise.race([readPromise, timeoutPromise]);
      if (docSnap.exists()) {
        const list = docSnap.data().news || [];
        try {
          fs.writeFileSync(LOCAL_URGENT_NEWS_PATH, JSON.stringify(list, null, 2), "utf-8");
        } catch (e) {}
        return list;
      }
    } catch (error) {
      console.warn("Error reading urgent news from Firestore, using fallback local file:", error);
    }
  }

  // Local static file parser
  try {
    if (fs.existsSync(LOCAL_URGENT_NEWS_PATH)) {
      const data = fs.readFileSync(LOCAL_URGENT_NEWS_PATH, "utf-8");
      return JSON.parse(data);
    } else {
      const seeds = getSeedUrgentNews();
      fs.writeFileSync(LOCAL_URGENT_NEWS_PATH, JSON.stringify(seeds, null, 2), "utf-8");
      return seeds;
    }
  } catch (err) {
    console.error("Error reading urgent news from file system:", err);
    return getSeedUrgentNews();
  }
}

// 5. Helper to write urgent news to Firestore/RTDB
async function writeUrgentNewsToFirestore(news: any[]): Promise<boolean> {
  let savedToFirebase = false;
  if (isRtdbConfigured && rtdb) {
    try {
      const newsRef = rtdbRef(rtdb, "urgent_news");
      const writePromise = rtdbSet(newsRef, { news });
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("RTDB write news timeout")), 3000)
      );
      await Promise.race([writePromise, timeoutPromise]);
      savedToFirebase = true;
    } catch (error) {
      console.error("RTDB error saving urgent news:", error);
    }
  } else if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "settings", "urgent_news");
      const writePromise = setDoc(docRef, { news });
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore write timeout")), 3000)
      );
      await Promise.race([writePromise, timeoutPromise]);
      savedToFirebase = true;
    } catch (error) {
      console.error("Error writing urgent news to Firestore, using local file system as primary:", error);
    }
  }

  try {
    fs.writeFileSync(LOCAL_URGENT_NEWS_PATH, JSON.stringify(news, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write local news bulletin:", err);
    return savedToFirebase;
  }
}

// Helper function to extract YouTube Video ID from any pasted link or share link
function extractYoutubeId(urlOrId: string | undefined): string | undefined {
  if (!urlOrId) return undefined;
  const trimmed = urlOrId.trim();
  if (!trimmed) return undefined;
  // If it's already an 11-char ID without url separators, keep it
  if (trimmed.length === 11 && !trimmed.includes("/") && !trimmed.includes("?")) {
    return trimmed;
  }
  // Try pattern matching for regular and share links
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return trimmed;
}

// Parse JSON payloads
app.use(express.json());

// --- API ROUTES ---

// 1. Get all posts
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await readPostsFromFirestore();
    res.json(posts);
  } catch (err) {
    console.error("Error in GET /api/posts:", err);
    res.status(500).json({ error: "Failed to fetch posts from live database." });
  }
});

// 2. Create a new post
app.post("/api/posts", async (req, res) => {
  try {
    const { title, summary, content, category, youtubeId, imageUrls, author, readTime, isFeatured, isDraft } = req.body;

    if (!title || !content || !category || !author) {
      return res.status(400).json({ error: "Missing required fields (title, content, category, author)." });
    }

    // Generate unique ID and slug
    const id = Date.now().toString();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    // Extract cleanest YouTube video ID
    const cleanYoutubeId = extractYoutubeId(youtubeId);

    // Convert comma separated list or array to array of clean image urls
    const cleanImageUrls = Array.isArray(imageUrls) 
      ? imageUrls.map((u: any) => String(u).trim()).filter(Boolean)
      : [];

    const newPost = {
      id,
      title,
      slug,
      summary: summary || content.slice(0, 150).replace(/[#*`>]/g, "") + "...",
      category,
      youtubeId: cleanYoutubeId || null,
      imageUrls: cleanImageUrls,
      author,
      date: new Date().toISOString().split("T")[0],
      readTime: Number(readTime) || 3,
      isFeatured: !!isFeatured,
      isDraft: !!isDraft,
      content,
    };

    const posts = await readPostsFromFirestore();

    // If this post is set as featured, unfeature others in Firestore
    if (newPost.isFeatured) {
      for (const p of posts) {
        if (p.isFeatured) {
          p.isFeatured = false;
          await savePostToFirestore(p);
        }
      }
    }

    await savePostToFirestore(newPost);
    res.status(201).json(newPost);
  } catch (err) {
    console.error("Error in POST /api/posts:", err);
    res.status(500).json({ error: "Failed to create post." });
  }
});

// 3. Update an existing post
app.put("/api/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const posts = await readPostsFromFirestore();
    const index = posts.findIndex((p: any) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Post not found." });
    }

    const currentPost = posts[index];
    const { title, summary, content, category, youtubeId, imageUrls, author, readTime, isFeatured, isDraft } = req.body;

    // Generate slug if title changes
    const slug = title
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
      : currentPost.slug;

    const cleanYoutubeId = youtubeId !== undefined ? extractYoutubeId(youtubeId) : currentPost.youtubeId;
    const cleanImageUrls = imageUrls !== undefined 
      ? (Array.isArray(imageUrls) ? imageUrls.map((u: any) => String(u).trim()).filter(Boolean) : []) 
      : currentPost.imageUrls;

    const updatedPost = {
      ...currentPost,
      title: title !== undefined ? title : currentPost.title,
      slug,
      summary: summary !== undefined ? summary : currentPost.summary,
      content: content !== undefined ? content : currentPost.content,
      category: category !== undefined ? category : currentPost.category,
      youtubeId: cleanYoutubeId || null,
      imageUrls: cleanImageUrls,
      author: author !== undefined ? author : currentPost.author,
      readTime: readTime !== undefined ? Number(readTime) : currentPost.readTime,
      isFeatured: isFeatured !== undefined ? !!isFeatured : currentPost.isFeatured,
      isDraft: isDraft !== undefined ? !!isDraft : currentPost.isDraft,
    };

    // If updated post is featured, unfeature others
    if (updatedPost.isFeatured) {
      for (const p of posts) {
        if (p.id !== id && p.isFeatured) {
          p.isFeatured = false;
          await savePostToFirestore(p);
        }
      }
    }

    await savePostToFirestore(updatedPost);
    res.json(updatedPost);
  } catch (err) {
    console.error("Error in PUT /api/posts:", err);
    res.status(500).json({ error: "Failed to update post." });
  }
});

// 4. Delete a post
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const wasDeleted = await deletePostFromFirestore(id);

    if (!wasDeleted) {
      return res.status(404).json({ error: "Post not found." });
    }

    res.json({ success: true, message: `Post with ID ${id} deleted successfully.` });
  } catch (err) {
    console.error("Error in DELETE /api/posts:", err);
    res.status(500).json({ error: "Failed to delete post." });
  }
});

// 5. CMS Stats endpoint
app.get("/api/stats", async (req, res) => {
  try {
    const posts = await readPostsFromFirestore();
    const totalPosts = posts.length;
    const draftsCount = posts.filter((p: any) => p.isDraft).length;
    const publishedCount = totalPosts - draftsCount;
    const totalReadingTime = posts.reduce((acc: number, p: any) => acc + (p.readTime || 3), 0);

    res.json({
      totalPosts,
      publishedCount,
      draftsCount,
      totalReadingTime,
    });
  } catch (err) {
    console.error("Error in GET /api/stats:", err);
    res.status(500).json({ error: "Failed to load database stats." });
  }
});

// 5b. Urgent News management endpoints
app.get("/api/urgent-news", async (req, res) => {
  const news = await readUrgentNewsFromFirestore();
  res.json(news);
});

app.post("/api/urgent-news", async (req, res) => {
  try {
    const { news } = req.body;
    if (!Array.isArray(news)) {
      return res.status(400).json({ error: "Required 'news' field as array." });
    }
    
    const cleanNews = news.map((item: any) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return { text: item.trim(), color: 'default', style: 'normal' };
      }
      return {
        text: String(item.text || "").trim(),
        color: String(item.color || "default").trim(),
        style: String(item.style || "normal").trim()
      };
    }).filter((item: any) => item && item.text);

    await writeUrgentNewsToFirestore(cleanNews);
    res.json({ success: true, news: cleanNews });
  } catch (err) {
    console.error("Error in POST /api/urgent-news:", err);
    res.status(500).json({ error: "Failed to update urgent news." });
  }
});

// Lazy-initialized Gemini Client helper to prevent crashing if key is missing
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured in Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 6. Decoupled AI CMS Assistant - Outline Generator
app.post("/api/cms/suggest-ai", async (req, res) => {
  try {
    const { topic, youtubeUrl } = req.body;
    if (!topic && !youtubeUrl) {
      return res.status(400).json({ error: "Please provide either a topic description or a YouTube Video URL." });
    }

    const ai = getAiClient();
    
    let prompt = "";
    if (youtubeUrl) {
      // Extract youtube ID if possible
      let videoId = youtubeUrl;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = youtubeUrl.match(regExp);
      if (match && match[2].length === 11) {
        videoId = match[2];
      }

      prompt = `Draft a high-quality newspaper-style political editorial analysis based on the YouTube Video with ID "${videoId}" and URL "${youtubeUrl}". 
The theme must be informative, objective, clean, and balanced. Formulate structured arguments, central debate questions, and insightful background context.
Create a compelling, professional headline and a clean summaries suitable for an educated audience.`;
    } else {
      prompt = `Draft a high-quality newspaper-style political editorial analysis or brief about the topic: "${topic}". 
Include balanced commentary, key diplomatic elements, economic ripple effects, historical context, and potential future outlook. 
Create a compelling, professional headline and summaries suitable for an educated audience.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert editorial chief at a premium non-partisan political newspaper like The Economist or Financial Times.
You generate deep, balanced, clean, objective journalism with premium typography structures in Markdown.
Your response MUST be formatted strictly as a single JSON object. Do not include markdown wraps around the JSON block, just return valid JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A compelling, sharp cerebral headline for a political newspaper" },
            summary: { type: Type.STRING, description: "One-sentence executive summary of the geopolitical or policy debate" },
            suggestedContent: { type: Type.STRING, description: "A rich Markdown-formatted article content. Include subtitled sections using Markdown headers (e.g. ### Subheader), bulleted items, and a blockquote highlight detailing the political trade-off." },
            suggestedReadTime: { type: Type.INTEGER, description: "An estimated reading time in minutes (integer between 3 and 10)" },
            analysisPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 3-4 key focal points of analysis or policy friction."
            }
          },
          required: ["title", "summary", "suggestedContent", "suggestedReadTime", "analysisPoints"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response returned from Gemini.");
    }

    const jsonResult = JSON.parse(resultText.trim());
    res.json(jsonResult);
  } catch (error: any) {
    console.error("Gemini suggestion error:", error);
    res.status(500).json({ 
      error: error.message || "An error occurred while generating AI suggestions.",
      fallback: {
        title: "The Friction of Modern Multi-Alignment",
        summary: "An overview of contemporary geopolitical leverage in a split world.",
        suggestedContent: "### Geopolitical Drift\n\nIn the current global architecture, rising superpowers are pioneering 'multi-alignment' strategies rather than joining absolute blocs. Here is how they maneuver:\n\n* **Hedging Autonomy:** Engaging in tech co-investments with major capital groups.\n* **Strategic Commodity Leverage:** Negotiating terms for raw battery components.\n\n> 'Under classical diplomatic theories, middle powers were forced to pledge fealty. Today, autonomy is purchased through fluid, calculated contracts.'",
        suggestedReadTime: 4,
        analysisPoints: ["Hedging global strategies", "Commodity supply leveraging", "Sovereign autonomy pricing"]
      }
    });
  }
});


// --- INTEGRATE VITE DEV SERVER OR SERVE STATIC PRODUCTION FILES ---

async function start() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Express + Vite Dev Server...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite dev server middleware
    app.use(vite.middlewares);
  } else {
    console.log("Serving build-optimized static production files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Politics & Video Blog running at http://localhost:${PORT}`);
  });
}

start();
