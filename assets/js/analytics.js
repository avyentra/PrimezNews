/* Shared GA4 loader: opt-in only; never duplicate an existing Google tag. */
(function () {
  "use strict";
  var id = "G-9CEE951WEE";
  function activate() {
    if (window.__primezAnalyticsStarted) return;
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    if ((window.dataLayer || []).some(function (entry) {
      return entry && entry[0] === "config" && entry[1] === id;
    })) return;
    window.__primezAnalyticsStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", id);
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(script);
  }
  // Integration contract: the CMP must explicitly grant analytics consent.
  window.addEventListener("primez:analytics-consent", function (event) {
    if (event.detail === true) activate();
    else if (window.__primezAnalyticsStarted && window.gtag) {
      window.gtag("consent", "update", { analytics_storage: "denied" });
    }
  });
})();
