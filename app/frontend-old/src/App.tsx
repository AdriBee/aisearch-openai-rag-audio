import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { GroundingFiles } from "@/components/ui/grounding-files";
import GroundingFileView from "@/components/ui/grounding-file-view";
import StatusMessage from "@/components/ui/status-message";
import ChatTranscript from "@/components/ui/chat-transcript";

import useRealTime from "@/hooks/useRealtime";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useAudioPlayer from "@/hooks/useAudioPlayer";

import { GroundingFile, ToolResult, ChatMessage } from "./types";

// Removed Azure logo import

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [groundingFiles, setGroundingFiles] = useState<GroundingFile[]>([
        // Demo grounding file to show layout
        {
            id: 'demo-file-1',
            name: 'Northwind_Standard_Benefits_Details.pdf',
            content: 'Demo content for the benefits document...'
        }
    ]);
    const [selectedFile, setSelectedFile] = useState<GroundingFile | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        // Demo messages to show the layout - remove in production
        {
            id: 'demo-1',
            role: 'assistant',
            content: 'Hello! I\'m SchoolMe, your AI learning companion. I can help you with questions about your benefits, company policies, and more. What would you like to know?',
            timestamp: new Date(Date.now() - 120000)
        },
        {
            id: 'demo-2',
            role: 'user',
            content: 'What health insurance options do I have?',
            timestamp: new Date(Date.now() - 60000)
        },
        {
            id: 'demo-3',
            role: 'assistant',
            content: 'Contoso offers a basic health plan called Northwind Standard, which covers medical, vision, and dental services. There\'s also a premium option available.',
            timestamp: new Date()
        }
    ]);

    const { startSession, addUserAudio, inputAudioBufferClear } = useRealTime({
        onWebSocketOpen: () => console.log("WebSocket connection opened"),
        onWebSocketClose: () => console.log("WebSocket connection closed"),
        onWebSocketError: event => console.error("WebSocket error:", event),
        onReceivedError: message => console.error("error", message),
        onReceivedResponseAudioDelta: message => {
            isRecording && playAudio(message.delta);
        },
        onReceivedInputAudioBufferSpeechStarted: () => {
            stopAudioPlayer();
        },
        onReceivedExtensionMiddleTierToolResponse: message => {
            const result: ToolResult = JSON.parse(message.tool_result);

            const files: GroundingFile[] = result.sources.map(x => {
                return { id: x.chunk_id, name: x.title, content: x.chunk };
            });

            setGroundingFiles(prev => [...prev, ...files]);
        },
        onReceivedInputAudioTranscriptionCompleted: message => {
            // Add user message to chat
            const userMessage: ChatMessage = {
                id: message.item_id,
                role: 'user',
                content: message.transcript,
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, userMessage]);
        },
        onReceivedResponseDone: message => {
            // Add assistant response to chat
            const assistantContent = message.response.output
                .flatMap(item => item.content || [])
                .filter(content => content.type === 'text')
                .map(content => content.transcript)
                .join(' ');
            
            if (assistantContent.trim()) {
                const assistantMessage: ChatMessage = {
                    id: message.response.id,
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: new Date()
                };
                setChatMessages(prev => [...prev, assistantMessage]);
            }
        }
    });

    const { reset: resetAudioPlayer, play: playAudio, stop: stopAudioPlayer } = useAudioPlayer();
    const { start: startAudioRecording, stop: stopAudioRecording } = useAudioRecorder({ onAudioRecorded: addUserAudio });

    const onToggleListening = async () => {
        if (!isRecording) {
            startSession();
            await startAudioRecording();
            resetAudioPlayer();

            setIsRecording(true);
        } else {
            await stopAudioRecording();
            stopAudioPlayer();
            inputAudioBufferClear();

            setIsRecording(false);
        }
    };

    const { t } = useTranslation();

    return (
        <div className="flex h-screen flex-col bg-black text-white overflow-hidden">
            {/* Mobile: Ultra-minimal header, Desktop: Normal header */}
            <header className="flex-shrink-0 px-2 py-1 sm:px-6 sm:py-4 border-b border-gray-800 sm:border-none">
                <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-2xl font-medium text-white">SchoolMe</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-green-400">●</span>
                        <span className="text-xs text-gray-400 sm:hidden">Connected</span>
                    </div>
                </div>
            </header>

            {/* Mobile-first layout: Chat takes priority */}
            <main className="flex flex-col flex-1 min-h-0">
                {/* Chat area - 80% of screen on mobile */}
                <div className="flex-1 min-h-0 flex flex-col px-2 sm:px-6">
                    <ChatTranscript 
                        messages={chatMessages} 
                        isVisible={true}
                    />
                </div>

                {/* Bottom controls - minimal on mobile */}
                <div className="flex-shrink-0 bg-gray-900 border-t border-gray-700 p-2 sm:p-4">
                    {/* Recording button - always visible */}
                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                        <Button
                            onClick={onToggleListening}
                            className={`h-8 sm:h-16 w-32 sm:w-72 text-xs sm:text-lg font-medium rounded-md sm:rounded-2xl border transform transition-all duration-200 active:scale-95 sm:hover:scale-105 touch-manipulation ${
                                isRecording 
                                    ? "bg-red-600 hover:bg-red-700 active:bg-red-800 border-red-500 text-white" 
                                    : "bg-white hover:bg-gray-100 active:bg-gray-200 border-white text-black"
                            }`}
                            aria-label={isRecording ? t("app.stopRecording") : t("app.startRecording")}
                        >
                            {isRecording ? (
                                <>
                                    <MicOff className="mr-1 h-3 w-3 sm:h-6 sm:w-6" />
                                    <span className="truncate text-xs sm:text-base">Stop</span>
                                </>
                            ) : (
                                <>
                                    <Mic className="mr-1 h-3 w-3 sm:h-7 sm:w-7" />
                                    <span className="truncate text-xs sm:text-base">Start</span>
                                </>
                            )}
                        </Button>
                        
                        {/* Status - very compact on mobile */}
                        <div className="sm:hidden">
                            <StatusMessage isRecording={isRecording} />
                        </div>
                    </div>

                    {/* Grounding Files - horizontal scroll on mobile */}
                    {groundingFiles.length > 0 && (
                        <div className="mt-2 sm:mt-4">
                            <div className="text-xs text-gray-400 mb-1 sm:hidden">Sources:</div>
                            <div className="flex gap-1 overflow-x-auto pb-1 sm:justify-center">
                                {groundingFiles.map((file, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedFile(file)}
                                        className="flex-shrink-0 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs hover:bg-gray-700 active:bg-gray-600"
                                    >
                                        {file.name.length > 12 ? `${file.name.slice(0, 12)}...` : file.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Desktop-only elements */}
                <div className="hidden sm:block">
                    <div className="text-center py-4">
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
                            {t("app.title")}
                        </h1>
                        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
                            Your AI-powered learning companion. Ask questions, explore topics, and learn through natural conversation.
                        </p>
                    </div>
                    <StatusMessage isRecording={isRecording} />
                    <GroundingFiles files={groundingFiles} onSelected={setSelectedFile} />
                </div>
            </main>

            {/* Desktop footer */}
            <footer className="hidden sm:block flex-shrink-0 py-6 text-center">
                <p className="text-gray-400 text-sm">{t("app.footer")}</p>
            </footer>

            <GroundingFileView groundingFile={selectedFile} onClosed={() => setSelectedFile(null)} />
        </div>
    );
}

export default App;
