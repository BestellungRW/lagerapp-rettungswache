"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({
  next,
  verified,
}: {
  next: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const client = createClient();
    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("not confirmed")) {
        setError(
          "Ihre E-Mail-Adresse wurde noch nicht verifiziert. Bitte wenden Sie sich an den Administrator."
        );
      } else if (error.message.toLowerCase().includes("invalid login")) {
        setError("E-Mail oder Passwort ist nicht korrekt.");
      } else {
        setError(error.message);
      }
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-med-900">Anmelden</h2>
      {verified && (
        <p className="mt-3 rounded-lg border border-med-200 bg-med-50 px-3 py-2 text-sm text-med-900">
          Ihr Konto wurde erfolgreich verifiziert. Bitte melden Sie sich nun an.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-accent-300 bg-accent-100 px-3 py-2 text-sm text-accent-800">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Benutzername (E-Mail)
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Passwort
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn w-full">
          {loading ? "Bitte warten …" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}