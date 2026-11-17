/* Google Analytics loader. Leave PRIMZ_GA_ID empty until the GA4 measurement ID (G-XXXXXXXXXX) is issued.
   Unique-user reporting (India, desktop and mobile) is needed for DIPR Punjab empanelment. */
(function () {
  var PRIMZ_GA_ID = "";
  if (!/^G-[A-Z0-9]{6,}$/.test(PRIMZ_GA_ID)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + PRIMZ_GA_ID;
  document.head.appendChild(s);
  window.gtag("js", new Date());
  window.gtag("config", PRIMZ_GA_ID, { anonymize_ip: true });
})();
