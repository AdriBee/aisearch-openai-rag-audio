import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Dimensions } from 'react-native';

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
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const isMobile = screenData.width < 768;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Listen for screen size changes
  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  if (!isVisible || messages.length === 0) {
    return null;
  }

  const styles = createStyles(isMobile);

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

const createStyles = (isMobile: boolean) => StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: isMobile ? 8 : 12,
    marginHorizontal: isMobile ? 8 : 16,
    marginVertical: isMobile ? 4 : 8,
    minHeight: isMobile ? 150 : 200,
    maxHeight: isMobile ? 300 : 400,
    borderWidth: 1,
    borderColor: '#333333',
    width: isMobile ? '96%' : '90%',
    alignSelf: 'center',
    flex: 0, // Don't take up all available space
  },
  header: {
    paddingHorizontal: isMobile ? 8 : 16,
    paddingVertical: isMobile ? 6 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerText: {
    color: '#ffffff',
    fontSize: isMobile ? 12 : 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: isMobile ? 8 : 16,
  },
  messageContainer: {
    marginBottom: isMobile ? 8 : 16,
    padding: isMobile ? 8 : 12,
    borderRadius: isMobile ? 12 : 8,
  },
  userMessage: {
    backgroundColor: '#2563eb',
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
    marginBottom: isMobile ? 4 : 8,
  },
  roleName: {
    color: '#ffffff',
    fontSize: isMobile ? 10 : 14,
    fontWeight: '600',
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: isMobile ? 8 : 12,
  },
  messageContent: {
    color: '#e5e7eb',
    fontSize: isMobile ? 12 : 15,
    lineHeight: isMobile ? 16 : 20,
  },
});

export default ChatTranscript;
