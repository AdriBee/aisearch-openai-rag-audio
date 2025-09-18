import { useCallback, useRef } from 'react';
import { Audio } from 'expo-audio';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { AudioPlayer } from '../components/AudioPlayer';

export const useAudioPlayer = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioChunksRef = useRef<string[]>([]);

  const reset = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        // Web implementation - initialize AudioWorklet player
        if (audioPlayerRef.current) {
          await audioPlayerRef.current.close();
        }
        audioPlayerRef.current = new AudioPlayer();
        await audioPlayerRef.current.init(24000); // Same sample rate as original
        console.log('Web AudioPlayer reset and initialized');
      } else {
        // Mobile implementation
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        console.log('Mobile audio player reset');
      }
      audioChunksRef.current = [];
    } catch (error) {
      console.error('Error resetting audio player:', error);
    }
  }, []);

  const play = useCallback(async (base64AudioDelta: string) => {
    try {
      console.log('Playing audio delta, length:', base64AudioDelta.length);
      
      if (Platform.OS === 'web') {
        // Web implementation using AudioWorklet (same as original app)
        try {
          console.log('Converting base64 audio delta to PCM...');
          
          // Convert base64 to Int16Array (PCM data)
          const binaryString = atob(base64AudioDelta);
          console.log('Binary string length:', binaryString.length);
          
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          console.log('Bytes array length:', bytes.length);
          
          // Convert to Int16Array
          const int16Array = new Int16Array(bytes.buffer);
          console.log('Int16Array length:', int16Array.length);
          
          // Initialize player if not already done
          if (!audioPlayerRef.current) {
            console.log('Initializing AudioPlayer...');
            audioPlayerRef.current = new AudioPlayer();
            await audioPlayerRef.current.init(24000);
            console.log('AudioPlayer initialized for playback');
          }
          
          // Play the PCM data
          console.log('Sending audio to AudioWorklet...');
          await audioPlayerRef.current.play(int16Array);
          console.log('Web audio playing via AudioWorklet, samples:', int16Array.length);
          
        } catch (webError) {
          console.error('Web audio playback failed:', webError);
        }
      } else {
        // Mobile implementation
        // Accumulate audio chunks
        audioChunksRef.current.push(base64AudioDelta);
        
        // For now, we'll play each chunk individually
        // In a production app, you might want to buffer and concatenate chunks
        const audioUri = FileSystem.documentDirectory + `audio_${Date.now()}.wav`;
        
        // Write base64 audio to file
        await FileSystem.writeAsStringAsync(audioUri, base64AudioDelta, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Create and play sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true, volume: 1.0 }
        );

        // Clean up previous sound
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        
        soundRef.current = sound;

        // Clean up the temporary file after playing
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            FileSystem.deleteAsync(audioUri, { idempotent: true });
          }
        });

        console.log('Mobile audio playing...');
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.stop();
          console.log('Web audio playback stopped');
        }
      } else {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        console.log('Mobile audio playback stopped');
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }, []);

  return {
    reset,
    play,
    stop,
  };
};

export default useAudioPlayer;
