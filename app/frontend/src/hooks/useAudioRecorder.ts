import { useCallback, useRef, useState, useEffect } from 'react';
import { Audio } from 'expo-audio';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { AudioRecorder } from '../components/AudioRecorder';

interface UseAudioRecorderProps {
  onAudioRecorded: (audioData: string) => void;
}

export const useAudioRecorder = ({ onAudioRecorded }: UseAudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef<boolean>(false);

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
        // On mobile platforms, we can check permissions
        const permission = await Audio.getPermissionsAsync();
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
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
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
        // For mobile platforms
        const permission = await Audio.requestPermissionsAsync();
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
        // Mobile implementation using Expo Audio
        console.log('Starting mobile recording...');
        
        // Stop any existing recording
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
        }

        // Create new recording
        const recording = new Audio.Recording();
        
        // Configure recording options
        const recordingOptions = {
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT,
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
        };

        await recording.prepareToRecordAsync(recordingOptions);
        await recording.startAsync();
        
        recordingRef.current = recording;
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
        // Mobile implementation
        if (!recordingRef.current) {
          console.log('No mobile recording to stop');
          return;
        }

        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        
        if (uri) {
          console.log('Recording saved to:', uri);
          
          // Convert audio file to base64 for WebSocket transmission
          try {
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            console.log('Audio converted to base64, length:', base64Audio.length);
            onAudioRecorded(base64Audio);
          } catch (error) {
            console.error('Error converting audio to base64:', error);
          }
        }
        
        recordingRef.current = null;
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
      }
      
      // Reset states
      setIsRecording(false);
      setIsMuted(false);
      
    } catch (error) {
      console.error('Error during audio recorder cleanup:', error);
    }
  }, [isRecording, stop]);

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
