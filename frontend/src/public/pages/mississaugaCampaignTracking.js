const CONSENT_KEY = 'jooblie_site_cookie_consent';
const EVENT_NAMES = new Set([
  'page_view',
  'registration_form_start',
  'registration_submit_attempt',
  'registration_validation_error',
  'registration_success',
  'registration_duplicate_resubmitted',
  'registration_error',
  'cta_to_form',
]);

export function readMississaugaTrackingConsent() {
  try {
    const value = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null');
    if (!value || value.version !== 1) return { analytics: false, marketing: false, decided: false };
    return { analytics: value.analytics === true, marketing: value.marketing === true, decided: true };
  } catch {
    return { analytics: false, marketing: false, decided: false };
  }
}

function installGoogleAnalytics(consent) {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (!measurementId) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  if (!window.__jooblieGaReady) {
    window.gtag('js', new Date());
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.gtag('config', measurementId, { send_page_view: false, allow_google_signals: false });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.jooblieTracker = 'google-analytics';
    document.head.appendChild(script);
    window.__jooblieGaReady = true;
  }
  window.gtag('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
  });
}

function installMetaPixel(consent) {
  const pixelId = import.meta.env.VITE_META_PIXEL_ID?.trim();
  if (!pixelId) return;
  if (!window.fbq) {
    const fbq = function fbq() {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.dataset.jooblieTracker = 'meta-pixel';
    document.head.appendChild(script);
  }
  if (!window.__jooblieMetaInitialized) {
    window.fbq('init', pixelId);
    window.__jooblieMetaInitialized = true;
  }
  window.fbq('consent', consent.marketing ? 'grant' : 'revoke');
}

export function updateMississaugaTrackingConsent(consent) {
  try {
    if (consent.decided) {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({
        version: 1,
        analytics: consent.analytics === true,
        marketing: consent.marketing === true,
        updated_at: new Date().toISOString(),
      }));
    }
  } catch {
    // Tracking remains disabled if this browser blocks local storage.
  }
  if (consent.analytics || window.__jooblieGaReady) installGoogleAnalytics(consent);
  if (consent.marketing || window.__jooblieMetaInitialized) installMetaPixel(consent);
}

export function trackMississaugaPageView(pathname, consent = readMississaugaTrackingConsent()) {
  updateMississaugaTrackingConsent(consent);
  if (consent.analytics && window.__jooblieGaReady) {
    window.gtag('event', 'page_view', { page_path: pathname, page_title: document.title });
  }
  if (consent.marketing && window.__jooblieMetaInitialized) window.fbq('track', 'PageView');
}

export function trackMississaugaEvent(eventName, consent = readMississaugaTrackingConsent()) {
  if (!EVENT_NAMES.has(eventName)) return;
  updateMississaugaTrackingConsent(consent);
  if (consent.analytics && window.__jooblieGaReady) window.gtag('event', eventName);
  if (eventName === 'registration_success' && consent.marketing && window.__jooblieMetaInitialized) {
    window.fbq('track', 'Lead');
  }
}
