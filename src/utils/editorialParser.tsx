import React from "react";

export function parseEditorialTags(text: string): React.ReactNode {
  if (!text) return "";

  // Known tag patterns
  const tagRegex = /\[(dropcap|lead|pullquote|highlight|redink|letterpress|double-underline|carbon|smallcaps|sidenote|glowing|blueink|tealink|gothichero|marginalia|subscriptnotes|goldleaf|strikethrough-red|crimson-box|vintage-italic|stamp-green|classified)\]([\s\S]*?)\[\/\1\]/g;
  
  const nodes: React.ReactNode[] = [];
  const lastIndexRef = { current: 0 };
  let match;
  
  const pushUnmatched = (matchIndex: number) => {
    if (matchIndex > lastIndexRef.current) {
      nodes.push(...parseBoldMarkdown(text.substring(lastIndexRef.current, matchIndex)));
    }
  };

  while ((match = tagRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    pushUnmatched(matchIndex);
    
    const tagName = match[1];
    const innerContent = match[2];
    
    // Translate tag to styled element
    const key = `tag-${matchIndex}`;
    switch (tagName) {
      case "dropcap":
        nodes.push(
          <span key={key} className="float-left text-5xl md:text-6xl font-black mr-2.5 mt-1 px-3 pb-1 border-2 border-current bg-black/5 leading-none font-serif select-none md:h-14">
            {innerContent}
          </span>
        );
        break;
      case "lead":
        nodes.push(
          <span key={key} className="font-serif text-lg md:text-xl font-bold leading-relaxed text-current block my-3 border-l-4 border-current pl-3 select-text">
            {innerContent}
          </span>
        );
        break;
      case "pullquote":
        nodes.push(
          <span key={key} className="block border-t-2 border-b-2 border-current my-6 py-4 px-6 text-center font-serif italic text-lg md:text-2xl text-[#9D3534] bg-stone-100/10 dark:bg-stone-900/20">
            “{innerContent}”
          </span>
        );
        break;
      case "highlight":
        nodes.push(
          <span key={key} className="bg-yellow-250 dark:bg-yellow-900/40 text-black dark:text-stone-100 px-1.5 py-0.5 font-bold font-sans">
            {innerContent}
          </span>
        );
        break;
      case "redink":
        nodes.push(
          <span key={key} className="text-[#9D3534] font-black tracking-wide border border-[#9D3534] px-1.5 py-0.5 bg-[#9D3534]/5 text-xs font-mono uppercase inline-block my-1 rounded-none shadow-[2px_2px_0px_#9D3534]">
            {innerContent}
          </span>
        );
        break;
      case "letterpress":
        nodes.push(
          <span key={key} className="text-current shadow-sm opacity-90 tracking-tight font-serif uppercase font-bold text-sm bg-stone-200/50 dark:bg-stone-800/50 px-2 py-1 border border-current/10">
            {innerContent}
          </span>
        );
        break;
      case "double-underline":
        nodes.push(
          <span key={key} className="border-b-[3px] border-double border-current pb-0.5 font-black">
            {innerContent}
          </span>
        );
        break;
      case "carbon":
        nodes.push(
          <code key={key} className="bg-stone-150 dark:bg-stone-900 border border-current/15 px-1.5 py-0.5 font-mono text-xs text-[#9D3534] dark:text-[#ff7f7f] inline-block rounded-none font-semibold">
            {innerContent}
          </code>
        );
        break;
      case "smallcaps":
        nodes.push(
          <span key={key} className="font-mono text-[10px] uppercase font-bold bg-current/5 border border-current/15 px-1.5 py-0.5 tracking-wider">
            {innerContent}
          </span>
        );
        break;
      case "sidenote":
        nodes.push(
          <span key={key} className="block border-l-2 border-[#2C5E5A] bg-stone-50 dark:bg-stone-900 pl-4 py-2 my-4 text-xs font-mono text-stone-600 dark:text-stone-300">
            ✧ NOTE RECORD: {innerContent}
          </span>
        );
        break;
      case "glowing":
        nodes.push(
          <span key={key} className="border border-amber-500 bg-amber-400/10 px-2.5 py-1 text-xs rounded-none leading-none font-mono animate-pulse text-amber-700 dark:text-amber-400 inline-block font-bold">
            {innerContent}
          </span>
        );
        break;
      case "blueink":
        nodes.push(
          <span key={key} className="text-[#0047AB] dark:text-[#6495ED] font-serif italic text-sm font-semibold border-b border-[#0047AB]/30 underline decoration-wavy decoration-[#0047AB]">
            {innerContent}
          </span>
        );
        break;
      case "tealink":
        nodes.push(
          <span key={key} className="text-[#1e615e] dark:text-[#42a39f] font-serif italic border-b border-dotted border-[#1e615e] dark:border-[#42a39f]">
            {innerContent}
          </span>
        );
        break;
      case "gothichero":
        nodes.push(
          <span key={key} className="font-serif font-black tracking-widest uppercase bg-neutral-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-2 py-0.5 text-[11px] inline-block rounded-none font-medium">
            {innerContent}
          </span>
        );
        break;
      case "marginalia":
        nodes.push(
          <span key={key} className="block border-l-2 border-orange-500 bg-orange-500/5 dark:bg-orange-500/10 pl-3 py-1.5 my-3 text-[11px] font-sans text-stone-600 dark:text-stone-300">
            {innerContent}
          </span>
        );
        break;
      case "subscriptnotes":
        nodes.push(
          <span key={key} className="text-[10px] align-super text-stone-500 dark:text-stone-400 font-mono italic">
            {innerContent}
          </span>
        );
        break;
      case "goldleaf":
        nodes.push(
          <span key={key} className="text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-600 dark:border-amber-400 px-1 rounded-sm font-black text-xs font-serif uppercase tracking-wider">
            {innerContent}
          </span>
        );
        break;
      case "strikethrough-red":
        nodes.push(
          <span key={key} className="line-through decoration-[#9D3534] decoration-2 text-stone-500 font-serif">
            {innerContent}
          </span>
        );
        break;
      case "crimson-box":
        nodes.push(
          <span key={key} className="block p-4 border-2 border-[#9D3534] bg-[#9D3534]/5 my-4 font-serif text-sm text-[#9D3534] dark:text-[#ff7f7f]">
            {innerContent}
          </span>
        );
        break;
      case "vintage-italic":
        nodes.push(
          <span key={key} className="font-serif italic text-lg text-stone-700 dark:text-stone-300 tracking-wide leading-relaxed">
            {innerContent}
          </span>
        );
        break;
      case "stamp-green":
        nodes.push(
          <span key={key} className="text-[#2C5E5A] dark:text-[#44a29a] font-mono border-2 border-dashed border-[#2C5E5A] dark:border-[#44a29a] px-2 py-0.5 rounded-none font-extrabold uppercase text-[10px] inline-block -rotate-2">
            {innerContent}
          </span>
        );
        break;
      case "classified":
        nodes.push(
          <span key={key} className="bg-[#141414] text-white dark:bg-white dark:text-slate-950 font-mono text-[9px] font-black px-1.5 py-0.5 uppercase tracking-widest border border-white">
            {innerContent}
          </span>
        );
        break;
      default:
        nodes.push(innerContent);
    }
    
    lastIndexRef.current = tagRegex.lastIndex;
  }
  
  if (lastIndexRef.current < text.length) {
    nodes.push(...parseBoldMarkdown(text.substring(lastIndexRef.current)));
  }
  
  return <>{nodes}</>;
}

function parseBoldMarkdown(blockText: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;
  
  while ((match = boldRegex.exec(blockText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(blockText.substring(lastIndex, match.index));
    }
    parts.push(
      <strong key={`bold-${match.index}`} className="font-bold text-current">
        {match[1]}
      </strong>
    );
    lastIndex = boldRegex.lastIndex;
  }
  
  if (lastIndex < blockText.length) {
    parts.push(blockText.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [blockText];
}
