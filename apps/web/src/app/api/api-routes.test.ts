/**
 * API route handler tests: validation, auth gates, and status codes.
 * Captcha and lockout modules are mocked (not tested here).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockSetSession = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockAdminFrom = vi.fn();
const mockAdminRpc = vi.fn();
const mockGenerateLink = vi.fn();
const mockVerifyCaptcha = vi.fn();
const mockCheckAccountLockout = vi.fn();
const mockCheckIpLoginLockout = vi.fn();
const mockRecordLoginAttempt = vi.fn();
const mockWriteAuditLog = vi.fn();
const mockGetPublicSupabaseEnv = vi.fn();
const mockCreateAdminClient = vi.fn();
const mockIsEmailEnabled = vi.fn();
const mockGetPowerAutomateConfig = vi.fn();
const mockGetSiteSettings = vi.fn();
const mockGetCaptchaCredentialsStatus = vi.fn();
const mockGetEmailCredentialsStatus = vi.fn();
const mockGetStoredFileUrl = vi.fn();

vi.mock("@/lib/auth/captcha", () => ({
  verifyCaptcha: (...args: unknown[]) => mockVerifyCaptcha(...args),
}));

vi.mock("@/lib/auth/lockout", () => ({
  checkAccountLockout: (...args: unknown[]) => mockCheckAccountLockout(...args),
  checkIpLoginLockout: (...args: unknown[]) => mockCheckIpLoginLockout(...args),
  getLockoutMessage: () => "Account locked",
  getIpLockoutMessage: () => "IP locked",
  getLockoutUnavailableMessage: () => "Lockout unavailable",
  recordLoginAttempt: (...args: unknown[]) => mockRecordLoginAttempt(...args),
}));

vi.mock("@/lib/auth/audit", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

vi.mock("@/lib/power-automate/send", () => ({
  sendLockoutAlert: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
      setSession: mockSetSession,
      updateUser: mockUpdateUser,
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}));

vi.mock("@/lib/supabase/env", () => ({
  getPublicSupabaseEnv: (...args: unknown[]) => mockGetPublicSupabaseEnv(...args),
  getSiteUrl: () => "http://localhost:3000",
  isSupabaseConfigured: () => true,
  getMissingPublicEnvVars: () => [],
}));

vi.mock("@/lib/settings/site-settings", () => ({
  getSiteSettings: (...args: unknown[]) => mockGetSiteSettings(...args),
  isEmailEnabled: (...args: unknown[]) => mockIsEmailEnabled(...args),
}));

vi.mock("@/lib/settings/security-features", () => ({
  getCaptchaCredentialsStatus: (...args: unknown[]) =>
    mockGetCaptchaCredentialsStatus(...args),
  getEmailCredentialsStatus: (...args: unknown[]) =>
    mockGetEmailCredentialsStatus(...args),
}));

vi.mock("@/lib/power-automate/env", () => ({
  getPowerAutomateConfig: (...args: unknown[]) => mockGetPowerAutomateConfig(...args),
}));

vi.mock("@/lib/storage/upload", () => ({
  getStoredFileUrl: (...args: unknown[]) => mockGetStoredFileUrl(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}));

import { GET as healthGet } from "@/app/api/health/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { POST as changePasswordPost } from "@/app/api/auth/change-password/route";
import { POST as passwordResetRequestPost } from "@/app/api/auth/password-reset-request/route";
import { POST as passwordResetConfirmPost } from "@/app/api/auth/password-reset-confirm/route";
import { GET as downloadFileGet } from "@/app/api/downloads/[id]/file/route";
import { GET as processTendersGet } from "@/app/api/cron/process-tenders/route";
import { GET as processDownloadsGet } from "@/app/api/cron/process-downloads/route";

function jsonRequest(url: string, body?: unknown, headers?: HeadersInit): Request {
  return new Request(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function chainableQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const terminal = { maybeSingle };
  const or = vi.fn(() => terminal);
  const ilike = vi.fn(() => terminal);
  const eq = vi.fn(function eqChain() {
    return { eq, or, ilike, maybeSingle };
  });
  const select = vi.fn(() => ({ eq, or, ilike, maybeSingle }));
  return { select, eq, or, ilike, maybeSingle };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyCaptcha.mockResolvedValue(true);
  mockCheckAccountLockout.mockResolvedValue("ok");
  mockCheckIpLoginLockout.mockResolvedValue("ok");
  mockRecordLoginAttempt.mockResolvedValue({ unavailable: false, failures: 0 });
  mockWriteAuditLog.mockResolvedValue(undefined);
  mockGetPublicSupabaseEnv.mockReturnValue({
    url: "https://example.supabase.co",
    anonKey: "anon-key",
  });
  mockGetSiteSettings.mockResolvedValue({
    captcha_enabled: false,
    email_enabled: true,
  });
  mockGetCaptchaCredentialsStatus.mockReturnValue({ isConfigured: false });
  mockGetEmailCredentialsStatus.mockReturnValue({ isConfigured: true });
  mockGetPowerAutomateConfig.mockReturnValue({
    isConfigured: true,
    emailUrl: "https://pa.example/flow",
  });
  mockIsEmailEnabled.mockResolvedValue(true);
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
  mockSignInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: { message: "Invalid login credentials" },
  });
});

// Suite: health check liveness and detailed posture.
describe("GET /api/health", () => {
  // Returns minimal ok payload in test/non-production environments.
  it("returns ok status with timestamp", async () => {
    mockCreateAdminClient.mockReturnValue(null);

    const res = await healthGet(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
  });
});

// Suite: login validation and auth failure paths (captcha/lockout mocked).
describe("POST /api/auth/login", () => {
  // Rejects malformed JSON bodies.
  it("returns 400 for invalid JSON", async () => {
    const res = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  // Rejects invalid email/password shape before auth.
  it("returns 400 for validation errors", async () => {
    const res = await loginPost(
      jsonRequest("http://localhost/api/auth/login", {
        email: "bad",
        password: "short",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // Returns 401 when Supabase rejects credentials.
  it("returns 401 for invalid credentials", async () => {
    const res = await loginPost(
      jsonRequest("http://localhost/api/auth/login", {
        email: "admin@ccshau.ac.in",
        password: "password1",
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // Returns 503 when public Supabase env is missing.
  it("returns 503 when auth env is missing", async () => {
    mockGetPublicSupabaseEnv.mockReturnValue(null);

    const res = await loginPost(
      jsonRequest("http://localhost/api/auth/login", {
        email: "admin@ccshau.ac.in",
        password: "password1",
      }),
    );
    expect(res.status).toBe(503);
  });
});

// Suite: logout clears session.
describe("POST /api/auth/logout", () => {
  // Always returns success after signOut.
  it("returns success", async () => {
    const res = await logoutPost(jsonRequest("http://localhost/api/auth/logout", {}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockSignOut).toHaveBeenCalled();
  });
});

// Suite: change password requires signed-in user.
describe("POST /api/auth/change-password", () => {
  // Rejects invalid payload before auth check.
  it("returns 400 for invalid payload", async () => {
    const res = await changePasswordPost(
      jsonRequest("http://localhost/api/auth/change-password", {
        currentPassword: "password1",
        newPassword: "password1",
        confirmPassword: "password1",
      }),
    );
    expect(res.status).toBe(400);
  });

  // Requires authenticated session.
  it("returns 401 when not signed in", async () => {
    const res = await changePasswordPost(
      jsonRequest("http://localhost/api/auth/change-password", {
        currentPassword: "password1",
        newPassword: "password2",
        confirmPassword: "password2",
      }),
    );
    expect(res.status).toBe(401);
  });
});

// Suite: password reset request validation and generic responses.
describe("POST /api/auth/password-reset-request", () => {
  // Rejects malformed email.
  it("returns 400 for invalid email", async () => {
    const res = await passwordResetRequestPost(
      jsonRequest("http://localhost/api/auth/password-reset-request", {
        email: "not-an-email",
      }),
    );
    expect(res.status).toBe(400);
  });

  // Returns generic success when email pipeline is configured.
  it("returns generic success for valid email", async () => {
    const query = chainableQuery({ data: null, error: null });
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select: query.select })),
    });

    const res = await passwordResetRequestPost(
      jsonRequest("http://localhost/api/auth/password-reset-request", {
        email: "unknown@ccshau.ac.in",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // Returns 503 when outbound email is disabled.
  it("returns 503 when email is not configured", async () => {
    mockIsEmailEnabled.mockResolvedValue(false);
    mockGetPowerAutomateConfig.mockReturnValue({ isConfigured: false, emailUrl: null });

    const res = await passwordResetRequestPost(
      jsonRequest("http://localhost/api/auth/password-reset-request", {
        email: "admin@ccshau.ac.in",
      }),
    );
    expect(res.status).toBe(503);
  });
});

// Suite: password reset confirm requires recovery session.
describe("POST /api/auth/password-reset-confirm", () => {
  // Rejects mismatched passwords.
  it("returns 400 for mismatched passwords", async () => {
    const res = await passwordResetConfirmPost(
      jsonRequest("http://localhost/api/auth/password-reset-confirm", {
        password: "password1",
        confirmPassword: "password2",
      }),
    );
    expect(res.status).toBe(400);
  });

  // Requires valid recovery session cookie.
  it("returns 401 without recovery session", async () => {
    const res = await passwordResetConfirmPost(
      jsonRequest("http://localhost/api/auth/password-reset-confirm", {
        password: "password1",
        confirmPassword: "password1",
      }),
    );
    expect(res.status).toBe(401);
  });
});

// Suite: public download file redirect.
describe("GET /api/downloads/[id]/file", () => {
  // Returns 404 when download row is missing.
  it("returns 404 when download not found", async () => {
    const query = chainableQuery({ data: null, error: null });
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select: query.select })),
      rpc: mockAdminRpc,
    });

    const res = await downloadFileGet(new Request("http://localhost/api/downloads/x/file"), {
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }),
    });
    expect(res.status).toBe(404);
  });

  // Redirects to blob URL when download is published.
  it("redirects to stored file URL", async () => {
    const query = chainableQuery({
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        file_path: "ccshau-public/downloads/a/file.pdf",
        status: "published",
        is_public: true,
        expires_at: null,
      },
      error: null,
    });
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select: query.select })),
      rpc: mockAdminRpc.mockResolvedValue({ error: null }),
    });
    mockGetStoredFileUrl.mockReturnValue("https://cdn.example/file.pdf");

    const res = await downloadFileGet(new Request("http://localhost/api/downloads/x/file"), {
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }),
    });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toBe("https://cdn.example/file.pdf");
  });
});

// Suite: cron endpoints secured by CRON_SECRET.
describe("GET /api/cron/*", () => {
  const cronSecret = "test-cron-secret";

  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", cronSecret);
  });

  // Rejects missing bearer token.
  it("returns 401 without authorization", async () => {
    const res = await processTendersGet(new Request("http://localhost/api/cron/process-tenders"));
    expect(res.status).toBe(401);
  });

  // Runs tender expiry RPC when authorized.
  it("process-tenders returns ok when authorized", async () => {
    mockCreateAdminClient.mockReturnValue({
      rpc: mockAdminRpc.mockResolvedValue({ data: { updated: 1 }, error: null }),
    });

    const res = await processTendersGet(
      new Request("http://localhost/api/cron/process-tenders", {
        headers: { authorization: `Bearer ${cronSecret}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  // Runs download archive RPC when authorized.
  it("process-downloads returns ok when authorized", async () => {
    mockCreateAdminClient.mockReturnValue({
      rpc: mockAdminRpc.mockResolvedValue({ data: 2, error: null }),
    });

    const res = await processDownloadsGet(
      new Request("http://localhost/api/cron/process-downloads", {
        headers: { authorization: `Bearer ${cronSecret}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
