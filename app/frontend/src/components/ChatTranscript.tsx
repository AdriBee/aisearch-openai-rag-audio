import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

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
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  if (!isVisible || messages.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Conversation</Text>
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View 
            key={message.id} 
            style={[
              styles.messageContainer,
              message.role === 'user' ? styles.userMessage : styles.assistantMessage
            ]}
          >
            <View style={styles.messageHeader}>
              <Text style={styles.roleName}>
                {message.role === 'user' ? 'You' : 'SchoolMe'}
              </Text>
              <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
            <Text style={styles.messageContent}>
              {message.content}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    minHeight: 200,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#333333',
    width: '90%',
    alignSelf: 'center',
    flex: 0, // Don't take up all available space
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  userMessage: {
    backgroundColor: '#1f2937',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  assistantMessage: {
    backgroundColor: '#374151',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 12,
  },
  messageContent: {
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 20,
  },
});

export default ChatTranscript;
