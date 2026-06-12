import React, { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MessageCircle, Send } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { ErrorMessage, Spinner } from '../../components/Feedback';
import { Card, EmptyState, PageHeader, PrimaryButton } from '../../components/ui';

const TripChat = () => {
  const { id, trip } = useOutletContext();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  const fetchMessages = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await axiosInstance.get(`/trips/${id}/chat`);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = window.setInterval(() => fetchMessages({ silent: true }), 8000);
    return () => window.clearInterval(interval);
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;

    setSending(true);
    setError('');
    try {
      const { data } = await axiosInstance.post(`/trips/${id}/chat`, { message: draft });
      setMessages((current) => [...current, data.message]);
      setDraft('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Group Chat"
        description={`Coordinate with ${trip.members.length} trip member${trip.members.length !== 1 ? 's' : ''}.`}
      />

      {error && <ErrorMessage message={error} />}

      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-950 dark:text-gray-50">
            <MessageCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
            {trip.name} chat
          </h2>
        </div>

        <div className="h-[52vh] min-h-96 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950 sm:p-6">
          {loading ? (
            <Spinner label="Loading messages..." />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="Start the conversation with plans, reminders, or payment notes."
            />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const senderId = message.sender?.id || message.sender?._id || message.sender;
                const mine = senderId === user?.id;
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-lg px-4 py-3 shadow-sm ${
                        mine
                          ? 'bg-indigo-600 text-white'
                          : 'border border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`text-xs font-semibold ${mine ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {mine ? 'You' : message.sender?.name || 'Member'}
                        </span>
                        <span className={`text-[11px] ${mine ? 'text-indigo-100/80' : 'text-gray-400'}`}>
                          {new Date(message.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="flex flex-col gap-3 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows="2"
            maxLength={1000}
            placeholder="Type a message for the group..."
            className="min-h-12 flex-1 resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <PrimaryButton disabled={sending || !draft.trim()} className="sm:self-end">
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send'}
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
};

export default TripChat;
