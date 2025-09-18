import "./status-message.css";
import { useTranslation } from "react-i18next";

type Properties = {
    isRecording: boolean;
};

export default function StatusMessage({ isRecording }: Properties) {
    const { t } = useTranslation();
    if (!isRecording) {
        return <p className="text-white mb-4 mt-6 text-center">{t("status.notRecordingMessage")}</p>;
    }

    return (
        <div className="flex items-center justify-center">
            <div className="relative h-8 w-8 overflow-hidden">
                <div className="absolute inset-0 flex items-end justify-around">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1.5 rounded-full bg-white opacity-90"
                            style={{
                                animation: `barHeight${(i % 3) + 1} 1s ease-in-out infinite`,
                                animationDelay: `${i * 0.1}s`
                            }}
                        />
                    ))}
                </div>
            </div>
            <p className="text-white mb-4 ml-3 mt-6">{t("status.conversationInProgress")}</p>
        </div>
    );
}
