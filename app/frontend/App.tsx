import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button } from './src/components/Button';
import StatusMessage from './src/components/StatusMessage';
import GroundingFiles from './src/components/GroundingFiles';
import GroundingFileView from './src/components/GroundingFileView';
import { GroundingFile, ToolResult } from './src/types';

// Import hooks
import useRealtime from './src/hooks/useRealtime';
import useAudioRecorder from './src/hooks/useAudioRecorder';
import useAudioPlayer from './src/hooks/useAudioPlayer';

// Import i18n configuration
import './src/locales/i18n';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [groundingFiles, setGroundingFiles] = useState<GroundingFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GroundingFile | null>(null);
  
  const { t } = useTranslation();

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
      console.log("Response completed");
    },
    onReceivedResponseAudioTranscriptDelta: (message) => {
      console.log("Audio transcript:", message);
    },
    onReceivedInputAudioTranscriptionCompleted: (message) => {
      console.log("Input transcription completed:", message);
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
        
        // Stop audio recording
        await stopAudioRecording();
        
        // Stop audio player immediately
        stopAudioPlayer();
        
        // Force disconnect WebSocket to stop AI immediately
        forceDisconnect();
        
        // Clear grounding files for fresh start
        setGroundingFiles([]);
        setSelectedFile(null);
        
        console.log('Recording session stopped and conversation ended');
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandText}>SchoolMe</Text>
        {/* Connection indicator */}
        <View style={[styles.connectionIndicator, isConnected ? styles.connected : styles.disconnected]}>
          <Text style={styles.connectionText}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('app.title')}</Text>
          <Text style={styles.subtitle}>
            Your AI-powered learning companion. Ask questions, explore topics, and learn through natural conversation.
          </Text>
        </View>

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

        {/* Grounding Files */}
        <GroundingFiles 
          files={groundingFiles} 
          onFileSelected={setSelectedFile} 
        />
      </View>

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
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 72 : 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
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