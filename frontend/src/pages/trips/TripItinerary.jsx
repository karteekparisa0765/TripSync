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
} from "lucide-react";
import Modal from "../../components/Modal";
import {
  Card,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "../../components/ui";
import axiosInstance from '../../api/axiosInstance';

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

const TripItinerary = () => {
  const { itinerary, bucketList, actions } = useOutletContext();
  const apiOrigin = axiosInstance.defaults.baseURL.replace(/\/api\/?$/, '');
  const photoSrc = (url) => (url?.startsWith('/api') ? `${apiOrigin}${url}` : url);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [modalOpen, setModalOpen] = useState(false);
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Places / bucket-list search state
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [destination, setDestination] = useState((itinerary && itinerary.destination) || '');
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [addingPlaceId, setAddingPlaceId] = useState('');
  const [placeError, setPlaceError] = useState('');

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

  const bucketPlaceIds = useMemo(() => new Set(bucketList.map((item) => item.placeId)), [bucketList]);

  const searchPlaces = async (event) => {
    event?.preventDefault();
    setPlaceError('');
    setPlaces([]);

    if (!destination || !destination.trim()) {
      setPlaceError('Add a destination before searching attractions');
      return;
    }

    setLoadingPlaces(true);
    try {
      const { data } = await axiosInstance.get('/places/search', { params: { destination } });
      setPlaces(data.results || []);
      if ((data.results || []).length === 0) setPlaceError('No suggested attractions found');
    } catch (err) {
      setPlaceError(err.response?.data?.message || 'Failed to search places');
    } finally {
      setLoadingPlaces(false);
    }
  };

  const addPlace = async (place) => {
    setAddingPlaceId(place.placeId);
    setPlaceError('');
    try {
      await actions.addBucketItem(place);
    } catch (err) {
      setPlaceError(err.response?.data?.message || 'Failed to add place');
    } finally {
      setAddingPlaceId('');
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
      {activeTab === "itinerary" &&
        (itinerary?.content ? (
          <Card className="p-6">
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Generated{" "}
              {itinerary.generatedAt
                ? new Date(itinerary.generatedAt).toLocaleString("en-IN")
                : ""}
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-gray-700 dark:text-gray-200">
              {itinerary.content}
            </pre>
          </Card>
        ) : (
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
        ))}

      {/* Bucket list tab */}
      {activeTab === "bucketlist" && (
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bucket list</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">These saved places help shape your itinerary suggestions.</p>
            </div>
            <div>
              <PrimaryButton onClick={() => setPlaceModalOpen(true)}><Plus className="h-4 w-4" /> Add Place</PrimaryButton>
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
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No saved bucket-list places yet. Use the Add Place button to search attractions and improve itinerary suggestions.</p>
          )}

          <Modal open={placeModalOpen} title="Search Attractions" onClose={() => setPlaceModalOpen(false)}>
            <form onSubmit={searchPlaces} className="space-y-4">
              {placeError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{placeError}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Destination" className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
                <PrimaryButton disabled={loadingPlaces}><Search className="h-4 w-4" /> {loadingPlaces ? 'Searching...' : 'Search'}</PrimaryButton>
              </div>
            </form>
            <div className="mt-5 grid max-h-[55vh] grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
              {places.map((place) => (
                <div key={place.placeId} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                  {place.photoUrl ? <img src={photoSrc(place.photoUrl)} alt={place.name} className="h-32 w-full object-cover" /> : <div className="h-32 bg-gray-100 dark:bg-gray-800" />}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-950 dark:text-gray-50">{place.name}</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{place.address}</p>
                    <PrimaryButton className="mt-3 w-full" disabled={bucketPlaceIds.has(place.placeId) || addingPlaceId === place.placeId} onClick={() => addPlace(place)}>
                      {bucketPlaceIds.has(place.placeId) ? 'Saved' : addingPlaceId === place.placeId ? 'Adding...' : 'Add'}
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
