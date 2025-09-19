import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatTranscriptProps {
  messages: ChatMessage[];
  isVisible: boolean;
}

const ChatTranscript: React.FC<ChatTranscriptProps> = ({ messages, isVisible }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isVisible) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🎙️</div>
          <p className="text-gray-400 text-sm">Start a conversation</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-2">💬</div>
          <p className="text-gray-400 text-sm">Your conversation will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages - mobile chat style */}
      <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-6 sm:py-4 space-y-3">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] sm:max-w-[70%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              {/* Message bubble */}
              <div
                className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-700 text-gray-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm sm:text-base leading-relaxed">
                  {message.content}
                </p>
              </div>
              
              {/* Timestamp and sender */}
              <div className={`flex items-center gap-2 mt-1 px-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <span className="text-xs text-gray-500">
                  {message.role === 'user' ? 'You' : 'SchoolMe'}
                </span>
                <span className="text-xs text-gray-500">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatTranscript;
