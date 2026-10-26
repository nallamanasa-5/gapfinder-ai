
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function AuthPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function saveProfile(
    userId: string,
    name: string,
    userEmail: string
  ) {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: name,
        email: userEmail,
      },
      { onConflict: "id" }
    );

    if (error) {
      throw new Error(
        `Your account was created, but saving your profile failed: ${error.message}`
      );
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isLogin) {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (error) throw error;

        if (!data.user) {
          throw new Error("Login failed. Please try again.");
        }

        const metadata = data.user.user_metadata ?? {};
        const name =
          metadata.full_name ||
          metadata.name ||
          data.user.email?.split("@")[0] ||
          "Student";

        await saveProfile(
          data.user.id,
          name,
          data.user.email ?? cleanEmail
        );

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      if (!fullName.trim()) {
        throw new Error("Please enter your full name.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.user && data.session) {
        await saveProfile(
          data.user.id,
          fullName.trim(),
          data.user.email ?? cleanEmail
        );

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setMessage(
        "Account created! Check your email to confirm your account. After confirmation, log in to finish setting up your profile."
      );
      setIsLogin(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f5] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-3xl font-bold text-white">
            g
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            gapfinder
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Your personal AI study companion
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setMessage("");
              setErrorMessage("");
            }}
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              isLogin
                ? "bg-white text-emerald-800 shadow"
                : "text-gray-500"
            }`}
          >
            Log in
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setMessage("");
              setErrorMessage("");
            }}
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              !isLogin
                ? "bg-white text-emerald-800 shadow"
                : "text-gray-500"
            }`}
          >
            Create account
          </button>
        </div>

        <h2 className="text-2xl font-bold text-gray-900">
          {isLogin ? "Welcome back!" : "Create your account"}
        </h2>

        <p className="mb-6 mt-2 text-sm text-gray-500">
          {isLogin
            ? "Log in to continue your learning journey."
            : "Sign up to start discovering your knowledge gaps."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Full name
              </label>

              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                placeholder="Your full name"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete={
                isLogin ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-700 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isLogin
              ? "Log in →"
              : "Create account →"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-gray-500">
          Learn with clarity. Grow with confidence.
        </p>
      </div>
    </main>
  );
}

