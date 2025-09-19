import { AnimatePresence, motion, Variants } from "framer-motion";

import { GroundingFile as GroundingFileType } from "@/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import GroundingFile from "./grounding-file";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

type Properties = {
    files: GroundingFileType[];
    onSelected: (file: GroundingFileType) => void;
};

const variants: Variants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            delay: i * 0.1,
            duration: 0.3,
            type: "spring",
            stiffness: 300,
            damping: 20
        }
    })
};

export function GroundingFiles({ files, onSelected }: Properties) {
    const { t } = useTranslation();
    const isAnimating = useRef(false);

    if (files.length === 0) {
        return null;
    }

    return (
        <Card className="mx-0 sm:mx-4 w-full max-w-none sm:max-w-md md:max-w-lg lg:max-w-2xl bg-gray-900 border-gray-700 shadow-lg">
            <CardHeader className="px-2 py-1 sm:px-6 sm:py-6">
                <CardTitle className="text-sm sm:text-xl text-white">{t("groundingFiles.title")}</CardTitle>
                <CardDescription className="text-xs sm:text-base text-gray-300 hidden sm:block">{t("groundingFiles.description")}</CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-2 pt-0 sm:px-6 sm:pb-6">
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`${isAnimating ? "overflow-hidden" : "overflow-y-auto"}`}
                        onLayoutAnimationStart={() => (isAnimating.current = true)}
                        onLayoutAnimationComplete={() => (isAnimating.current = false)}
                    >
                        <div className="flex flex-wrap gap-1 sm:gap-3 justify-start">
                            {files.map((file, index) => (
                                <motion.div 
                                    key={index} 
                                    variants={variants} 
                                    initial="hidden" 
                                    animate="visible" 
                                    custom={index}
                                    className="flex-shrink-0"
                                >
                                    <GroundingFile key={index} value={file} onClick={() => onSelected(file)} />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
