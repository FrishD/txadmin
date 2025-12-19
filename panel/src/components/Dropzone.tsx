import { cn } from "@/lib/utils";
import { UploadCloudIcon } from "lucide-react";
import { useState } from "react";

type DropzoneProps = {
    onFileChange: (file: File | null) => void;
    disabled?: boolean;
    className?: string;
};

export default function Dropzone({ onFileChange, disabled, className }: DropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        setFile(droppedFile);
        onFileChange(droppedFile);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] ?? null;
        setFile(selectedFile);
        onFileChange(selectedFile);
    };

    return (
        <div
            className={cn(
                "border-2 border-dashed border-muted-foreground/50 rounded-md p-6 text-center transition-colors",
                isDragging && "border-primary bg-primary/10",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            onDragEnter={handleDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex flex-col items-center gap-2">
                <UploadCloudIcon className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">
                    {file ? file.name : "Drag & drop a file here, or click to select a file"}
                </p>
                <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled}
                    id="file-upload"
                />
                <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-primary underline"
                >
                    Choose a file
                </label>
            </div>
        </div>
    );
}
