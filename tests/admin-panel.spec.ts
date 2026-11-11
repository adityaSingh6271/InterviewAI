import { test, expect, type Page } from '@playwright/test';

/**
 * Admin panel smoke pass (Phase 0-5 verification).
 * Requires the dev stack running: client :3000, API :4000, seeded DB.
 * Seeded actor: INSTITUTE_ADMIN - exercises the non-super RBAC affordances.
 */

const BASE = 'http://localhost:3000';
const EMAIL = 'admin@example.com';
const PASSWORD = 'Admin123!';

// All tests authenticate as the same seeded account; concurrent logins
// interfere with each other's refresh sessions, so run them one at a time.
test.describe.configure({ mode: 'serial' });

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('alex.chen@example.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /Sign In to Dashboard/ }).click();
  await page.waitForURL('**/admin', { timeout: 20000 });
}

test('anonymous visitors to /admin are sent to /login', async ({ page }) => {
  await page.goto(`${BASE}/admin`);
  await page.waitForURL('**/login**', { timeout: 20000 });
});

test('admin login lands on /admin overview with scoped stats', async ({ page }) => {
  await login(page);
  await expect(page.locator('[data-testid="admin-overview"]')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('[data-testid="admin-role-badge"]')).toBeVisible();
  // Stat cards render only after GET /admin/stats resolves.
  await expect(page.locator('[data-testid^="admin-stat-"]').first()).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('[data-testid="nav-/admin/accounts"]')).toBeVisible();
});

test('admin account create / edit / search / delete round trip', async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const name = `Smoke Test Admin ${stamp}`;
  const renamed = `Smoke Test Admin Renamed ${stamp}`;
  const email = `smoke.admin.${stamp}@example.com`;

  await login(page);
  await page.goto(`${BASE}/admin/accounts`);
  await expect(page.locator('[data-testid="data-table"]')).toBeVisible({ timeout: 30000 });

  // --- Create ------------------------------------------------------------
  await page.locator('[data-testid="create-admin"]').click();
  await expect(page.locator('[data-testid="admin-account-dialog"]')).toBeVisible();
  await page.locator('[data-testid="admin-name"]').fill(name);
  await page.locator('[data-testid="admin-email"]').fill(email);
  await page.locator('[data-testid="admin-password"]').fill('Smoke1234!');
  await page.locator('[data-testid="admin-account-submit"]').click();
  await expect(page.getByText('Admin account created.')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('[data-testid="admin-account-dialog"]')).toBeHidden();

  const row = page.locator('[data-testid="data-row"]').filter({ hasText: email });
  await expect(row).toBeVisible({ timeout: 20000 });

  // --- Edit --------------------------------------------------------------
  await row.locator('[data-testid="row-actions"]').click();
  await page.locator('[data-testid="row-edit"]').click();
  await expect(page.locator('[data-testid="admin-account-dialog"]')).toBeVisible();
  await page.locator('[data-testid="admin-name"]').fill(renamed);
  await page.locator('[data-testid="admin-account-submit"]').click();
  await expect(page.getByText('Admin account updated.')).toBeVisible({ timeout: 20000 });
  await expect(
    page.locator('[data-testid="data-row"]').filter({ hasText: renamed }),
  ).toBeVisible({ timeout: 20000 });

  // --- Search (debounced, server-side) -----------------------------------
  await page.locator('[data-testid="admins-search"]').fill(email);
  await expect(page.locator('[data-testid="data-row"]').filter({ hasText: email })).toBeVisible({
    timeout: 20000,
  });

  // --- Delete ------------------------------------------------------------
  const target = page.locator('[data-testid="data-row"]').filter({ hasText: renamed });
  await target.locator('[data-testid="row-actions"]').click();
  await page.locator('[data-testid="row-delete"]').click();
  await expect(page.getByText('This permanently removes')).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Admin account deleted.')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('[data-testid="data-row"]').filter({ hasText: renamed })).toHaveCount(
    0,
    { timeout: 20000 },
  );
});

test('list pages render with role-appropriate affordances', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page);

  // Client-side nav via the sidebar: full reloads would each spend an
  // auth-limiter slot (refresh), so only the SUPER-only page reloads.
  const nav = async (href: string) => {
    await page.locator(`[data-testid="nav-${href}"]:visible`).click();
  };

  // INSTITUTE_ADMIN may read institutes but never create them (ORG_ADMIN+).
  await nav('/admin/institutes');
  await expect(page.locator('[data-testid="admin-institutes"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-testid="create-institute"]')).toBeDisabled();

  await nav('/admin/students');
  await expect(page.locator('[data-testid="admin-students"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-testid="create-student"]')).toBeEnabled();

  await nav('/admin/interviews');
  await expect(page.locator('[data-testid="admin-interviews"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-testid="interviews-search"]')).toBeVisible();
  // Creator attribution: the seeded student's own draft resolves to name + portal.
  await expect(page.getByRole('columnheader', { name: 'Created by' })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Demo Student/ })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole('cell', { name: /Student · student@example\.com/ })).toBeVisible();

  await nav('/admin/applications');
  await expect(page.locator('[data-testid="admin-applications"]')).toBeVisible({ timeout: 30000 });

  await nav('/admin/attempts');
  await expect(page.locator('[data-testid="admin-attempts"]')).toBeVisible({ timeout: 30000 });

  // Organizations is SUPER_ADMIN-only: hidden from the nav, panel on direct URL.
  await page.goto(`${BASE}/admin/organizations`);
  await expect(page.locator('[data-testid="admin-access-denied"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-testid="nav-/admin/organizations"]')).toHaveCount(0);
});
