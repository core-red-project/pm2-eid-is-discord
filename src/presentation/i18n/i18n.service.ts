/**
 * @fileoverview Internationalization service for dynamic locale resolution and translation catalog retrieval.
 * @module presentation/i18n/i18n.service
 */

import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { en } from './locales/en.ts';
import { es } from './locales/es.ts';
import type { SupportedLocale, Translations } from './types.ts';

/** Cookie key used to persist user language selection */
export const LOCALE_COOKIE_NAME = 'pm2_eid_lang';

/**
 * Resolves the client's preferred locale with precedence:
 * 1. Explicit `?lang=` query parameter (sets cookie)
 * 2. `pm2_eid_lang` cookie preference
 * 3. Browser `Accept-Language` HTTP request header
 * 4. Default fallback ('en')
 *
 * @param c - Hono request context.
 * @returns Supported locale code ('en' or 'es').
 */
export function resolveLocale(c: Context): SupportedLocale {
  // 1. Query parameter override (?lang=es or ?lang=en)
  const queryLang = c.req.query('lang')?.toLowerCase();
  if (queryLang === 'es' || queryLang === 'en') {
    setCookie(c, LOCALE_COOKIE_NAME, queryLang, {
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    return queryLang;
  }

  // 2. Cookie preference
  const cookieLang = getCookie(c, LOCALE_COOKIE_NAME)?.toLowerCase();
  if (cookieLang === 'es' || cookieLang === 'en') {
    return cookieLang;
  }

  // 3. Accept-Language header
  const acceptLang = c.req.header('accept-language')?.toLowerCase() || '';
  if (acceptLang.startsWith('es') || acceptLang.includes(',es')) {
    return 'es';
  }

  return 'en';
}

/**
 * Retrieves the translation catalog for a given locale.
 * @param locale - Supported locale code.
 * @returns Loaded translation schema dictionary.
 */
export function getTranslations(locale: SupportedLocale): Translations {
  return locale === 'es' ? es : en;
}
