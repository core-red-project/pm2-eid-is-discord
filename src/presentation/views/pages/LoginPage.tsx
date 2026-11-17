/**
 * @file LoginPage.tsx
 * @description Standalone login page component rendered with Hono JSX.
 * Provides a secure, clean authentication form with session cookie exchange and localization.
 * @module presentation/views/pages/LoginPage
 */

import type { Translations } from '../../i18n/types.ts';

/**
 * Props passed to the {@link LoginPage} component.
 */
interface LoginPageProps {
  /** Optional error message displayed if previous credentials were invalid. */
  errorMessage?: string;
  /** Active localized translation bundle. */
  t: Translations;
}

/**
 * Renders the full HTML document for the dashboard authentication page.
 *
 * @param props - Component properties containing translation strings and optional error state.
 * @returns Full HTML document markup for the login screen.
 */
export function LoginPage({ errorMessage, t }: LoginPageProps) {
  return (
    <html lang={t.locale}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#0d0d0d" />
        <title>{t.login.title} | PM2 EID Is Discord Dashboard</title>
        <link rel="icon" type="image/webp" href="/static/icon.webp" />
        <link rel="stylesheet" href="/static/css/main.css" />
      </head>
      <body class="login-body">
        <div class="login-wrapper">
          <div class="login-card">
            <div class="login-brand">
              <img src="/static/icon.webp" alt="PM2 EID Logo" class="login-logo-img" />
              <h1 class="logo">
                PM2 <span class="accent">EID</span>
              </h1>
              <p class="login-subtitle">{t.login.badge}</p>
            </div>

            {errorMessage && <div class="alert alert-error login-alert">{errorMessage}</div>}

            <form method="post" action="/login" class="login-form">
              <div class="form-group">
                <label for="username">{t.login.usernameLabel}</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  class="form-input"
                  required
                  autofocus
                  autocomplete="username"
                  placeholder="admin"
                />
              </div>

              <div class="form-group">
                <label for="password">{t.login.passwordLabel}</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  class="form-input"
                  required
                  autocomplete="current-password"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" class="btn btn-primary btn-block">
                {t.login.btnSubmit}
              </button>
            </form>

            <div class="login-footer">
              <span>
                Developed by{' '}
                <a
                  href="https://sxnnysideproject.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="footer-link"
                >
                  Core Red Project
                </a>
              </span>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
