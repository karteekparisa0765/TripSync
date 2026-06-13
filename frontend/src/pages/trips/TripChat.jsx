import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  AlertCircle,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Hash,
  ImagePlus,
  MapPin,
  Paperclip,
  Plus,
  RefreshCw,
  Route,
  Search,
  Send,
  Smile,
  Users,
  WalletCards,
  X,
  ArrowDown,
  TrendingUp,
} from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import { Card, PrimaryButton, SecondaryButton } from "../../components/ui";
import { formatDateRange, money } from "../../utils/format";
import { getEntityId } from "../../utils/ids";

const EMOJIS = [
  "\u{1F600}",
  "\u{1F44D}",
  "\u{1F389}",
  "\u{1F4CD}",
  "\u{1F4B8}",
  "\u2708\uFE0F",
  "\u{1F525}",
  "\u2764\uFE0F",
];
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const initials = (name = "Member") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "M";

const relativeTime = (value) => {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

const dayLabel = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const friendlyChatError = (err) => {
  const message = err.response?.data?.message || "Failed to load messages";
  if (err.response?.status === 404 && message === "Route not found")
    return "Chat API is not active. Restart the backend server to load the chat routes.";
  return message;
};

const MessageBody = ({ text, highlight }) => {
  const parts = text.split(URL_REGEX);
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          URL_REGEX.lastIndex = 0;
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 opacity-90 hover:opacity-100"
            >
              {part}
            </a>
          );
        }
        if (highlight && part.toLowerCase().includes(highlight.toLowerCase())) {
          const re = new RegExp(
            `(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
            "ig",
          );
          const segments = part.split(re);
          return (
            <React.Fragment key={i}>
              {segments.map((seg, j) =>
                seg.toLowerCase() === highlight.toLowerCase() ? (
                  <mark
                    key={j}
                    className="rounded bg-yellow-300/70 px-0.5 text-gray-900 dark:bg-yellow-500/40 dark:text-white"
                  >
                    {seg}
                  </mark>
                ) : (
                  <React.Fragment key={j}>{seg}</React.Fragment>
                ),
              )}
            </React.Fragment>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </p>
  );
};

const Avatar = ({ name, mine, size = "md" }) => {
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sz} ${
        mine
          ? "bg-purple-600 text-white"
          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
      }`}
    >
      {initials(name)}
    </div>
  );
};

