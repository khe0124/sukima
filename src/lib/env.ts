const requiredServerEnv = [
  "DATABASE_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_PRIVATE",
  "R2_BUCKET_PUBLIC",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET"
] as const;

export function getRequiredEnv(name: (typeof requiredServerEnv)[number]) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string) {
  return process.env[name] || "";
}
