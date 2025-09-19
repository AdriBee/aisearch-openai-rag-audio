import { useCallback, useRef, useState } from 'react';
import { 
  SessionUpdateCommand, 
  InputAudioBufferAppendCommand, 
  InputAudioBufferClearCommand,
  Message,
  ResponseAudioDelta,
  ExtensionMiddleTierToolResponse
} from '../types';

interface UseRealtimeProps {
  onWebSocketOpen?: () => void;
  onWebSocketClose?: () => void;
  onWebSocketError?: (event: Event) => void;
  onReceivedError?: (message: any) => void;
  onReceivedResponseAudioDelta?: (message: ResponseAudioDelta) => void;
  onReceivedInputAudioBufferSpeechStarted?: () => void;
  onReceivedExtensionMiddleTierToolResponse?: (message: ExtensionMiddleTierToolResponse) => void;
  onReceivedResponseDone?: (message: any) => void;
  onReceivedResponseAudioTranscriptDelta?: (message: any) => void;
  onReceivedInputAudioTranscriptionCompleted?: (message: any) => void;
}

export const useRealtime = (props: UseRealtimeProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const websocketRef = useRef<WebSocket | null>(null);
  
  // WebSocket URL - use relative path for production, localhost for development
  const getWebSocketUrl = () => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      
      // If running on localhost, use the development backend
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'ws://localhost:8765/realtime';
      }
      
      // For production (Azure), use relative WebSocket URL
      return `${protocol}//${host}/realtime`;
    }
    
    // Fallback for non-browser environments
    return 'ws://localhost:8765/realtime';
  };
  
  const BACKEND_URL = getWebSocketUrl();

  const startSession = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      console.log('Current location:', typeof window !== 'undefined' ? window.location.href : 'server-side');
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        props.onWebSocketOpen?.();
        
        // Send session configuration (same as original app)
        const sessionUpdate: SessionUpdateCommand = {
          type: "session.update",
          session: {
            turn_detection: { type: "server_vad" },
            input_audio_transcription: { model: "whisper-1" }
          }
        };
        console.log('Sending session configuration:', sessionUpdate);
        ws.send(JSON.stringify(sessionUpdate));
      };

      ws.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          console.log('Received message:', message.type);
          
          switch (message.type) {
            case 'response.audio.delta':
              props.onReceivedResponseAudioDelta?.(message as ResponseAudioDelta);
              break;
            case 'response.done':
              console.log('Response done received');
              props.onReceivedResponseDone?.(message);
              break;
            case 'response.audio_transcript.delta':
              console.log('Audio transcript delta:', message);
              props.onReceivedResponseAudioTranscriptDelta?.(message);
              break;
            case 'input_audio_buffer.speech_started':
              console.log('Speech started detected');
              props.onReceivedInputAudioBufferSpeechStarted?.();
              break;
            case 'conversation.item.input_audio_transcription.completed':
              console.log('Input transcription completed:', message);
              props.onReceivedInputAudioTranscriptionCompleted?.(message);
              break;
            case 'extension.middle_tier_tool_response':
              console.log('Tool response received');
              props.onReceivedExtensionMiddleTierToolResponse?.(message as ExtensionMiddleTierToolResponse);
              break;
            case 'error':
              console.error('Backend error details:', message);
              props.onReceivedError?.(message);
              break;
            case 'response.text.delta':
              console.log('Text delta:', message);
              props.onReceivedResponseAudioTranscriptDelta?.(message);
              break;
            case 'response.output_item.added':
              console.log('Output item added:', message);
              break;
            case 'response.content_part.added':
              console.log('Content part added:', message);
              break;
            case 'response.text.done':
              console.log('Text done:', message);
              break;
            default:
              console.log('Unhandled message type:', message.type, message);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        props.onWebSocketError?.(event);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        props.onWebSocketClose?.();
        websocketRef.current = null;
      };

      websocketRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [BACKEND_URL, props]);

  const addUserAudio = useCallback((audioData: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      const command: InputAudioBufferAppendCommand = {
        type: "input_audio_buffer.append",
        audio: audioData
      };
      console.log('Sending audio data to backend, length:', audioData.length);
      websocketRef.current.send(JSON.stringify(command));
    } else {
      console.warn('WebSocket not connected, cannot send audio data');
    }
  }, []);

  const inputAudioBufferClear = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      const command: InputAudioBufferClearCommand = {
        type: "input_audio_buffer.clear"
      };
      console.log('Clearing audio buffer');
      websocketRef.current.send(JSON.stringify(command));
    }
  }, []);

  const triggerResponse = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      const command = {
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
          instructions: "You are a helpful AI learning assistant. Respond to the user's question in a clear and educational way."
        }
      };
      console.log('Triggering AI response');
      websocketRef.current.send(JSON.stringify(command));
    }
  }, []);

  const closeConnection = useCallback(() => {
    console.log('Closing WebSocket connection and clearing session...');
    if (websocketRef.current) {
      // Send session clear command before closing
      try {
        const clearCommand = {
          type: "session.update", 
          session: { turn_detection: { type: "none" } }
        };
        websocketRef.current.send(JSON.stringify(clearCommand));
        
        // Force close the connection
        websocketRef.current.close(1000, 'User ended session');
      } catch (error) {
        console.error('Error sending close command:', error);
        // Force close anyway
        websocketRef.current.close();
      }
      
      websocketRef.current = null;
      setIsConnected(false);
      console.log('WebSocket connection closed');
    }
  }, []);

  const forceDisconnect = useCallback(() => {
    console.log('Force disconnecting all audio and WebSocket...');
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return {
    startSession,
    addUserAudio,
    inputAudioBufferClear,
    triggerResponse,
    closeConnection,
    forceDisconnect,
    isConnected
  };
};

export default useRealtime;
