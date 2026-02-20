'use client';

import { UserButton, useAuth } from "@clerk/nextjs";
import { FileText, LogOut, Shield, Upload } from "lucide-react";
import React from "react";
import ChatComponent from "./chat";
import FileUploadComponent from "./file-upload";

type UploadedMeta = {
  name: string;
  size: number;
  id?: string;
  createdAt?: string;
};

const AppWorkspace: React.FC = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

 React.useEffect(() => {
    console.log("AppWorkspace mounted - RIGHT NOW");
  }, []);

  React.useEffect(() => {
    console.log("Clerk auth state (workspace)", { isLoaded, isSignedIn });
    if (!isLoaded || !isSignedIn) return;
    (async () => {

      const token = await getToken();

    })().catch((err) => console.error("Token fetch failed", err));
  }, [getToken, isLoaded, isSignedIn]);

  const [recentUploads, setRecentUploads] = React.useState<UploadedMeta[]>([]);
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const loadDocuments = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      console.log("Loading documents with Clerk token ready");
      const token = await getToken();
      if (!token) {
        throw new Error("Auth token unavailable; please re-authenticate.");
      }

      const response = await fetch(`${apiBaseUrl}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      const docs =
        data?.documents?.map((d: any) => ({
          name: d.originalName || d.name,
          size: d.size,
          id: d.id,
          createdAt: d.createdAt,
        })) ?? [];
      setRecentUploads(docs);
      if (!selectedDocId && docs.length > 0) {
        setSelectedDocId(docs[0].id ?? null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [apiBaseUrl, getToken, isLoaded, isSignedIn, selectedDocId]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploaded = (file: UploadedMeta) => {
    setRecentUploads((prev) => [file, ...prev].slice(0, 10));
    if (file.id) {
      setSelectedDocId(file.id);
    }
    loadDocuments();
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-sky-100 via-white to-indigo-100 px-4 py-8 sm:px-6 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.16),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(45,212,191,0.18),transparent_20%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-2xl border border-white/30 bg-white/40 px-5 py-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3 text-slate-900">
            <div className="rounded-xl bg-slate-900 text-white p-2 shadow-sm">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                PDF Scanner AI
              </p>
              <p className="text-sm font-semibold">Chat with your PDFs</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur sm:flex">
              <Shield className="h-4 w-4 text-emerald-500" />
              Secure session
            </div>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "shadow-md" } }} />
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-2xl border border-white/30 bg-white/30 p-5 shadow-xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Upload PDF
                  </h2>
                  <p className="text-sm text-slate-600">
                    Drag & drop or browse. Max 10 MB.
                  </p>
                </div>
              </div>
              <FileUploadComponent onUploaded={handleUploaded} />
              <p className="mt-3 text-xs text-slate-500">
                After upload, processing runs in the background. You can start
                asking questions immediately.
              </p>
            </div>

            <div className="rounded-2xl border border-white/30 bg-white/25 p-4 shadow-lg backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-slate-800">
                <FileText className="h-4 w-4 text-sky-600" />
                <p className="text-sm font-semibold">Your uploads</p>
              </div>
              {recentUploads.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No uploads yet. Drop a PDF to get started.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentUploads.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className={`flex items-center justify-between rounded-xl border border-white/40 bg-white/40 px-3 py-2 text-sm text-slate-800 shadow-sm backdrop-blur ${
                        selectedDocId === file.id ? "ring-1 ring-sky-400" : ""
                      }`}
                      onClick={() => file.id && setSelectedDocId(file.id)}
                    >
                      <div className="flex flex-col truncate">
                        <span className="truncate font-medium">{file.name}</span>
                        {file.createdAt && (
                          <span className="text-[10px] text-slate-500">
                            {new Date(file.createdAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-right text-xs text-slate-600">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                        {file.id && (
                          <div className="text-[10px] text-slate-500">
                            {file.id.slice(0, 8)}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 min-h-0">
            <ChatComponent docId={selectedDocId ?? undefined} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppWorkspace;
