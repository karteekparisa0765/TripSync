import React, { useState, useRef, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Route,
  Sparkles,
  Bookmark,
  MessageCircle,
  MapPinned,
  Plus,
  Search,
  Send,
  User,
  Bot,
  Calendar,
  Clock,
  DollarSign,
  List,
  ChevronDown,
  ChevronUp,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Utensils,
  MapPin,
  Layers,
} from "lucide-react";
import Modal from "../../components/Modal";
import {
  Card,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "../../components/ui";
import axiosInstance from "../../api/axiosInstance";

const TABS = [
  { id: "itinerary", label: "Itinerary", icon: Route },
  { id: "bucketlist", label: "Bucket List", icon: Bookmark },
  { id: "assistant", label: "Assistant", icon: MessageCircle },
];

const SUGGESTIONS = [
  "What should we prioritize from our bucket list?",
  "Suggest a relaxed day plan for day 2",
  "Are there any budget concerns in this itinerary?",
];

// ---- Markdown-aware itinerary parsing -------------------------------------

const SECTION_ORDER = [
  "Morning",
  "Breakfast",
  "Afternoon",
  "Lunch",
  "Evening",
  "Dinner",
  "Night",
  "All Day",
];

const SLOT_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
  breakfast: Utensils,
  lunch: Utensils,
  dinner: Utensils,
};

const SLOT_COLORS = {
  morning: {
    glow: "rgba(251,191,36,0.35)",
    text: "text-amber-300",
    bg: "bg-amber-400/15",
  },
  afternoon: {
    glow: "rgba(56,189,248,0.35)",
    text: "text-sky-300",
    bg: "bg-sky-400/15",
  },
  evening: {
    glow: "rgba(244,114,182,0.35)",
    text: "text-pink-300",
    bg: "bg-pink-400/15",
  },
  night: {
    glow: "rgba(129,140,248,0.35)",
    text: "text-indigo-300",
    bg: "bg-indigo-400/15",
  },
  breakfast: {
    glow: "rgba(251,191,36,0.35)",
    text: "text-amber-300",
    bg: "bg-amber-400/15",
  },
  lunch: {
    glow: "rgba(74,222,128,0.35)",
    text: "text-emerald-300",
    bg: "bg-emerald-400/15",
  },
  dinner: {
    glow: "rgba(129,140,248,0.35)",
    text: "text-indigo-300",
    bg: "bg-indigo-400/15",
  },
};

const slotIcon = (slot) => SLOT_ICONS[(slot || "").toLowerCase()] || Clock;
const slotColors = (slot) =>
  SLOT_COLORS[(slot || "").toLowerCase()] || {
    glow: "rgba(124,92,255,0.35)",
    text: "text-indigo-300",
    bg: "bg-indigo-400/15",
  };

// Strips markdown syntax (#, ##, **, leading "- ") from a line/fragment
const stripMd = (text = "") =>
  text
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^[-*]\s*$/, "")
    .trim();

const DAY_HEADER_RE = /^\*{0,2}Day\s*(\d+)\s*[:\-]?\s*(.*?)\*{0,2}$/i;
const SLOT_HEADER_RE =
  /^\*{0,2}(Morning|Afternoon|Evening|Night|Breakfast|Lunch|Dinner)\*{0,2}:?\s*$/i;
const OVERVIEW_HEADER_RE = /^\*{0,2}Overview\*{0,2}:?\s*$/i;
const DAY_BY_DAY_RE = /^#{1,6}\s*Day-by-Day/i;
const SEPARATOR_RE = /^-{3,}$/;

// Detects a leading time-of-day word inside an activity title, e.g.
// "Morning (Arrival & Check-in)" -> { slot: "Morning", title: "Arrival & Check-in" }
const TIME_SLOT_RE =
  /^(Morning|Afternoon|Evening|Night|Breakfast|Lunch|Dinner)\b\s*[:\-]?\s*\(?([^)]*)\)?\s*$/i;

