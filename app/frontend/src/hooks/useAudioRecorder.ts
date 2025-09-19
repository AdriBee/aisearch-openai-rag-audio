import { useCallback, useRef, useState, useEffect } from 'react';
import { 
  useAudioRecorder as useExpoAudioRecorder, 
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioSampleListener
} from 'expo-audio';
import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioRecorder } from '../components/AudioRecorder';

interface UseAudioRecorderProps {
  onAudioRecorded: (audioData: string) => void;
}

export const useAudioRecorder = ({ onAudioRecorded }: UseAudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  
  // For web (AudioWorklet approach)
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef<boolean>(false);
  
  // For native (expo-audio approach)
  const expoRecorder = Platform.OS !== 'web' ? useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY) : null;
  const recorderState = Platform.OS !== 'web' ? useAudioRecorderState(expoRecorder!) : null;
  
  // For expo-av fallback
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      console.log('Checking audio permissions...');
      
      if (Platform.OS === 'web') {
        // On web, we can't check permissions without requesting them
        // So we'll set to null (unknown) and request when needed
        setHasPermission(null);
        setPermissionStatus('unknown');
        console.log('Web platform - permissions will be checked when recording starts');
      } else {
        // On mobile platforms, use expo-audio for permissions
        const permission = await AudioModule.getRecordingPermissionsAsync();
        console.log('Current permission status:', permission);
        
        if (permission.status === 'granted') {
          setHasPermission(true);
          setPermissionStatus('granted');
          await configureAudioMode();
        } else {
          setHasPermission(false);
          setPermissionStatus(permission.status);
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
      setPermissionStatus('error');
    }
  }, []);

  const configureAudioMode = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        console.log('Audio mode configured for recording');
      } else {
        console.log('Web platform - skipping audio mode configuration');
      }
    } catch (error) {
      console.error('Error configuring audio mode:', error);
    }
  }, []);

  // Keep ref in sync to avoid stale closures in audio callbacks
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Set up real-time audio sample listener for expo-audio (native only)
  if (Platform.OS !== 'web' && expoRecorder) {
    useAudioSampleListener(expoRecorder, (sample) => {
      if (!isMutedRef.current && sample.channels.length > 0) {
        // Convert audio sample to base64 for real-time streaming
        const frames = sample.channels[0].frames;
        
        // Convert float frames (-1 to 1) to 16-bit PCM
        const int16Array = new Int16Array(frames.length);
        for (let i = 0; i < frames.length; i++) {
          int16Array[i] = Math.max(-32768, Math.min(32767, frames[i] * 32767));
        }
        
        // Convert to base64
        const uint8Array = new Uint8Array(int16Array.buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);
        
        console.log('Sending real-time audio sample, frames:', frames.length, 'base64 length:', base64Audio.length);
        onAudioRecorded(base64Audio);
      }
    });
  }

  const mute = useCallback(() => {
    try {
      setIsMuted(true);
      // On web, also disable the microphone track to avoid VAD triggering
      if (Platform.OS === 'web' && streamRef.current) {
        streamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
      }
    } catch (e) {
      // no-op
    }
  }, []);

  const unmute = useCallback(() => {
    try {
      setIsMuted(false);
      if (Platform.OS === 'web' && streamRef.current) {
        streamRef.current.getAudioTracks().forEach(t => (t.enabled = true));
      }
    } catch (e) {
      // no-op
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isMutedRef.current) {
      unmute();
    } else {
      mute();
    }
  }, [mute, unmute]);


  const requestPermissions = useCallback(async () => {
    try {
      console.log('Requesting audio permissions...');
      
      // Show user-friendly explanation first
      if (Platform.OS === 'web') {
        // For web, we need to handle browser permissions differently
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Stop immediately, we just wanted permission
          setHasPermission(true);
          setPermissionStatus('granted');
          await configureAudioMode();
          return true;
        } catch (webError) {
          console.error('Web audio permission denied:', webError);
          setHasPermission(false);
          setPermissionStatus('denied');
          Alert.alert(
            'Microphone Access Required',
            'Please allow microphone access in your browser to use voice features. Click the microphone icon in your address bar or check your browser settings.',
            [{ text: 'OK' }]
          );
          return false;
        }
      } else {
        // For mobile platforms, use expo-audio
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        console.log('Permission response:', permission);
        
        if (permission.status === 'granted') {
          setHasPermission(true);
          setPermissionStatus('granted');
          await configureAudioMode();
          console.log('Audio permission granted');
          return true;
        } else {
          setHasPermission(false);
          setPermissionStatus(permission.status);
          console.log('Audio permission denied:', permission.status);
          
          let alertTitle = 'Microphone Permission Required';
          let alertMessage = 'SchoolMe needs microphone access to listen to your questions.';
          
          if (permission.status === 'denied') {
            alertMessage += ' Please go to your device settings and enable microphone access for this app.';
          } else if (permission.canAskAgain) {
            alertMessage += ' Please grant permission when prompted.';
          }
          
          Alert.alert(alertTitle, alertMessage, [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Settings', 
              onPress: () => {
                // On mobile, you might want to open settings
                console.log('Should open settings');
              }
            }
          ]);
          return false;
        }
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setHasPermission(false);
      setPermissionStatus('error');
      Alert.alert(
        'Permission Error',
        'Failed to request microphone permission. Please check your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }, [configureAudioMode]);

  const start = useCallback(async () => {
    try {
      console.log('Starting recording...');
      
      // Always check and request permissions before recording
      if (hasPermission !== true) {
        console.log('Requesting permissions before recording...');
        const granted = await requestPermissions();
        if (!granted) {
          throw new Error('Audio permission not granted');
        }
        
        // Wait a moment for permission to be processed
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (Platform.OS === 'web') {
        // Web implementation using AudioWorklet (same as original app)
        console.log('Starting web recording with AudioWorklet...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          }
        });
        
        streamRef.current = stream;
        
        // Create AudioRecorder with callback to handle PCM data
        const recorder = new AudioRecorder((buffer: Iterable<number>) => {
          // Drop audio chunks while muted
          if (isMutedRef.current) {
            return;
          }
          // Convert Int16Array to base64
          const int16Array = new Int16Array(buffer as ArrayLike<number>);
          const uint8Array = new Uint8Array(int16Array.buffer);
          
          // Convert to base64
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64Audio = btoa(binary);
          
          console.log('Sending PCM audio chunk, samples:', int16Array.length, 'base64 length:', base64Audio.length);
          onAudioRecorded(base64Audio);
        });
        
        await recorder.start(stream);
        audioRecorderRef.current = recorder;
        
      } else {
        // Mobile implementation using expo-audio for real-time streaming
        console.log('Starting mobile recording with expo-audio...');
        
        if (expoRecorder) {
          await expoRecorder.prepareToRecordAsync();
          expoRecorder.record();
          console.log('expo-audio recording started - real-time samples will be streamed');
        } else {
          throw new Error('expo-audio recorder not available');
        }
      }
      
      setIsRecording(true);
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      throw error;
    }
  }, [hasPermission, requestPermissions, onAudioRecorded]);

  const stop = useCallback(async () => {
    try {
      console.log('Stopping recording...');
      
      if (Platform.OS === 'web') {
        // Web implementation
        if (audioRecorderRef.current) {
          await audioRecorderRef.current.stop();
          audioRecorderRef.current = null;
          console.log('Web AudioWorklet recording stopped');
        } else {
          console.log('No web recording to stop');
        }
        
        // Always stop and release the microphone stream
        if (streamRef.current) {
          try {
            streamRef.current.getTracks().forEach(track => {
              track.stop();
              console.log('Stopped microphone track:', track.kind);
            });
            streamRef.current = null;
            console.log('Microphone stream released');
          } catch (e) {
            console.error('Error stopping media tracks:', e);
          }
        }
      } else {
        // Mobile implementation using expo-audio
        if (expoRecorder && recorderState?.isRecording) {
          await expoRecorder.stop();
          console.log('expo-audio recording stopped');
          console.log('Final recording URI:', expoRecorder.uri);
        } else {
          console.log('No expo-audio recording to stop');
        }
      }
      
      setIsRecording(false);
      console.log('Recording stopped successfully');
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
    }
  }, [onAudioRecorded]);

  const cleanup = useCallback(async () => {
    try {
      console.log('Cleaning up audio recorder...');
      
      // Stop recording if active
      if (isRecording) {
        await stop();
      }
      
      // Force release microphone stream on web
      if (Platform.OS === 'web' && streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Force stopped microphone track:', track.kind);
        });
        streamRef.current = null;
        console.log('Microphone stream force released');
      } else if (Platform.OS !== 'web' && expoRecorder && recorderState?.isRecording) {
        // Stop expo-audio recording
        await expoRecorder.stop();
        console.log('expo-audio recording force stopped');
      }
      
      // Reset states
      setIsRecording(false);
      setIsMuted(false);
      
    } catch (error) {
      console.error('Error during audio recorder cleanup:', error);
    }
  }, [isRecording, stop, expoRecorder, recorderState]);

  return {
    start,
    stop,
    cleanup,
    mute,
    unmute,
    toggleMute,
    isMuted,
    isRecording,
    hasPermission,
    permissionStatus,
    requestPermissions,
    checkPermissions,
  };
};

export default useAudioRecorder;
