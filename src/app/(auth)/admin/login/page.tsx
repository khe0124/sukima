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
        <div className="form-actions">
          <a className="button-link secondary" href="/api/admin/auth/google">
            Continue with Google
          </a>
        </div>
        <div className="form-divider" aria-hidden="true">
          <span>or</span>
        </div>
        <label className="field-group">
          <span className="field-label">Email</span>
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label className="field-group">
          <span className="field-label">Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <div className="form-actions">
          <button type="submit">Login</button>
        </div>
        <p className="form-status" role="status">{status}</p>
      </form>
    </main>
  );
}
