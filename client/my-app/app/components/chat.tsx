'use client';

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ConversationSummary = {
  id: string;
  title?: string | null;
  updatedAt?: string | null;
  docId?: string | null;
};

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatAssistantContent = (content: string) => {
  const escaped = escapeHtml(content);
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br/>");
};

const ChatComponent: React.FC<{ docId?: string }> = ({ docId }) => {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const { getToken, isLoaded, isSignedIn } = useAuth();
  
  const getClerkToken = React.useCallback(async () => {
    const token = await getToken();
    if (!token) {
      throw new Error("Auth token unavailable; please re-authenticate.");
    }
    return token;
  }, [getToken]);

  React.useEffect(() => {
    console.log("Clerk auth state (chat)", { isLoaded, isSignedIn });
  }, [isLoaded, isSignedIn]);

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Upload a PDF on the left, then ask me to summarize or answer questions about it.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(
    null
  );
  const [conversations, setConversations] = React.useState<
    ConversationSummary[]
  >([]);
  const [isLoadingConversations, setIsLoadingConversations] =
    React.useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);

  const loadConversations = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      setIsLoadingConversations(true);
      const token = await getClerkToken();
  
      const response = await fetch(`${apiBaseUrl}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load conversations");
      const data = await response.json();
      setConversations(data?.conversations ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [apiBaseUrl, getClerkToken, isLoaded, isSignedIn]);

  const loadMessages = React.useCallback(
    async (targetConversationId: string) => {
      if (!isLoaded || !isSignedIn) return;
      try {
        setIsLoadingMessages(true);
        const token = await getClerkToken();
        const response = await fetch(
          `${apiBaseUrl}/conversations/${targetConversationId}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) throw new Error("Failed to load messages");
        const data = await response.json();
        const hydrated: ChatMessage[] = (data?.messages ?? []).map(
          (m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })
        );
        setConversationId(targetConversationId);
        setMessages(
          hydrated.length
            ? hydrated
            : [
                {
                  role: "assistant",
                  content:
                    "Upload a PDF on the left, then ask me to summarize or answer questions about it.",
                },
              ]
        );
      } catch (err) {
        console.error(err);
        setError("Could not load conversation messages.");
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [apiBaseUrl, getClerkToken, isLoaded, isSignedIn]
  );

  React.useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // When docId changes, find matching conversation and load messages
  React.useEffect(() => {
    if (!docId) {
      setConversationId(null);
      setMessages([
        {
          role: "assistant",
          content:
            "Select a document from the left to start chatting about it.",
        },
      ]);
      return;
    }
    const loadForDoc = async () => {
      if (!isLoaded || !isSignedIn) return;
      try {
        setIsLoadingMessages(true);
        const token = await getClerkToken();
        const response = await fetch(`${apiBaseUrl}/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load conversations");
        const data = await response.json();
        const convs: ConversationSummary[] = data?.conversations ?? [];
        setConversations(convs);
        const match = convs.find((c) => c.docId === docId);
        if (match) {
          await loadMessages(match.id);
        } else {
          // No conversation yet for this doc; reset messages
          setConversationId(null);
          setMessages([
            {
              role: "assistant",
              content:
                "Ask a question about this document to start a new conversation.",
            },
          ]);
        }
      } catch (err) {
        console.error(err);
        setError("Could not load conversation for this document.");
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadForDoc();
  }, [apiBaseUrl, docId, getClerkToken, isLoaded, isSignedIn, loadMessages]);

  const normalizeMsg = (msg: unknown): string => {
    if (!msg) return "No response received.";
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) {
      return msg
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            return (part as any).text;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    }
    if (typeof msg === "object" && "text" in (msg as any)) {
      return String((msg as any).text);
    }
    return "Unexpected response format.";
  };

  const askQuestion = async () => {
    if (!isLoaded || !isSignedIn) {
      setError("Sign in to ask questions.");
      return;
    }
    if (!docId) {
      setError("Select a document to ask about.");
      return;
    }
    if (!input.trim()) {
      setError("Please enter a question before sending.");
      return;
    }
    setError(null);
    const userQuestion = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userQuestion }]);
    setInput("");
    setIsLoading(true);

    try {
    
      const token = await getClerkToken();
    
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: userQuestion,
          conversationId: conversationId ?? undefined,
          docId,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to fetch answer from server.");
      }

      const data = await response.json();
      const answer = normalizeMsg(data?.msg);
      if (data?.conversationId) {
        setConversationId(data.conversationId);
        loadConversations(); // refresh list with updated timestamp/new convo
      }

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
            console.log(err)
      const message =
        err instanceof Error ? err.message : "Unexpected error occurred.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I ran into an error." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex w-full flex-col gap-4 h-[70vh] max-h-[70vh] min-h-[60vh] overflow-hidden rounded-2xl border border-white/30 bg-white/30 p-6 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-sky-500/15 p-3 text-sky-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            PDF Chat Assistant
          </h3>
          <p className="text-sm text-slate-600">
            Ask about the selected document.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto rounded-xl border border-white/40 bg-white/40 p-4 backdrop-blur">
        {isLoadingMessages && (
          <div className="text-sm text-slate-500">Loading messages…</div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm backdrop-blur",
                msg.role === "user"
                  ? "bg-sky-500/20 text-slate-900 border border-sky-200/70"
                  : "bg-white/70 text-slate-800 border border-white/60"
              )}
            >
              {msg.role === "assistant" ? (
                <div
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: formatAssistantContent(msg.content),
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="sticky bottom-0 left-0 right-0 flex flex-none items-center gap-3 rounded-xl border border-white/30 bg-white/80 p-3 backdrop-blur">
        <Input
          placeholder="Ask me to summarize, explain, or find details..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              askQuestion();
            }
          }}
          className="flex-1 bg-white/70"
        />
        <Button
          onClick={askQuestion}
          disabled={isLoading || !input.trim() || !docId}
          className="min-w-[110px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Ask
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatComponent;
