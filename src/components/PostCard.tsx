import React from "react";
import { Post } from "../types";
import { Youtube, Calendar, ArrowUpRight, User, Clock, AlertCircle } from "lucide-react";

interface PostCardProps {
  key?: React.Key;
  post: Post;
  onClick: () => void;
}

const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  "Foreign Policy": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=600",
  "Domestic Politics": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&q=80&w=600",
  "Economy": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=600",
  "Opinion": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=600",
  "Society & Tech": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600",
};

export default function PostCard({ post, onClick }: PostCardProps) {
  const displayImage = post.imageUrls && post.imageUrls.length > 0 
    ? post.imageUrls[0] 
    : FALLBACK_CATEGORY_IMAGES[post.category] || FALLBACK_CATEGORY_IMAGES["Opinion"];

  return (
    <article
      onClick={onClick}
      className="bg-[#F9F8F6] border-2 border-r-4 border-b-4 border-[#141414] p-5 flex flex-col justify-start cursor-pointer group hover:bg-white hover:border-[#141414] transition-all duration-150 rounded-none relative"
      style={{ contentVisibility: "auto" }}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-[#141414]" />
      
      {/* Category header */}
      <div className="flex justify-between items-end mb-2 pb-1 border-b-2 border-[#141414]">
        <span className="font-sans font-bold text-[10px] uppercase tracking-widest text-[#141414]">
          {post.category}
        </span>
        <div className="flex gap-2 font-mono text-[9px] uppercase tracking-widest text-stone-600 font-bold">
           {post.youtubeId && <span className="text-[#9D3534]">✦ Video</span>}
           {post.isDraft && <span className="bg-[#141414] text-white px-1">DRAFT</span>}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-serif text-2xl font-black text-[#141414] leading-[1.1] mb-2 group-hover:underline decoration-2 underline-offset-4">
        {post.title}
      </h3>

      {/* Dateline */}
      <div className="font-sans text-[10px] uppercase font-bold text-[#141414] mb-3 pb-2 border-b border-[#141414]/30 flex gap-2">
         <span>BY {post.author}</span>
         <span className="text-stone-400">|</span>
         <span className="text-stone-500">{post.readTime} MIN READ</span>
      </div>

      {/* Image */}
      <div className="mb-3 border-2 border-[#141414] aspect-video w-full overflow-hidden filter grayscale contrast-125 sepia-[.2] opacity-90 group-hover:filter-none transition-all duration-300">
        <img 
          src={displayImage} 
          alt={post.title} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover grayscale transition-all duration-500"
          onError={(e) => {
            (e.target as HTMLElement).parentElement!.style.display = "none";
          }}
        />
      </div>

      {/* Excerpt */}
      <p className="font-serif text-stone-800 text-sm leading-relaxed mb-4 line-clamp-4 text-justify">
        <span className="font-black text-xl leading-none float-left mr-1.5 mt-[-2px]">{post.summary ? post.summary.charAt(0) : "T"}</span>
        {post.summary ? post.summary.slice(1) : "he report details the complex maneuverings occurring..."}
      </p>

    </article>
  );
}
