(function (global) {
  "use strict";

  var DEFAULT_COFFEE_URL = "https://buymeacoffee.com/luigipascal";
  var DEFAULT_STORAGE_KEY = "plainconsent";
  var SETTINGS_SELECTOR = "[data-plainconsent-settings],[data-cookie-settings]";

  var defaults = {
    privacyUrl: "/privacy.html",
    storageKey: DEFAULT_STORAGE_KEY,
    googleAnalyticsId: "",
    consentMode: true,
    categories: { analytics: true },
    texts: {
      title: "Cookies on this site",
      description:
        "We use essential cookies so the site works. Analytics cookies (e.g. Google Analytics) load only if you opt in. See our {privacy} for details.",
      privacyLabel: "Privacy Policy",
      accept: "Accept analytics",
      reject: "Essential only",
      credit: "Consent by {name} — free & open source — {coffee}",
      creditName: "PlainConsent",
      creditCoffee: "buy us a coffee",
    },
    credit: {
      show: true,
      coffeeUrl: DEFAULT_COFFEE_URL,
    },
    scripts: [],
  };

  function merge(target, source) {
    if (!source) return target;
    var out = Object.assign({}, target);
    Object.keys(source).forEach(function (key) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        out[key] = merge(target[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        out[key] = source[key];
      }
    });
    return out;
  }

  function readDataConfig(scriptEl) {
    if (!scriptEl || !scriptEl.dataset) return {};
    var data = scriptEl.dataset;
    var cfg = {};
    if (data.privacyUrl) cfg.privacyUrl = data.privacyUrl;
    if (data.storageKey) cfg.storageKey = data.storageKey;
    if (data.gaId || data.googleAnalyticsId) {
      cfg.googleAnalyticsId = data.gaId || data.googleAnalyticsId;
    }
    if (data.noStyles === "true") cfg.noStyles = true;
    if (data.noCredit === "true") cfg.credit = { show: false };
    if (data.coffeeUrl) cfg.credit = merge(defaults.credit, { coffeeUrl: data.coffeeUrl });
    return cfg;
  }

  function resolveConfig() {
    var scriptEl =
      document.currentScript ||
      document.querySelector('script[src*="plainconsent"]');
    return merge(defaults, merge(readDataConfig(scriptEl), global.plainConsentConfig || {}));
  }

  function readConsent(storageKey) {
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.analytics !== "boolean") return null;
      return parsed;
    } catch (_err) {
      return null;
    }
  }

  function saveConsent(storageKey, analytics) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ analytics: analytics, updated: new Date().toISOString() })
      );
    } catch (_err) {
      /* storage blocked */
    }
  }

  function ensureDataLayer() {
    global.dataLayer = global.dataLayer || [];
    if (!global.gtag) {
      global.gtag = function gtag() {
        global.dataLayer.push(arguments);
      };
    }
    return global.gtag;
  }

  function setConsentModeDefault(gtag) {
    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted",
      wait_for_update: 500,
    });
  }

  function setConsentModeAnalytics(gtag, granted) {
    gtag("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
    });
  }

  function loadGoogleAnalytics(gaId) {
    if (!gaId || global.__plainConsentAnalyticsLoaded) return;
    global.__plainConsentAnalyticsLoaded = true;
    var gtag = ensureDataLayer();
    gtag("js", new Date());
    gtag("config", gaId);
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaId);
    document.head.appendChild(script);
  }

  function loadScriptEntry(entry) {
    if (!entry || !entry.src || entry.__loaded) return;
    entry.__loaded = true;
    if (entry.type === "inline" && entry.code) {
      var inline = document.createElement("script");
      inline.text = entry.code;
      document.head.appendChild(inline);
      return;
    }
    var script = document.createElement("script");
    script.async = entry.async !== false;
    if (entry.src) script.src = entry.src;
    document.head.appendChild(script);
  }

  function activateCategory(config, category, granted) {
    if (category === "analytics") {
      if (config.consentMode) setConsentModeAnalytics(ensureDataLayer(), granted);
      if (granted && config.googleAnalyticsId) loadGoogleAnalytics(config.googleAnalyticsId);
    }
    (config.scripts || []).forEach(function (entry) {
      if (entry.category === category && granted) loadScriptEntry(entry);
    });
  }

  function applyConsent(config, consent) {
    var analyticsGranted = !!(consent && consent.analytics);
    activateCategory(config, "analytics", analyticsGranted);
  }

  function injectStylesheet() {
    if (document.querySelector('link[data-plainconsent-styles="true"]')) return;
    var scriptEl =
      document.currentScript ||
      document.querySelector('script[src*="plainconsent"]');
    var href = "plainconsent.css";
    if (scriptEl && scriptEl.src) {
      href = scriptEl.src.replace(/plainconsent(\.min)?\.js(\?.*)?$/i, "plainconsent$1.css");
    }
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-plainconsent-styles", "true");
    document.head.appendChild(link);
  }

  function fillTemplate(text, vars) {
    return String(text).replace(/\{(\w+)\}/g, function (_match, key) {
      return vars[key] != null ? vars[key] : "";
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildDescription(config) {
    var privacyLink =
      '<a href="' +
      escapeHtml(config.privacyUrl) +
      '">' +
      escapeHtml(config.texts.privacyLabel) +
      "</a>";
    return fillTemplate(config.texts.description, { privacy: privacyLink });
  }

  function buildCredit(config) {
    if (!config.credit || config.credit.show === false) return "";
    var coffeeUrl = config.credit.coffeeUrl || DEFAULT_COFFEE_URL;
    var coffeeLink =
      '<a href="' +
      escapeHtml(coffeeUrl) +
      '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(config.texts.creditCoffee) +
      "</a>";
    var creditText = fillTemplate(config.texts.credit, {
      name: escapeHtml(config.texts.creditName),
      coffee: coffeeLink,
    });
    return '<p class="plainconsent-credit">' + creditText + "</p>";
  }

  function hideBanner(banner) {
    banner.classList.remove("is-visible");
    banner.setAttribute("aria-hidden", "true");
  }

  function showBanner(banner) {
    banner.classList.add("is-visible");
    banner.setAttribute("aria-hidden", "false");
  }

  function createBanner(config, onChoice) {
    var banner = document.createElement("div");
    banner.id = "plainconsent-banner";
    banner.className = "plainconsent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-labelledby", "plainconsent-title");
    banner.setAttribute("aria-hidden", "true");
    banner.innerHTML =
      '<div class="plainconsent-inner">' +
      '<p id="plainconsent-title" class="plainconsent-title">' +
      escapeHtml(config.texts.title) +
      "</p>" +
      '<p class="plainconsent-desc">' +
      buildDescription(config) +
      "</p>" +
      '<div class="plainconsent-actions">' +
      '<button type="button" class="plainconsent-btn plainconsent-btn-primary" data-plainconsent="accept">' +
      escapeHtml(config.texts.accept) +
      "</button>" +
      '<button type="button" class="plainconsent-btn" data-plainconsent="reject">' +
      escapeHtml(config.texts.reject) +
      "</button>" +
      "</div>" +
      buildCredit(config) +
      "</div>";

    banner.addEventListener("click", function (event) {
      var button = event.target.closest("[data-plainconsent]");
      if (!button) return;
      var accept = button.getAttribute("data-plainconsent") === "accept";
      onChoice(accept);
      hideBanner(banner);
    });

    document.body.appendChild(banner);
    return banner;
  }

  function bindSettingsLink(banner) {
    document.addEventListener("click", function (event) {
      var link = event.target.closest(SETTINGS_SELECTOR);
      if (!link) return;
      event.preventDefault();
      showBanner(banner);
    });
  }

  function init() {
    var config = resolveConfig();

    if (config.consentMode) setConsentModeDefault(ensureDataLayer());
    if (!config.noStyles) injectStylesheet();

    var consent = readConsent(config.storageKey);
    var banner = createBanner(config, function (accept) {
      saveConsent(config.storageKey, accept);
      applyConsent(config, { analytics: accept });
    });

    bindSettingsLink(banner);

    if (consent) {
      applyConsent(config, consent);
      return;
    }

    showBanner(banner);
  }

  global.PlainConsent = {
    open: function open() {
      var banner = document.getElementById("plainconsent-banner");
      if (banner) showBanner(banner);
    },
    getConsent: function getConsent() {
      var config = resolveConfig();
      return readConsent(config.storageKey);
    },
    version: "1.0.0",
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
