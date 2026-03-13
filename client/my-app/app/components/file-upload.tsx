"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import React from "react";
import { useAuth } from "@clerk/nextjs";

type FileUploadProps = {
  accept?: string;
  onFileSelect?: (file: File | null) => void;
  onUploaded?: (fileMeta: { name: string; size: number; docId?: string }) => void;
};

const FileUploadComponent: React.FC<FileUploadProps> = ({
  accept = "application/pdf",
  onFileSelect,
  onUploaded,
}) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default limit
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = React.useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [serverMessage, setServerMessage] = React.useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const selected = files[0];
    if (selected.type !== "application/pdf") {
      setError("Please upload a PDF document.");
      setUploadStatus("error");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("File is larger than 10MB. Please choose a smaller file.");
      setUploadStatus("error");
      return;
    }

    setFile(selected);
    setError(null);
    setUploadStatus("idle");
    setServerMessage(null);
    onFileSelect?.(selected);
  };

  const resetFile = () => {
    setFile(null);
    setError(null);
    setUploadStatus("idle");
    setServerMessage(null);
    onFileSelect?.(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const dropzoneStyles = [
    "flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/30 px-8 py-10 text-center transition-all",
    "bg-white/10 shadow-2xl backdrop-blur",
    isDragging
      ? "border-sky-300/80 bg-white/20"
      : "border-white/30 hover:border-white/50",
  ].join(" ");

  const uploadFile = async () => {
    if (!isLoaded || !isSignedIn) {
      setError("Please sign in to upload documents.");
      setUploadStatus("error");
      return;
    }
    if (!file) {
      setError("Select a file before uploading.");
      setUploadStatus("error");
      return;
    }

    setUploadStatus("uploading");
    setError(null);
    setServerMessage(null);

    try {
      const formData = new FormData();
      formData.append("pdf", file, file.name);

      const token = await getToken();
      if (!token) {
        throw new Error("Auth token unavailable; please re-authenticate.");
      }

      const response = await fetch(`${apiBaseUrl}/upload/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to upload file.");
      }

      const data = await response.json();
      setUploadStatus("success");
      setServerMessage(
        data.message ?? "Document uploaded. Preparing it for questions now."
      );
      onUploaded?.({
        name: data?.file?.originalName ?? file.name,
        size: data?.file?.size ?? file.size,
        docId: data?.file?.docId ?? data?.file?.storedAs,
      });
    } catch (err) {
      setUploadStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error while uploading file."
      );
    }
  };

  return (
    <div className="space-y-4 text-slate-900">
      <div
        className={dropzoneStyles}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <Upload className="h-10 w-10 text-sky-500" strokeWidth={1.5} />
        <div>
          <p className="text-lg font-semibold">Upload your document</p>
          <p className="text-sm text-slate-700">
            Drag & drop or{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-medium text-sky-600 underline-offset-2 hover:underline"
            >
              browse files
            </button>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            PDF only, up to 10 MB. We process your file securely.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {file && (
        <div className="flex items-center justify-between rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-sm shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-sky-500" strokeWidth={1.5} />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-slate-600">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetFile}
            className="rounded-full p-1 text-slate-500 transition hover:bg-white/50 hover:text-slate-900"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={uploadFile}
        disabled={!file || uploadStatus === "uploading"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900/90 px-4 py-3 font-semibold text-white shadow-md backdrop-blur transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploadStatus === "uploading" ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <Upload className="h-4 w-4" strokeWidth={1.5} />
        )}
        {uploadStatus === "uploading" ? "Uploading..." : "Upload document"}
      </button>

      {serverMessage && uploadStatus === "success" && (
        <p className="text-sm text-emerald-600" role="status">
          {serverMessage}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUploadComponent;
