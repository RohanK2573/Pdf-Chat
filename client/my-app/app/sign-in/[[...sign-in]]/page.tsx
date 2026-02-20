'use client';

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-white to-indigo-100 px-4 py-10">
      <div className="relative w-full max-w-md rounded-3xl border border-white/30 bg-white/40 p-6 shadow-2xl backdrop-blur">
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none bg-transparent border-0",
            },
          }}
          redirectUrl="/app"
        />
      </div>
    </div>
  );
}