const detectSlotFromTitle = (title = "") => {
  const match = title.match(TIME_SLOT_RE);
  if (!match) return { slot: null, title };
  const slot = match[1];
  const rest = match[2]?.trim();
  return { slot, title: rest || slot };
};

const parseItinerary = (text) => {
  if (!text || !text.trim()) return { title: "", overview: "", days: [] };

  const lines = text.split(/\r?\n/).map((l) => l.trim());

  let title = "";
  let overview = "";
  const days = [];
  let currentDay = null;
  let currentSection = "All Day";
  let mode = "header"; // header -> overview -> days

  for (const line of lines) {
    if (!line) continue;
    if (SEPARATOR_RE.test(line)) continue;
    if (DAY_BY_DAY_RE.test(line)) {
      mode = "days";
      continue;
    }

    if (mode === "header") {
      if (/^#{1,6}\s*/.test(line) && !title) {
        title = stripMd(line);
        continue;
      }
      if (OVERVIEW_HEADER_RE.test(line)) {
        mode = "overview";
      }
      continue;
    }

    if (mode === "overview") {
      if (OVERVIEW_HEADER_RE.test(line)) continue;
      if (DAY_HEADER_RE.test(line)) {
        mode = "days";
      } else {
        overview += (overview ? " " : "") + stripMd(line);
        continue;
      }
    }

    // mode === "days"
    const dayMatch = line.match(DAY_HEADER_RE);
    if (dayMatch) {
      currentDay = {
        dayNumber: dayMatch[1],
        dayLabel: `Day ${dayMatch[1]}`,
        daySummary: stripMd(dayMatch[2] || ""),
        sections: {},
      };
      days.push(currentDay);
      currentSection = "All Day";
      continue;
    }

    if (!currentDay) continue;

    const slotMatch = line.match(SLOT_HEADER_RE);
    if (slotMatch) {
      currentSection = slotMatch[1];
      if (!currentDay.sections[currentSection])
        currentDay.sections[currentSection] = [];
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const cleaned = stripMd(line);
      let activityTitle = cleaned;
      let description = "";
      const sepMatch = cleaned.match(/ — | – | - (?=[A-Za-z])|: /);
      if (sepMatch) {
        const idx = cleaned.indexOf(sepMatch[0]);
        activityTitle = cleaned.slice(0, idx).trim();
        description = cleaned.slice(idx + sepMatch[0].length).trim();
      }

      // Detect a time-of-day word inside the activity title itself,
      // e.g. "Morning (Arrival & Check-in)" -> slot "Morning"
      const detected = detectSlotFromTitle(activityTitle);
      const slot = detected.slot || currentSection;
      const finalTitle = detected.title;

      if (!currentDay.sections[slot]) currentDay.sections[slot] = [];
      currentDay.sections[slot].push({ title: finalTitle, description });
    } else {
      const cleaned = stripMd(line);
      if (!cleaned) continue;

      // Ignore standalone "All Day" marker lines - they're decorative, not content
      if (/^all\s*day$/i.test(cleaned)) continue;

      if (!currentDay.sections[currentSection])
        currentDay.sections[currentSection] = [];
      const arr = currentDay.sections[currentSection];
      if (arr.length) {
        arr[arr.length - 1].description = arr[arr.length - 1].description
          ? `${arr[arr.length - 1].description} ${cleaned}`
          : cleaned;
      } else {
        arr.push({ title: cleaned, description: "" });
      }
    }
  }

  return { title, overview, days };
};

const orderedSections = (sections = {}) => {
  const ordered = SECTION_ORDER.filter((k) => sections[k]?.length);
  const extra = Object.keys(sections).filter(
    (k) => !SECTION_ORDER.includes(k) && sections[k]?.length,
  );
  return [...ordered, ...extra].map((k) => ({
    timeSlot: k,
    items: sections[k],
  }));
};

