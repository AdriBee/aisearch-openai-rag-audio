import "./status-message.css";
import { useTranslation } from "react-i18next";

type Properties = {
    isRecording: boolean;
};

export default function StatusMessage({ isRecording }: Properties) {
    const { t } = useTranslation();
    if (!isRecording) {
        return <p className="text-white text-center text-xs sm:text-base px-1">{t("status.notRecordingMessage")}</p>;
    }

    return (
        <div className="flex items-center justify-center px-1">
            <div className="relative h-3 w-3 sm:h-8 sm:w-8 overflow-hidden">
                <div className="absolute inset-0 flex items-end justify-around">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="w-0.5 sm:w-1.5 rounded-full bg-white opacity-90"
                            style={{
                                animation: `barHeight${(i % 3) + 1} 1s ease-in-out infinite`,
                                animationDelay: `${i * 0.1}s`
                            }}
                        />
                    ))}
                </div>
            </div>
            <p className="text-white ml-1 sm:ml-3 text-xs sm:text-base">{t("status.conversationInProgress")}</p>
        </div>
    );
}
