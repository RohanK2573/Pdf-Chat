'use client';

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-sky-100 via-white to-indigo-100 px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.16),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(45,212,191,0.18),transparent_20%)]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/30 bg-white/40 px-6 py-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-slate-900">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <span className="text-sm font-semibold tracking-tight">
            PDF Scanner AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton fallbackRedirectUrl="/app" mode="modal">
              <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-slate-800">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton fallbackRedirectUrl="/app" mode="modal">
              <button className="rounded-full border border-slate-900/20 bg-white/60 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-900/40 hover:bg-white/80">
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/app"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
            >
              Go to app
            </Link>
          </SignedIn>
        </div>
      </header>

      <main className="relative mx-auto mt-16 flex max-w-6xl flex-col items-center gap-10 text-center">
        <div className="max-w-3xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur">
            AI-Powered · Secure · Fast
          </p>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            Chat with your PDFs in a beautiful, secure workspace.
          </h1>
          <p className="text-lg text-slate-700">
            Upload documents, then ask questions and get instant answers—powered
            by your own content. Built with Next.js, Clerk auth, and a
            glassmorphic UI.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <SignedOut>
            <SignInButton fallbackRedirectUrl="/app">
              <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-2xl">
                Sign in to start
                <ArrowRight className="h-4 w-4" />
              </button>
            </SignInButton>
            <SignUpButton fallbackRedirectUrl="/app">
              <button className="rounded-xl border border-slate-900/20 bg-white/60 px-5 py-3 text-base font-semibold text-slate-900 shadow-md backdrop-blur transition hover:-translate-y-0.5 hover:border-slate-900/30 hover:bg-white/80">
                Create account
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-2xl"
            >
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </SignedIn>
        </div>

        <div className="relative w-full max-w-5xl">
          <div className="absolute inset-0 rounded-3xl bg-white/30 blur-3xl" />
          <div className="relative rounded-3xl border border-white/40 bg-white/60 p-8 shadow-2xl backdrop-blur">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/40 bg-white/40 p-6 text-left shadow-md backdrop-blur">
                <p className="text-sm font-semibold text-slate-700">Step 1</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  Upload your PDF
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Drag-and-drop or browse to send your document securely to the
                  backend for processing.
                </p>
              </div>
              <div className="rounded-2xl border border-white/40 bg-white/40 p-6 text-left shadow-md backdrop-blur">
                <p className="text-sm font-semibold text-slate-700">Step 2</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  Ask questions instantly
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Get concise answers grounded in your PDF content with our AI
                  assistant—no raw JSON or technical details shown.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
