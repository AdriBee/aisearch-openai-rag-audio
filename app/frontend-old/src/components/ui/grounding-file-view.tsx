import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "./button";
import { GroundingFile } from "@/types";

type Properties = {
    groundingFile: GroundingFile | null;
    onClosed: () => void;
};

export default function GroundingFileView({ groundingFile, onClosed }: Properties) {
    return (
        <AnimatePresence>
            {groundingFile && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-0 sm:p-4"
                    onClick={() => onClosed()}
                >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="flex h-full sm:h-[90vh] w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex-col rounded-none sm:rounded-2xl bg-gray-900 border-0 sm:border border-gray-700 shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Fixed header with close button - always visible */}
                    <div className="bg-gray-900 px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between flex-shrink-0 border-b border-gray-700">
                        <h2 className="text-base sm:text-xl font-bold text-white truncate pr-3">{groundingFile.name}</h2>
                        <Button
                            aria-label="Close grounding file view"
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 touch-manipulation flex-shrink-0 h-10 w-10 min-h-[40px] min-w-[40px]"
                            onClick={() => onClosed()}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                    
                    {/* Scrollable content area */}
                    <div className="flex-grow overflow-hidden bg-gray-900">
                        <pre className="h-full overflow-auto text-wrap bg-black m-2 sm:m-4 rounded-lg border border-gray-600 p-3 sm:p-4 text-xs sm:text-sm text-white leading-relaxed">
                            <code>{groundingFile.content}</code>
                        </pre>
                    </div>
                </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
