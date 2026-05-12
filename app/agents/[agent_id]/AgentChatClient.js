"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

const STORAGE_KEY = "muapi_key";

/**
 * AgentChatClient — Refactored to bypass the missing local 'ai-agent' package.
 * Renders a clean, high-end native workspace UI for streaming your agent configurations.
 */
export default function AgentChatClient({ agentDetails, initialHistory, userData }) {
  const interceptorRef = useRef(null);
  const [messages, setMessages] = useState(initialHistory || []);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  console.log("[AgentChatClient] Rendering Studio UX", { 
    hasAgentDetails: !!agentDetails, 
    hasHistory: !!initialHistory, 
    hasUserData: !!userData 
  });

  // Keep the original API key routing logic intact
  useEffect(() => {
    const getKey = () => {
      if (typeof window === "undefined") return null;
      const fromStorage = localStorage.getItem(STORAGE_KEY);
      if (fromStorage) return fromStorage;
      const match = document.cookie.match(/muapi_key=([^;]+)/);
      return match ? match[1] : null;
    };

    const apiKey = getKey();
    if (!apiKey) return;

    interceptorRef.current = axios.interceptors.request.use((config) => {
      const isRelative = config.url.startsWith("/") || !config.url.startsWith("http");
      const isInternalProxy = config.url.includes('/api/app') || config.url.includes('/api/workflow') || config.url.includes('/api/agents') || config.url.includes('/api/api') || config.url.includes('/api/v1');
      
      if (isRelative || isInternalProxy) {
        config.headers["x-api-key"] = apiKey;
      }
      return config;
    });

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.request.eject(interceptorRef.current);
      }
    };
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);

    try {
      // Trigger execution pipeline hitting your proxy API routing
      const response = await axios.post("/api/agents/chat", {
        agentId: agentDetails?.id,
        message: input,
        history: messages
      });

      if (response.data?.text) {
        setMessages((prev) => [...prev, { role: "assistant", text: response.data.text }]);
      }
    } catch (error) {
      console.error("Pipeline generation failed:", error);
      setMessages((prev) => [...prev, { role: "assistant", text: "Generation failed. Verify your Muapi configuration key status." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 font-sans text-zinc-200">
      {/* Top Workspace Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
            Studio Instance: <span className="text-zinc-100 font-mono lowercase">{agentDetails?.name || "default-agent"}</span>
          </h1>
        </div>
        <div className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded">
          BAL: ${(userData?.balance || 0).toFixed(2)}
        </div>
      </header>

      {/* Main Generation Streams Window */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 max-w-4xl w-full mx-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 pt-20">
            <p className="text-zinc-500 font-mono text-sm">SYSTEM READY // INTERFACE INITIALIZED</p>
            <p className="text-xs text-zinc-600 max-w-xs">Send a prompt execution below to initialize the cinematic pipeline models.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-2xl px-4 py-3 rounded-xl text-sm leading-relaxed ${
                msg.role === "user" 
                  ? "bg-zinc-100 text-zinc-950 font-medium rounded-tr-none" 
                  : "bg-zinc-900 border border-zinc-850 text-zinc-200 rounded-tl-none"
              }`}>
                {msg.text || msg.content}
              </div>
            </div>
          ))
        )}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-850 text-zinc-400 text-xs font-mono px-4 py-3 rounded-xl rounded-tl-none flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
              RENDERING PIPELINE OUTPUT...
            </div>
          </div>
        )}
      </div>

      {/* Persistent Bottom Console Input */}
      <div className="border-t border-zinc-900 bg-zinc-950 p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isGenerating}
            placeholder={isGenerating ? "Processing runtime generation..." : "Execute prompt pipeline..."}
            className="flex-1 bg-zinc-900 border border-zinc-850 text-zinc-100 text-sm placeholder-zinc-600 px-4 py-3.5 rounded-xl outline-none focus:border-zinc-700 transition-colors disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isGenerating || !input.trim()}
            className="bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider px-5 py-3.5 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-40 disabled:hover:bg-zinc-100"
          >
            Run
          </button>
        </form>
      </div>
    </div>
  );
}
