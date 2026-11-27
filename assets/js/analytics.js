/* Shared GA4 loader: opt-in only; never duplicate an existing Google tag. */
(function () {
  "use strict";
  if (window.__primezAnalyticsLoaderInstalled) return;
  window.__primezAnalyticsLoaderInstalled = true;
  var id = "G-9CEE951WEE";
  // The Google tag currently routes to this linked Analytics destination.
  var analyticsIds = [id, "G-DGB14KT8R9"];
  function setAnalyticsDisabled(disabled) {
    analyticsIds.forEach(function (analyticsId) {
      window["ga-disable-" + analyticsId] = disabled;
    });
  }
  setAnalyticsDisabled(true);
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });

  function activate() {
    setAnalyticsDisabled(false);
    window.gtag("consent", "update", { analytics_storage: "granted" });
    if (window.__primezAnalyticsStarted) return;
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    if (window.dataLayer.some(function (entry) {
      return entry && entry[0] === "config" && entry[1] === id;
    })) return;
    window.__primezAnalyticsStarted = true;
    window.gtag("js", new Date());
    window.gtag("config", id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(script);
  }

  function clearAnalyticsCookies() {
    var domains = ["", "; Domain=" + window.location.hostname];
    if (window.location.hostname.endsWith(".primeznews.com")) {
      domains.push("; Domain=primeznews.com");
    }
    var names = ["_ga"].concat(analyticsIds.map(function (analyticsId) {
      return "_ga_" + analyticsId.slice(2);
    }));
    names.forEach(function (name) {
      domains.forEach(function (domain) {
        document.cookie = name + "=; Max-Age=0; Path=/" + domain;
      });
    });
  }

  // This banner owns analytics storage. Google CMP owns advertising updates.
  window.addEventListener("primez:analytics-consent", function (event) {
    if (event.detail === true) {
      activate();
    } else if (event.detail === false) {
      setAnalyticsDisabled(true);
      window.gtag("consent", "update", { analytics_storage: "denied" });
      clearAnalyticsCookies();
    }
  });

  function initConsent() {
    var key = "primez.analytics.consent.v1";
    var choice = null;
    try { choice = localStorage.getItem(key); } catch (_) {}
    function apply(granted) {
      window.dispatchEvent(new CustomEvent("primez:analytics-consent", { detail: granted }));
    }
    var panel = document.createElement("div");
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Analytics cookie preferences");
    panel.style.cssText = "position:fixed;bottom:16px;left:16px;right:16px;max-width:440px;z-index:10000;background:#fff;color:#222;border:1px solid #bbb;border-radius:8px;padding:16px;box-shadow:0 4px 20px #0002;font:14px/1.5 system-ui";
    var message = document.createElement("p");
    message.textContent = "ਅਸੀਂ ਤੁਹਾਡੀ ਇਜਾਜ਼ਤ ਨਾਲ ਵਰਤੋਂ ਦੇ ਅੰਕੜੇ ਇਕੱਠੇ ਕਰਦੇ ਹਾਂ। / Optional analytics cookies help us understand website usage.";
    panel.appendChild(message);
    function button(label, action) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = label;
      b.style.cssText = "padding:8px 12px;margin:4px;border:1px solid #777;border-radius:4px;background:#fff;color:#222;cursor:pointer";
      b.addEventListener("click", action);
      return b;
    }
    function save(granted) {
      try { localStorage.setItem(key, granted ? "granted" : "denied"); } catch (_) {}
      apply(granted); panel.hidden = true;
    }
    panel.appendChild(button("Allow analytics", function () { save(true); }));
    panel.appendChild(button("Reject analytics", function () { save(false); }));
    var settings = button("Cookie settings", function () { panel.hidden = false; });
    settings.style.cssText += ";position:fixed;bottom:0;right:0;z-index:9999;font-size:12px";
    panel.hidden = choice === "granted" || choice === "denied";
    document.body.appendChild(panel);
    document.body.appendChild(settings);
    if (choice === "granted") apply(true);
    if (choice === "denied") apply(false);
    window.addEventListener("storage", function (event) {
      if (event.key !== key) return;
      apply(event.newValue === "granted");
      panel.hidden = event.newValue === "granted" || event.newValue === "denied";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initConsent, { once: true });
  else initConsent();
})();
