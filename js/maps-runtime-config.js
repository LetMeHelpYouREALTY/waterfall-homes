/* Auto-generated at build — do not edit manually */
window.PUBLIC_GOOGLE_MAPS_API_KEY = "";
window.PUBLIC_GOOGLE_MAPS_MAP_ID = "";
(function () {
  function syncMapsMeta() {
    var meta = document.querySelector('meta[name="google-maps-api-key"]');
    if (meta && window.PUBLIC_GOOGLE_MAPS_API_KEY) {
      meta.content = window.PUBLIC_GOOGLE_MAPS_API_KEY;
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncMapsMeta);
  } else {
    syncMapsMeta();
  }
})();
