import { File } from "lucide-react";

import { Button } from "./button";

import { GroundingFile as GroundingFileType } from "@/types";

type Properties = {
    value: GroundingFileType;
    onClick: () => void;
};

export default function GroundingFile({ value, onClick }: Properties) {
    return (
        <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-white active:bg-gray-600 transition-all duration-200 touch-manipulation h-6 sm:min-h-[44px] px-1.5 sm:px-3 py-0.5 sm:py-2 text-xs sm:text-sm" 
            onClick={onClick}
        >
            <File className="mr-0.5 sm:mr-2 h-2.5 w-2.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate max-w-[60px] sm:max-w-[120px] md:max-w-none">{value.name}</span>
        </Button>
    );
}
