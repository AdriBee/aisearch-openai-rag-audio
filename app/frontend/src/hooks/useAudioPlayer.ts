import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
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
        // Mobile implementation - convert base64 PCM to playable audio
        try {
          // Accumulate audio chunks
          audioChunksRef.current.push(base64AudioDelta);
          
          // Convert base64 PCM to WAV format for mobile playback
          const pcmData = atob(base64AudioDelta);
          const pcmBytes = new Uint8Array(pcmData.length);
          for (let i = 0; i < pcmData.length; i++) {
            pcmBytes[i] = pcmData.charCodeAt(i);
          }
          
          // Create a simple WAV header for 24kHz, 16-bit, mono PCM
          const sampleRate = 24000;
          const numChannels = 1;
          const bitsPerSample = 16;
          const dataLength = pcmBytes.length;
          
          const wavHeader = new ArrayBuffer(44);
          const view = new DataView(wavHeader);
          
          // WAV header
          const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
          };
          
          writeString(0, 'RIFF');
          view.setUint32(4, 36 + dataLength, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, numChannels, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
          view.setUint16(32, numChannels * bitsPerSample / 8, true);
          view.setUint16(34, bitsPerSample, true);
          writeString(36, 'data');
          view.setUint32(40, dataLength, true);
          
          // Combine header and data
          const wavData = new Uint8Array(44 + dataLength);
          wavData.set(new Uint8Array(wavHeader), 0);
          wavData.set(pcmBytes, 44);
          
          // Convert to base64 for file writing
          let binary = '';
          for (let i = 0; i < wavData.length; i++) {
            binary += String.fromCharCode(wavData[i]);
          }
          const wavBase64 = btoa(binary);
          
          const audioUri = FileSystem.documentDirectory + `audio_${Date.now()}.wav`;
          
          // Write WAV file
          await FileSystem.writeAsStringAsync(audioUri, wavBase64, {
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

          console.log('Mobile audio playing with WAV conversion...');
        } catch (mobileError) {
          console.error('Mobile audio playback failed:', mobileError);
        }
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
