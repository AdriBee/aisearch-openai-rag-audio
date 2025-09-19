import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button } from './src/components/Button';
import StatusMessage from './src/components/StatusMessage';
import GroundingFiles from './src/components/GroundingFiles';
import GroundingFileView from './src/components/GroundingFileView';
import ChatTranscript from './src/components/ChatTranscript';
import LoginScreen from './src/components/LoginScreen';
import { GroundingFile, ToolResult, ChatMessage } from './src/types';

// Import hooks
import useRealtime from './src/hooks/useRealtime';
import useAudioRecorder from './src/hooks/useAudioRecorder';
import useAudioPlayer from './src/hooks/useAudioPlayer';

// Import i18n configuration
import './src/locales/i18n';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [groundingFiles, setGroundingFiles] = useState<GroundingFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GroundingFile | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentUserMessage, setCurrentUserMessage] = useState<string>('');
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>('');
  
  const { t } = useTranslation();

  // Check authentication on app load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authStatus = localStorage.getItem('schoolme_authenticated');
      const authTime = localStorage.getItem('schoolme_auth_time');
      
      if (authStatus === 'true' && authTime) {
        // Check if authentication is still valid (24 hours)
        const authAge = Date.now() - parseInt(authTime);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (authAge < maxAge) {
          setIsAuthenticated(true);
        } else {
          // Clear expired authentication
          localStorage.removeItem('schoolme_authenticated');
          localStorage.removeItem('schoolme_auth_time');
        }
      }
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    // End the active session cleanly first
    try {
      console.log('Logging out - cleaning up active session...');
      
      // Clean up audio recording and release microphone
      try {
        await cleanupAudioRecorder();
      } catch (e) {
        console.log('Error cleaning up audio during logout:', e);
      }
      
      // Stop any audio playback
      try {
        stopAudioPlayer();
      } catch (e) {
        console.log('Error stopping audio player during logout:', e);
      }
      
      // Disconnect realtime socket
      try {
        forceDisconnect();
      } catch (e) {
        console.log('Error force disconnecting during logout:', e);
      }
      
    } finally {
      // Clear authentication after session is ended
      if (typeof window !== 'undefined') {
        localStorage.removeItem('schoolme_authenticated');
        localStorage.removeItem('schoolme_auth_time');
      }
      setIsAuthenticated(false);

      // Reset app state
      setIsRecording(false);
      setGroundingFiles([]);
      setSelectedFile(null);
      setChatMessages([]);
      setCurrentUserMessage('');
      setCurrentAssistantMessage('');
      
      console.log('Logout complete - microphone released and session ended');
    }
  };

  // Initialize hooks - order matters for dependencies
  const { reset: resetAudioPlayer, play: playAudio, stop: stopAudioPlayer } = useAudioPlayer();
  
  const { startSession, addUserAudio, inputAudioBufferClear, triggerResponse, closeConnection, forceDisconnect, isConnected } = useRealtime({
    onWebSocketOpen: () => {
      console.log("WebSocket connection opened");
      Alert.alert("Connected", "Connected to SchoolMe AI assistant!");
    },
    onWebSocketClose: () => {
      console.log("WebSocket connection closed");
      setIsRecording(false);
    },
    onWebSocketError: (event) => {
      console.error("WebSocket error:", event);
      Alert.alert("Connection Error", "Failed to connect to SchoolMe AI assistant. Please check your connection.");
      setIsRecording(false);
    },
    onReceivedError: (message) => {
      console.error("Received error:", message);
      console.error("Error details:", JSON.stringify(message, null, 2));
      Alert.alert("Error", `AI Error: ${message.error?.message || 'Unknown error'}`);
    },
    onReceivedResponseAudioDelta: (message) => {
      console.log("Received audio delta, playing...", message.delta?.length || 'no delta');
      playAudio(message.delta);
    },
    onReceivedResponseDone: (message) => {
      console.log("Response completed, current message:", currentAssistantMessage);
      
      // Try to extract any text from the response.done message itself
      let finalText = currentAssistantMessage.trim();
      
      // Check various places where the text might be in the response
      if (!finalText && message.response?.output) {
        for (const output of message.response.output) {
          if (output.content) {
            for (const content of output.content) {
              if (content.transcript) {
                finalText = content.transcript;
                break;
              } else if (content.text) {
                finalText = content.text;
                break;
              }
            }
          }
        }
      }
      
      // Finalize the current assistant message if we have content
      if (finalText) {
        console.log("Adding assistant message:", finalText);
        setChatMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalText,
          timestamp: new Date()
        }]);
        setCurrentAssistantMessage('');
      } else {
        console.log("No assistant text found in response");
      }
    },
    onReceivedResponseAudioTranscriptDelta: (message) => {
      console.log("Audio transcript delta:", message);
      // Accumulate assistant message content from various delta sources
      let deltaText = '';
      
      if (message.delta) {
        deltaText = message.delta;
      } else if (message.text) {
        deltaText = message.text;
      } else if (message.content) {
        deltaText = message.content;
      }
      
      if (deltaText) {
        console.log("Adding delta text:", deltaText);
        setCurrentAssistantMessage(prev => prev + deltaText);
      }
    },
    onReceivedInputAudioTranscriptionCompleted: (message) => {
      console.log("Input transcription completed:", message);
      // Add user message to chat
      if (message.transcript && message.transcript.trim()) {
        setChatMessages(prev => [...prev, {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message.transcript.trim(),
          timestamp: new Date()
        }]);
      }
    },
    onReceivedInputAudioBufferSpeechStarted: () => {
      console.log("Speech started - stopping playback");
      stopAudioPlayer();
    },
    onReceivedExtensionMiddleTierToolResponse: (message) => {
      try {
        console.log("Tool response received, processing...");
        const result: ToolResult = JSON.parse(message.tool_result);
        const files: GroundingFile[] = result.sources.map(x => ({
          id: x.chunk_id,
          name: x.title,
          content: x.chunk
        }));
        setGroundingFiles(prev => [...prev, ...files]);
      } catch (error) {
        console.error("Error parsing tool response:", error);
      }
    }
  });

  const { 
    start: startAudioRecording, 
    stop: stopAudioRecording, 
    cleanup: cleanupAudioRecorder,
    mute: muteMic,
    unmute: unmuteMic,
    toggleMute: toggleMuteMic,
    isMuted,
    hasPermission, 
    permissionStatus,
    requestPermissions: requestAudioPermissions 
  } = useAudioRecorder({ 
    onAudioRecorded: addUserAudio 
  });

  const onToggleListening = async () => {
    try {
      if (!isRecording) {
        console.log('Starting NEW recording session...');
        
        // Clear everything for fresh start
        setGroundingFiles([]);
        setSelectedFile(null);
        setChatMessages([]);
        setCurrentUserMessage('');
        setCurrentAssistantMessage('');
        
        // Check permissions first (but allow web to proceed since we handle it in the recording)
        if (hasPermission === false && Platform.OS !== 'web') {
          Alert.alert(
            "Microphone Permission Required",
            "SchoolMe needs microphone access to listen to your questions. Please grant permission when prompted.",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Grant Permission", 
                onPress: async () => {
                  const granted = await requestAudioPermissions();
                  if (granted) {
                    // Retry starting recording after permission is granted
                    onToggleListening();
                  }
                }
              }
            ]
          );
          return;
        }
        
        // Start WebSocket connection
        startSession();
        
        // Start audio recording
        await startAudioRecording();
        
        // Reset audio player
        resetAudioPlayer();
        
        setIsRecording(true);
        console.log('NEW recording session started');
      } else {
        console.log('Stopping recording session and ending conversation...');
        
        // Immediately stop everything
        setIsRecording(false);
        
        // Clean up audio recording and release microphone
        await cleanupAudioRecorder();
        
        // Stop audio player immediately
        stopAudioPlayer();
        
        // Force disconnect WebSocket to stop AI immediately
        forceDisconnect();
        
        // Clear grounding files for fresh start
        setGroundingFiles([]);
        setSelectedFile(null);
        setChatMessages([]);
        setCurrentUserMessage('');
        setCurrentAssistantMessage('');
        
        console.log('Recording session stopped, microphone released, and conversation ended');
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      
      let errorMessage = "Failed to start recording.";
      if (error.message.includes('permission')) {
        errorMessage = "Microphone permission is required. Please check your browser or device settings.";
      } else if (error.message.includes('NotAllowedError')) {
        errorMessage = "Microphone access was denied. Please allow microphone access and try again.";
      }
      
      Alert.alert("Recording Error", errorMessage);
      setIsRecording(false);
    }
  };

  // Show permission status
  useEffect(() => {
    if (hasPermission === false) {
      Alert.alert(
        "Microphone Permission Required",
        "SchoolMe needs microphone access to listen to your questions. Please grant permission in your device settings.",
        [{ text: "OK" }]
      );
    }
  }, [hasPermission]);

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandText}>SchoolMe</Text>
        
        <View style={styles.headerRight}>
          {/* Connection indicator */}
          <View style={[styles.connectionIndicator, isConnected ? styles.connected : styles.disconnected]}>
            <Text style={styles.connectionText}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </Text>
          </View>
          
          {/* Logout button */}
          <Button onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={20} color="#ffffff" />
          </Button>
        </View>
      </View>

      {/* Main Content */}
      <View style={[styles.mainContent, chatMessages.length > 0 && styles.mainContentWithChat]}>
        {chatMessages.length === 0 && (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t('app.title')}</Text>
            <Text style={styles.subtitle}>
              Your AI-powered learning companion. Ask questions, explore topics, and learn through natural conversation.
            </Text>
          </View>
        )}
        
        {chatMessages.length > 0 && (
          <View style={styles.compactTitleContainer}>
            <Text style={styles.compactTitle}>{t('app.title')}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            onPress={onToggleListening}
            style={[
              styles.mainButton,
              isRecording ? styles.stopButton : styles.startButton
            ]}
            textStyle={[
              styles.buttonText,
              isRecording ? styles.stopButtonText : styles.startButtonText
            ]}
            disabled={false}
          >
            <View style={styles.buttonContent}>
              <MaterialIcons
                name={isRecording ? 'mic-off' : 'mic'}
                size={28}
                color={isRecording ? '#ffffff' : '#000000'}
                style={styles.buttonIcon}
              />
              <Text style={[
                styles.buttonText,
                isRecording ? styles.stopButtonText : styles.startButtonText
              ]}>
                {isRecording ? t('app.stopConversation') : 'Start Learning'}
              </Text>
            </View>
          </Button>
          {isRecording && (
            <View style={{ marginTop: 12 }}>
              <Button
                onPress={toggleMuteMic}
                style={[
                  styles.mainButton,
                  isMuted ? styles.stopButton : styles.startButton
                ]}
                textStyle={[
                  styles.buttonText,
                  isMuted ? styles.stopButtonText : styles.startButtonText
                ]}
              >
                <View style={styles.buttonContent}>
                  <MaterialIcons
                    name={isMuted ? 'mic-off' : 'mic-none'}
                    size={24}
                    color={isMuted ? '#ffffff' : '#000000'}
                    style={styles.buttonIcon}
                  />
                  <Text style={[
                    styles.buttonText,
                    isMuted ? styles.stopButtonText : styles.startButtonText
                  ]}>
                    {isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  </Text>
                </View>
              </Button>
            </View>
          )}
          
          <StatusMessage isRecording={isRecording} />
          
          {/* Permission status */}
          {hasPermission === null && (
            <Text style={styles.permissionText}>
              🎤 Checking microphone permissions...
            </Text>
          )}
          {hasPermission === false && (
            <Text style={styles.permissionText}>
              ⚠️ Microphone permission required - Click "Start Learning" to grant access
            </Text>
          )}
          {hasPermission === true && (
            <Text style={styles.permissionGrantedText}>
              ✅ Microphone ready
            </Text>
          )}
          
          {/* Grounding files count */}
          {groundingFiles.length > 0 && (
            <Text style={styles.groundingText}>
              📚 {groundingFiles.length} reference document{groundingFiles.length > 1 ? 's' : ''} found
            </Text>
          )}
        </View>

        {/* Chat Transcript */}
        <ChatTranscript 
          messages={chatMessages}
          isVisible={chatMessages.length > 0}
        />
      </View>
      
      {/* Grounding Files - Outside main content to prevent overflow */}
      {groundingFiles.length > 0 && (
        <View style={styles.groundingSection}>
          <GroundingFiles 
            files={groundingFiles} 
            onFileSelected={setSelectedFile} 
          />
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('app.footer')}</Text>
      </View>

      {/* Grounding File View Modal */}
      <GroundingFileView 
        file={selectedFile} 
        onClose={() => setSelectedFile(null)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 0,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  connectionIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connected: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  disconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  connectionText: {
    fontSize: 12,
    color: '#ffffff',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  mainContentWithChat: {
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  compactTitleContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 72 : 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  compactTitle: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    color: '#d1d5db',
    textAlign: 'center',
    maxWidth: Platform.OS === 'web' ? 512 : 300,
    lineHeight: Platform.OS === 'web' ? 28 : 24,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainButton: {
    borderWidth: 2,
    transform: [{ scale: 1 }],
  },
  startButton: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  stopButton: {
    backgroundColor: '#dc2626',
    borderColor: '#ef4444',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  startButtonText: {
    color: '#000000',
  },
  stopButtonText: {
    color: '#ffffff',
  },
  permissionText: {
    color: '#fbbf24',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  permissionGrantedText: {
    color: '#10b981',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  groundingText: {
    color: '#10b981',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  groundingSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    maxHeight: 120, // Limit height to prevent taking too much space
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 40,
    minHeight: 40,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});