// ---- 3D tilt card -----------------------------------------------------------

const TiltCard = ({
  children,
  className = "",
  maxTilt = 6,
  glow = "rgba(124,92,255,0.25)",
  style = {},
}) => {
  const ref = useRef(null);
  const [transform, setTransform] = useState(
    "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
  );
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50, active: false });

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * maxTilt * 2;
    const rotateX = (0.5 - y) * maxTilt * 2;
    setTransform(
      `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015,1.015,1.015)`,
    );
    setGlowPos({ x: x * 100, y: y * 100, active: true });
  };

  const handleMouseLeave = () => {
    setTransform(
      "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
    );
    setGlowPos((p) => ({ ...p, active: false }));
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative will-change-transform transition-transform duration-200 ease-out ${className}`}
      style={{ transform, transformStyle: "preserve-3d", ...style }}
    >
      {/* Glow that follows the cursor */}
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-2xl opacity-0 transition-opacity duration-300"
        style={{
          opacity: glowPos.active ? 1 : 0,
          background: `radial-gradient(220px circle at ${glowPos.x}% ${glowPos.y}%, ${glow}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// -----------------------------------------------------------------------------

// Renders a place photo via our backend proxy, falling back to a placeholder
// block (instead of a broken-image icon) if the photo fails to load — e.g.
// the place has no photo, or the Ola Maps photo request failed.
const PlacePhoto = ({ src, alt, className, fallbackClassName }) => {
  const [failed, setFailed] = useState(false);
  const apiOrigin = axiosInstance.defaults.baseURL.replace(/\/api\/?$/, "");
  const resolvedSrc = src?.startsWith("/api") ? `${apiOrigin}${src}` : src;

  if (!src || failed) {
    return <div className={fallbackClassName || className} />;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

const TripItinerary = () => {
  const { itinerary, bucketList, actions } = useOutletContext();
  const [activeTab, setActiveTab] = useState("itinerary");
  const [modalOpen, setModalOpen] = useState(false);
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Places / bucket-list search state
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [destination, setDestination] = useState(
    (itinerary && itinerary.destination) || "",
  );
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [addingPlaceId, setAddingPlaceId] = useState("");
  const [placeError, setPlaceError] = useState("");
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  // Chat-style assistant state
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content: string }[]
  const [assistantQuery, setAssistantQuery] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeTab === "assistant") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, assistantLoading, activeTab]);

  const generate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await actions.generateItinerary(preferences);
      setModalOpen(false);
      setMessages([]);
      setAssistantError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate itinerary");
    } finally {
      setLoading(false);
    }
  };

  const bucketPlaceIds = useMemo(
    () => new Set(bucketList.map((item) => item.placeId)),
    [bucketList],
  );

  const parsed = useMemo(
    () => parseItinerary(itinerary?.content || ""),
    [itinerary],
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    setSelectedDayIndex(0);
  }, [itinerary?.content]);

  // Stats
  const totalDays = parsed.days.length || 0;
  const savedPlaces = bucketList.length || 0;
  const estimatedBudgetPct = itinerary?.estimatedBudgetPct || 0;
  const totalActivities = useMemo(
    () =>
      parsed.days.reduce(
        (sum, day) =>
          sum +
          Object.values(day.sections).reduce((s, arr) => s + arr.length, 0),
        0,
      ),
    [parsed],
  );

  const [animDays, setAnimDays] = useState(0);
  const [animPlaces, setAnimPlaces] = useState(0);
  const [animBudget, setAnimBudget] = useState(0);

  useEffect(() => {
    let d = 0;
    const id1 = setInterval(() => {
      d++;
      if (d >= totalDays) {
        setAnimDays(totalDays);
        clearInterval(id1);
      } else setAnimDays(d);
    }, 40);
    let p = 0;
    const id2 = setInterval(() => {
      p++;
      if (p >= savedPlaces) {
        setAnimPlaces(savedPlaces);
        clearInterval(id2);
      } else setAnimPlaces(p);
    }, 30);
    let b = 0;
    const id3 = setInterval(() => {
      b++;
      if (b >= estimatedBudgetPct) {
        setAnimBudget(estimatedBudgetPct);
        clearInterval(id3);
      } else setAnimBudget(b);
    }, 20);
    return () => {
      clearInterval(id1);
      clearInterval(id2);
      clearInterval(id3);
    };
  }, [totalDays, savedPlaces, estimatedBudgetPct]);

  const searchPlaces = async (event) => {
    event?.preventDefault();
    setPlaceError("");
    setPlaces([]);

    if (!destination || !destination.trim()) {
      setPlaceError("Add a destination before searching attractions");
      return;
    }

    setLoadingPlaces(true);
    try {
      const { data } = await axiosInstance.get("/places/search", {
        params: { destination },
      });
      setPlaces(data.results || []);
      if ((data.results || []).length === 0)
        setPlaceError("No suggested attractions found");
    } catch (err) {
      setPlaceError(err.response?.data?.message || "Failed to search places");
    } finally {
      setLoadingPlaces(false);
    }
  };

  const addPlace = async (place) => {
    setAddingPlaceId(place.placeId);
    setPlaceError("");
    try {
      await actions.addBucketItem(place);
    } catch (err) {
      setPlaceError(err.response?.data?.message || "Failed to add place");
    } finally {
      setAddingPlaceId("");
    }
  };

  const sendMessage = async (text) => {
    const content = text.trim();
    if (!content || assistantLoading) return;

    setAssistantError("");
    setMessages((prev) => [...prev, { role: "user", content }]);
    setAssistantQuery("");
    setAssistantLoading(true);

    try {
      const answer = await actions.askAssistant(content);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setAssistantError(
        err.response?.data?.message || "Failed to get assistant answer",
      );
    } finally {
      setAssistantLoading(false);
    }
  };

  const askAssistant = (event) => {
    event.preventDefault();
    sendMessage(assistantQuery);
  };

  const selectedDay = parsed.days[selectedDayIndex];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Itinerary"
        description="Generate and keep a day-by-day AI travel plan."
        actions={
          <PrimaryButton onClick={() => setModalOpen(true)}>
            <Sparkles className="h-4 w-4" />{" "}
            {itinerary?.content ? "Regenerate" : "Generate"}
          </PrimaryButton>
        }
      />

      {/* Tab bar */}
      <div className="flex w-fit gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-800/50">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "bucketlist" && bucketList.length > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    isActive
                      ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {bucketList.length}
                </span>
              )}
              {tab.id === "assistant" && messages.length > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Itinerary tab */}
      {activeTab === "itinerary" && (
        <div className="space-y-6">
          {!itinerary?.content ? (
            <EmptyState
              icon={Route}
              title="No itinerary yet"
              description="Generate a plan from your destination, dates, budget, expenses, and saved places."
              action={
                <PrimaryButton onClick={() => setModalOpen(true)}>
                  Generate Itinerary
                </PrimaryButton>
              }
            />
          ) : (
            <>
              {/* Hero card with 3D gradient mesh */}
              <div
                className="relative overflow-hidden rounded-3xl border border-white/5 p-6 shadow-2xl sm:p-8"
                style={{
                  background:
                    "linear-gradient(160deg, #1b1530 0%, #16142b 45%, #0f1322 100%)",
                }}
              >
                {/* Floating gradient orbs for depth */}
                <div
                  className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle, #7C5CFF, transparent 70%)",
                  }}
                />
                <div
                  className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full opacity-30 blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle, #2BCDFF, transparent 70%)",
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                    backgroundSize: "28px 28px",
                  }}
                />

                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                        AI-Generated Trip
                      </p>
                    </div>
                    <h1
                      className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
                      style={{ textShadow: "0 4px 24px rgba(124,92,255,0.35)" }}
                    >
                      {parsed.title || itinerary.title || "Your Trip"}
                    </h1>
                    {(itinerary.destination || itinerary.dates) && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-300">
                        <MapPin className="h-3.5 w-3.5" />
                        {itinerary.destination}
                        {itinerary.destination && itinerary.dates ? " • " : ""}
                        {itinerary.dates}
                      </p>
                    )}

                    {parsed.overview && (
                      <div className="mt-4 max-w-2xl">
                        <p
                          className={`text-sm leading-7 text-gray-300 ${
                            overviewExpanded ? "" : "line-clamp-3"
                          }`}
                        >
                          {parsed.overview}
                        </p>
                        {parsed.overview.length > 180 && (
                          <button
                            type="button"
                            onClick={() => setOverviewExpanded((v) => !v)}
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-300 transition-colors hover:text-indigo-200"
                          >
                            {overviewExpanded ? (
                              <>
                                Show less <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                Read more{" "}
                                <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white shadow-inner">
                        <Calendar className="h-3.5 w-3.5" /> {totalDays} day
                        {totalDays === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white shadow-inner">
                        <List className="h-3.5 w-3.5" /> {totalActivities}{" "}
                        activities
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white shadow-inner">
                        <Bookmark className="h-3.5 w-3.5" /> {savedPlaces} saved
                      </span>
                      {(
                        itinerary.badges || ["Budget Friendly", "Relaxed Pace"]
                      ).map((b, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full border border-indigo-400/20 bg-gradient-to-r from-indigo-500/20 to-cyan-500/10 px-3 py-1 text-xs font-medium text-indigo-200"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 3D stat cards */}
                  <div className="grid w-full grid-cols-3 gap-3 sm:w-auto sm:min-w-[260px] sm:grid-cols-1 lg:w-60">
                    <TiltCard
                      maxTilt={10}
                      glow="rgba(124,92,255,0.4)"
                      className="rounded-2xl"
                    >
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400">
                              Days Planned
                            </p>
                            <p className="mt-1 text-2xl font-bold text-white">
                              {animDays}
                            </p>
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 shadow-[0_0_18px_rgba(124,92,255,0.45)]">
                            <Calendar className="h-5 w-5 text-indigo-300" />
                          </div>
                        </div>
                      </div>
                    </TiltCard>
                    <TiltCard
                      maxTilt={10}
                      glow="rgba(43,205,255,0.4)"
                      className="rounded-2xl"
                    >
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400">
                              Saved Places
                            </p>
                            <p className="mt-1 text-2xl font-bold text-white">
                              {animPlaces}
                            </p>
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 shadow-[0_0_18px_rgba(43,205,255,0.45)]">
                            <MapPinned className="h-5 w-5 text-cyan-300" />
                          </div>
                        </div>
                      </div>
                    </TiltCard>
                    <TiltCard
                      maxTilt={10}
                      glow="rgba(74,222,128,0.4)"
                      className="rounded-2xl"
                    >
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400">
                              Budget Usage
                            </p>
                            <p className="mt-1 text-2xl font-bold text-white">
                              {animBudget}%
                            </p>
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 shadow-[0_0_18px_rgba(74,222,128,0.45)]">
                            <DollarSign className="h-5 w-5 text-emerald-300" />
                          </div>
                        </div>
                      </div>
                    </TiltCard>
                  </div>
                </div>
              </div>

              {/* Day selector + timeline */}
              {parsed.days.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    {/* Day pills with raised "pressed" 3D state */}
                    <div className="flex w-full gap-2 overflow-x-auto pb-2">
                      {parsed.days.map((day, idx) => {
                        const isActive = selectedDayIndex === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedDayIndex(idx)}
                            className={`relative flex-shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                              isActive
                                ? "-translate-y-0.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_10px_25px_rgba(124,92,255,0.45)]"
                                : "bg-white/[0.04] text-gray-300 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:bg-white/[0.08] hover:text-white"
                            }`}
                          >
                            {day.dayLabel}
                          </button>
                        );
                      })}
                    </div>

                    {selectedDay?.daySummary && (
                      <p className="mt-3 text-sm leading-6 text-gray-300">
                        {selectedDay.daySummary}
                      </p>
                    )}

                    <div className="mt-5 space-y-7">
                      {orderedSections(selectedDay?.sections).length === 0 ? (
                        <Card className="p-6">
                          <p className="text-sm text-gray-300">
                            No activities parsed for this day. The AI output may
                            be freeform; try regenerating for a structured
                            itinerary.
                          </p>
                        </Card>
                      ) : (
                        orderedSections(selectedDay.sections).map(
                          (group, gi) => {
                            const Icon = slotIcon(group.timeSlot);
                            const colors = slotColors(group.timeSlot);
                            const showHeader = group.timeSlot !== "All Day";
                            return (
                              <div key={gi}>
                                {showHeader && (
                                  <div className="mb-3 flex items-center gap-2.5">
                                    <span
                                      className={`flex h-7 w-7 items-center justify-center rounded-full ${colors.bg}`}
                                      style={{
                                        boxShadow: `0 0 16px ${colors.glow}`,
                                      }}
                                    >
                                      <Icon
                                        className={`h-3.5 w-3.5 ${colors.text}`}
                                      />
                                    </span>
                                    <h4 className="text-sm font-semibold tracking-wide text-gray-200">
                                      {group.timeSlot}
                                    </h4>
                                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                  </div>
                                )}
                                <div className="space-y-3">
                                  {group.items.map((act, ai) => (
                                    <TiltCard
                                      key={ai}
                                      maxTilt={3}
                                      glow={colors.glow}
                                      className="rounded-xl"
                                    >
                                      <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-colors duration-200 hover:border-white/[0.12]">
                                        {/* Left accent bar */}
                                        <div
                                          className="absolute left-0 top-0 h-full w-1 rounded-r"
                                          style={{
                                            background: `linear-gradient(180deg, ${colors.glow}, transparent)`,
                                          }}
                                        />
                                        <div className="pl-3">
                                          <h5 className="text-sm font-semibold text-white">
                                            {act.title}
                                          </h5>
                                          {act.description && (
                                            <p className="mt-1.5 text-xs leading-6 text-gray-400">
                                              {act.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </TiltCard>
                                  ))}
                                </div>
                              </div>
                            );
                          },
                        )
                      )}
                    </div>
                  </div>

                  {/* Right column: Bucket list preview */}
                  <div>
                    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/15 shadow-[0_0_16px_rgba(124,92,255,0.35)]">
                            <Layers className="h-3.5 w-3.5 text-indigo-300" />
                          </span>
                          <h3 className="text-sm font-semibold text-white">
                            Bucket List
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPlaceModalOpen(true)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_6px_18px_rgba(124,92,255,0.45)] transition-transform hover:scale-105"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {bucketList.slice(0, 5).map((item) => (
                          <TiltCard
                            key={item.id}
                            maxTilt={3}
                            glow="rgba(124,92,255,0.25)"
                            className="rounded-xl"
                          >
                            <div className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] p-3 shadow-[0_4px_14px_rgba(0,0,0,0.3)]">
                              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-700 shadow-inner">
                                <PlacePhoto
                                  src={item.photoUrl}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                  fallbackClassName="h-full w-full bg-gray-700"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">
                                  {item.name}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                  {item.address}
                                </p>
                              </div>
                            </div>
                          </TiltCard>
                        ))}
                        {bucketList.length === 0 && (
                          <p className="text-sm text-gray-400">
                            No saved places yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {parsed.days.length === 0 && (
                <Card className="p-6">
                  <p className="text-sm text-gray-300">
                    Couldn't find day-by-day sections in this itinerary. Try
                    regenerating for a structured plan.
                  </p>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-7 text-gray-400">
                    {itinerary.content}
                  </pre>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Bucket list tab */}
      {activeTab === "bucketlist" && (
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Bucket list
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                These saved places help shape your itinerary suggestions.
              </p>
            </div>
            <div>
              <PrimaryButton onClick={() => setPlaceModalOpen(true)}>
                <Plus className="h-4 w-4" /> Add Place
              </PrimaryButton>
            </div>
          </div>
          {bucketList.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {bucketList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.address || "No address available"}
                  </p>
                  {item.notes && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No saved bucket-list places yet. Use the Add Place button to
              search attractions and improve itinerary suggestions.
            </p>
          )}

          <Modal
            open={placeModalOpen}
            title="Search Attractions"
            onClose={() => setPlaceModalOpen(false)}
          >
            <form onSubmit={searchPlaces} className="space-y-4">
              {placeError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
                  {placeError}
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Destination"
                  className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
                <PrimaryButton disabled={loadingPlaces}>
                  <Search className="h-4 w-4" />{" "}
                  {loadingPlaces ? "Searching..." : "Search"}
                </PrimaryButton>
              </div>
            </form>
            <div className="mt-5 grid max-h-[55vh] grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
              {places.map((place) => (
                <div
                  key={place.placeId}
                  className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <PlacePhoto
                    src={place.photoUrl}
                    alt={place.name}
                    className="h-32 w-full object-cover"
                    fallbackClassName="h-32 bg-gray-100 dark:bg-gray-800"
                  />
                  <div className="p-3">
                    <h3 className="font-medium text-gray-950 dark:text-gray-50">
                      {place.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {place.address}
                    </p>
                    <PrimaryButton
                      className="mt-3 w-full"
                      disabled={
                        bucketPlaceIds.has(place.placeId) ||
                        addingPlaceId === place.placeId
                      }
                      onClick={() => addPlace(place)}
                    >
                      {bucketPlaceIds.has(place.placeId)
                        ? "Saved"
                        : addingPlaceId === place.placeId
                          ? "Adding..."
                          : "Add"}
                    </PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          </Modal>
        </Card>
      )}

      {/* Assistant tab - chat style */}
      {activeTab === "assistant" && (
        <Card className="flex h-[600px] flex-col overflow-hidden p-0">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Trip Assistant
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Ask follow-up questions about the itinerary, bucket list, or trip
              details.
            </p>
          </div>

          {/* Message area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950">
                  <Bot className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  How can I help with your trip?
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Ask anything about your itinerary, bucket list, or budget.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendMessage(suggestion)}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950">
                        <Bot className="h-4 w-4 text-indigo-500" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-7 ${
                        message.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      }`}
                    >
                      <pre className="whitespace-pre-wrap font-sans">
                        {message.content}
                      </pre>
                    </div>
                    {message.role === "user" && (
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <User className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                      </div>
                    )}
                  </div>
                ))}

                {assistantLoading && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950">
                      <Bot className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            {assistantError && (
              <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
                {assistantError}
              </p>
            )}
            <form onSubmit={askAssistant} className="flex items-end gap-2">
              <textarea
                value={assistantQuery}
                onChange={(event) => setAssistantQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(assistantQuery);
                  }
                }}
                rows="1"
                placeholder="Message Trip Assistant..."
                className="flex-1 resize-none rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-gray-700 dark:bg-gray-800"
              />
              <button
                type="submit"
                disabled={assistantLoading || !assistantQuery.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        title="Generate Itinerary"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={generate} className="space-y-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}
          <textarea
            value={preferences}
            onChange={(event) => setPreferences(event.target.value)}
            rows="5"
            placeholder="Optional preferences: relaxed pace, food focus, avoid late nights..."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <PrimaryButton disabled={loading}>
            {loading ? "Generating..." : "Generate Plan"}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
};

export default TripItinerary;