const MemberRow = ({ member, creatorId }) => {
  const memberId = getEntityId(member);
  const owner = memberId === creatorId;
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-gray-100 dark:hover:bg-gray-800">
      <div className="relative">
        <Avatar name={member.name} mine={false} />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {member.name}
          </p>
          {owner && (
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-700 dark:bg-purple-950 dark:text-purple-200">
              Owner
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-400">{member.email}</p>
      </div>
    </div>
  );
};

const TripChat = () => {
  const { id, trip, budget } = useOutletContext();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  const currentUserId = getEntityId(user);
  const creatorId = getEntityId(trip.createdBy);

  const fetchMessages = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const { data } = await axiosInstance.get(`/trips/${id}/chat`);
      const next = data.messages || [];
      if (silent && next.length > lastMessageCountRef.current) {
        const container = scrollContainerRef.current;
        const isNearBottom =
          container &&
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
            120;
        if (!isNearBottom)
          setUnreadCount(
            (c) => c + (next.length - lastMessageCountRef.current),
          );
      }
      lastMessageCountRef.current = next.length;
      setMessages(next);
    } catch (err) {
      setError(friendlyChatError(err));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = window.setInterval(
      () => fetchMessages({ silent: true }),
      8000,
    );
    return () => window.clearInterval(interval);
  }, [id]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [loading]);

  // Auto-focus the composer textarea when the Chat tab mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      120;
    setShowJumpToLatest(!isNearBottom);
    if (isNearBottom) setUnreadCount(0);
  };

  const jumpToLatest = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadCount(0);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = [
      attachmentName ? `[Photo: ${attachmentName}]` : "",
      draft.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    if (!content) return;
    setSending(true);
    setError("");
    try {
      const { data } = await axiosInstance.post(`/trips/${id}/chat`, {
        message: content,
      });
      setMessages((current) => [...current, data.message]);
      lastMessageCountRef.current += 1;
      setDraft("");
      setAttachmentName("");
      setEmojiOpen(false);
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    } catch (err) {
      setError(friendlyChatError(err));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleAttachment = (event) => {
    const file = event.target.files?.[0];
    if (file) setAttachmentName(file.name);
    event.target.value = "";
  };

  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.message);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;
    const term = searchTerm.toLowerCase();
    return messages.filter(
      (m) =>
        m.message?.toLowerCase().includes(term) ||
        (m.sender?.name || "").toLowerCase().includes(term),
    );
  }, [messages, searchTerm]);

  const itemsWithDateSeparators = useMemo(() => {
    const items = [];
    let lastDateKey = null;
    filteredMessages.forEach((message) => {
      const dateKey = new Date(message.createdAt).toDateString();
      if (dateKey !== lastDateKey) {
        items.push({
          type: "separator",
          key: `sep-${dateKey}`,
          label: dayLabel(message.createdAt),
        });
        lastDateKey = dateKey;
      }
      items.push({ type: "message", key: message.id, message });
    });
    return items;
  }, [filteredMessages]);

  return (
    <div className="-mt-2">
      {/* Fixed-height card; chat section uses flex-col so the message list can fill and scroll */}
      <Card
        className="overflow-hidden"
        style={{ height: "calc(100vh - 7rem)", minHeight: 680 }}
      >
        <div className="flex h-full flex-col xl:flex-row">
          {/* ── LEFT: Chat column ─────────────────────────────────────────── */}
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-[#0d111c]">
            {/* Header */}
            <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-5 dark:border-gray-800 dark:bg-[#141a29]">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                  <Hash className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-bold text-gray-950 dark:text-white">
                    group-chat
                  </h1>
                  <p className="truncate text-[11px] text-gray-400">
                    Trip coordination &amp; shared decisions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setSearchOpen((v) => !v);
                    if (searchOpen) setSearchTerm("");
                  }}
                  className={`rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    searchOpen
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-gray-400 hover:text-purple-600 dark:hover:text-purple-300"
                  }`}
                  title="Search messages"
                >
                  <Search className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fetchMessages()}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className={`rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    sidebarOpen
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-gray-400 hover:text-purple-600 dark:hover:text-purple-300"
                  }`}
                  title="Toggle sidebar"
                >
                  <Users className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Search bar */}
            {searchOpen && (
              <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-[#141a29]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search messages or people…"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-9 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-[#1b2333] dark:text-white"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchTerm && (
                  <p className="mt-1.5 text-xs text-gray-400">
                    {filteredMessages.length} result
                    {filteredMessages.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="shrink-0 border-b border-red-900/30 bg-red-950/50 px-5 py-2.5 text-sm text-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={() => setError("")}
                    className="text-red-400 hover:text-red-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Scrollable message list ───────────────────────────────── */}
            <div className="relative min-h-0 flex-1">
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-auto scroll-smooth px-4 py-4 sm:px-5"
              >
                {loading ? (
                  <div className="space-y-6">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}
                      >
                        <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
                        <div className="space-y-2">
                          <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                          <div className="h-14 w-64 max-w-[65vw] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full min-h-[300px] items-center justify-center">
                    <div className="max-w-xs text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-500 dark:bg-purple-950 dark:text-purple-300">
                        <Hash className="h-8 w-8" />
                      </div>
                      <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                        Start the conversation
                      </h2>
                      <p className="mt-1.5 text-sm text-gray-400">
                        This is the beginning of #group-chat. Send a message to
                        coordinate your trip.
                      </p>
                    </div>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex h-full min-h-[300px] items-center justify-center">
                    <div className="max-w-xs text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                        <Search className="h-7 w-7 text-gray-400" />
                      </div>
                      <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                        No results
                      </h2>
                      <p className="mt-1 text-sm text-gray-400">
                        Try a different search term.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {itemsWithDateSeparators.map((item, index) => {
                      if (item.type === "separator") {
                        return (
                          <div
                            key={item.key}
                            className="my-5 flex items-center gap-3"
                          >
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                            <span className="rounded-full border border-gray-200 bg-white px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:border-gray-700 dark:bg-[#141a29]">
                              {item.label}
                            </span>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                          </div>
                        );
                      }

                      const message = item.message;
                      const senderId = getEntityId(message.sender);

                      let prevMessage = null;
                      for (let i = index - 1; i >= 0; i--) {
                        if (itemsWithDateSeparators[i].type === "message") {
                          prevMessage = itemsWithDateSeparators[i].message;
                          break;
                        }
                      }

                      const grouped =
                        prevMessage &&
                        getEntityId(prevMessage.sender) === senderId &&
                        new Date(message.createdAt) -
                          new Date(prevMessage.createdAt) <
                          5 * 60 * 1000;

                      const mine = senderId === currentUserId;
                      const senderName = mine
                        ? "You"
                        : message.sender?.name || "Member";
                      const isLast =
                        index === itemsWithDateSeparators.length - 1;
                      const isLastMine = mine && isLast;

                      return (
                        <div
                          key={message.id}
                          className={`group flex items-end gap-2.5 px-1 ${grouped ? "mt-0.5" : "mt-4"} ${mine ? "flex-row-reverse" : "flex-row"}`}
                        >
                          {/* Avatar — show only on first in group */}
                          <div className="w-9 shrink-0">
                            {!grouped && (
                              <Avatar name={senderName} mine={mine} />
                            )}
                          </div>

                          <div
                            className={`flex max-w-[72%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
                          >
                            {/* Name + timestamp */}
                            {!grouped && (
                              <div
                                className={`flex items-baseline gap-2 px-1 ${mine ? "flex-row-reverse" : "flex-row"}`}
                              >
                                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">
                                  {senderName}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {relativeTime(message.createdAt)}
                                </span>
                              </div>
                            )}

                            {/* Bubble + copy */}
                            <div
                              className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : "flex-row"}`}
                            >
                              <div
                                className={`relative rounded-2xl px-4 py-2.5 text-[14px] shadow-sm ${
                                  mine
                                    ? "rounded-br-sm bg-purple-600 text-white"
                                    : "rounded-bl-sm border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-[#1b2333] dark:text-gray-100"
                                }`}
                              >
                                <MessageBody
                                  text={message.message}
                                  highlight={searchTerm}
                                />
                              </div>
                              <button
                                onClick={() => copyMessage(message)}
                                className="mb-1 rounded-md p-1 text-gray-300 opacity-0 transition hover:text-gray-600 group-hover:opacity-100 dark:hover:text-gray-200"
                                title="Copy"
                              >
                                {copiedId === message.id ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>

                            {/* Delivered tick */}
                            {isLastMine && (
                              <span className="flex items-center gap-1 px-1 text-[10px] text-gray-400">
                                <CheckCheck className="h-3 w-3 text-purple-400" />
                                Delivered
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} className="h-1" />
                  </div>
                )}
              </div>

              {/* Jump to latest */}
              {showJumpToLatest && !loading && messages.length > 0 && (
                <button
                  onClick={jumpToLatest}
                  className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-700 active:scale-95"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  {unreadCount > 0
                    ? `${unreadCount} new message${unreadCount > 1 ? "s" : ""}`
                    : "Jump to latest"}
                </button>
              )}
            </div>

            {/* ── Composer ─────────────────────────────────────────────── */}
            <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#141a29]">
              {attachmentName && (
                <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 text-xs text-purple-700 dark:bg-purple-950/60 dark:text-purple-200">
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span className="max-w-[200px] truncate">
                    {attachmentName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachmentName("")}
                    aria-label="Remove attachment"
                    className="rounded p-0.5 hover:bg-purple-200 dark:hover:bg-purple-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <form onSubmit={sendMessage} className="relative">
                {emojiOpen && (
                  <div className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-xl border border-gray-700 bg-[#1b2333] p-2 shadow-2xl">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setDraft((v) => v + emoji);
                          setEmojiOpen(false);
                        }}
                        className="rounded-lg p-2 text-lg transition hover:bg-gray-700"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-1 rounded-2xl border border-gray-200 bg-gray-50 px-2 py-2 transition focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/20 dark:border-gray-700 dark:bg-[#1b2333]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-200 hover:text-purple-600 dark:hover:bg-gray-700 dark:hover:text-purple-300"
                    title="Attach image"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((v) => !v)}
                    className={`rounded-xl p-2 transition hover:bg-gray-200 hover:text-purple-600 dark:hover:bg-gray-700 dark:hover:text-purple-300 ${
                      emojiOpen
                        ? "text-purple-600 dark:text-purple-300"
                        : "text-gray-400"
                    }`}
                    title="Emoji"
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows="1"
                    maxLength={1000}
                    placeholder="Message #group-chat…"
                    className="max-h-32 min-h-[2.25rem] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                  />
                  <span
                    className={`hidden pb-1 text-[10px] sm:block ${draft.length > 900 ? "font-semibold text-red-500" : "text-gray-400"}`}
                  >
                    {draft.length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={sending || (!draft.trim() && !attachmentName)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAttachment}
                  className="hidden"
                />
              </form>
            </footer>
          </section>

          {/* ── RIGHT: Sidebar ────────────────────────────────────────────── */}
          <aside
            className={`relative flex shrink-0 flex-col border-t border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-[#141a29] xl:border-l xl:border-t-0 ${
              sidebarOpen
                ? "w-full xl:w-72"
                : "h-0 w-full overflow-hidden border-t-0 xl:h-auto xl:w-0 xl:overflow-hidden xl:border-l-0"
            }`}
          >
            {/* Drag handle / toggle (desktop only) */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 h-12 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-md transition hover:text-purple-600 dark:border-gray-700 dark:bg-[#1b2333] xl:flex"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-6">
              {/* Members */}
              <section>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-950 dark:text-white">
                      Members
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {trip.members.length} in this trip
                    </p>
                  </div>
                  <Link
                    to="../members"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 transition hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300"
                    title="Invite member"
                  >
                    <Plus className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-3 space-y-0.5">
                  {trip.members.map((member) => (
                    <MemberRow
                      key={getEntityId(member)}
                      member={member}
                      creatorId={creatorId}
                    />
                  ))}
                </div>
                <Link to="../members" className="mt-3 block">
                  <SecondaryButton className="w-full gap-2">
                    <Users className="h-4 w-4" /> Invite Member
                  </SecondaryButton>
                </Link>
              </section>

              {/* Trip Summary */}
              <section className="border-t border-gray-100 pt-5 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-950 dark:text-white">
                  Trip Summary
                </h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatDateRange(trip.startDate, trip.endDate)}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-1">
                  <SummaryStat
                    label="Budget"
                    value={budget.budget > 0 ? money(budget.budget) : "Not set"}
                  />
                  <SummaryStat label="Spent" value={money(budget.spent)} />
                  <SummaryStat
                    label="Remaining"
                    value={money(budget.remaining)}
                    tone="text-emerald-600 dark:text-emerald-300"
                  />
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Budget used
                    </span>
                    <span
                      className={
                        budget.percent > 90 ? "font-semibold text-red-500" : ""
                      }
                    >
                      {budget.percent}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        budget.percent > 90
                          ? "bg-red-500"
                          : budget.percent > 70
                            ? "bg-amber-500"
                            : "bg-purple-600"
                      }`}
                      style={{ width: `${Math.min(budget.percent, 100)}%` }}
                    />
                  </div>
                </div>
              </section>

              {/* Quick Actions */}
              <section className="border-t border-gray-100 pt-5 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-950 dark:text-white">
                  Quick Actions
                </h2>
                <div className="mt-3 space-y-2">
                  <Link to="../expenses" className="block">
                    <PrimaryButton className="w-full gap-2">
                      <WalletCards className="h-4 w-4" /> Add Expense
                    </PrimaryButton>
                  </Link>
                  <Link to="../itinerary" className="block">
                    <SecondaryButton className="w-full gap-2">
                      <MapPin className="h-4 w-4" /> Add Place
                    </SecondaryButton>
                  </Link>
                  <Link to="../itinerary" className="block">
                    <SecondaryButton className="w-full gap-2">
                      <Route className="h-4 w-4" /> Add Plan
                    </SecondaryButton>
                  </Link>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </Card>
    </div>
  );
};

const SummaryStat = ({
  label,
  value,
  tone = "text-gray-950 dark:text-white",
}) => (
  <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#1b2333]">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className={`mt-1 truncate text-sm font-bold ${tone}`}>{value}</p>
  </div>
);

export default TripChat;
