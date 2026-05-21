"use client";

import React from "react";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [status, setStatus] = useState("Enter admin credentials.");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setStatus("Signing in...");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: String(form.get("email") || ""),
        password: String(form.get("password") || "")
      })
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || "Login failed.");
      return;
    }

    window.location.assign("/admin/photos");
  }

  return (
    <main className="shell">
      <section className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>Login</h1>
        <p>Sign in to manage uploads.</p>
      </section>

      <form action="/api/admin/login" className="upload-form" method="post" onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit">Login</button>
        <p role="status">{status}</p>
      </form>
    </main>
  );
}
