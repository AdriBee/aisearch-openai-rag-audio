export class AudioPlayer {
    private playbackNode: AudioWorkletNode | null = null;
    private audioContext: AudioContext | null = null;

    async init(sampleRate: number = 24000) {
        try {
            this.audioContext = new AudioContext({ sampleRate });
            
            // Resume audio context if suspended (required for browser autoplay policies)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('AudioContext resumed');
            }
            
            await this.audioContext.audioWorklet.addModule("./audio-playback-worklet.js");

            this.playbackNode = new AudioWorkletNode(this.audioContext, "audio-playback-worklet");
            this.playbackNode.connect(this.audioContext.destination);
            
            console.log('AudioPlayer initialized with sample rate:', sampleRate, 'state:', this.audioContext.state);
        } catch (error) {
            console.error('Error initializing AudioPlayer:', error);
            throw error;
        }
    }

    async play(buffer: Int16Array) {
        if (this.playbackNode && this.audioContext) {
            // Ensure audio context is running
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('AudioContext resumed for playback');
            }
            
            this.playbackNode.port.postMessage(buffer);
            console.log('Playing audio buffer, length:', buffer.length, 'context state:', this.audioContext.state);
        } else {
            console.warn('AudioPlayer not initialized');
        }
    }

    stop() {
        if (this.playbackNode) {
            this.playbackNode.port.postMessage(null);
            console.log('AudioPlayer stopped');
        }
    }

    async close() {
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
            this.playbackNode = null;
            console.log('AudioPlayer closed');
        }
    }
}
