(function () {
  "use strict";

  var mapsReady = null;
  var mapsAuthFailed = false;
  var categorySearchCache = new Map();

  if (typeof window !== "undefined") {
    window.addEventListener("gmaps:auth-failure", function () {
      mapsAuthFailed = true;
    });
  }

  function getApiKey() {
    var meta = document.querySelector('meta[name="google-maps-api-key"]');
    if (meta && meta.content) return meta.content.trim();
    if (typeof window.PUBLIC_GOOGLE_MAPS_API_KEY === "string") {
      return window.PUBLIC_GOOGLE_MAPS_API_KEY.trim();
    }
    return "";
  }

  function getMapId() {
    if (typeof window.PUBLIC_GOOGLE_MAPS_MAP_ID === "string") {
      return window.PUBLIC_GOOGLE_MAPS_MAP_ID.trim();
    }
    return "";
  }

  function getConfig() {
    return window.WATERFALL_AMENITY_MAP_CONFIG || null;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function directionsUrl(name, address) {
    var q = encodeURIComponent((name ? name + ", " : "") + (address || ""));
    return "https://www.google.com/maps/dir/?api=1&destination=" + q;
  }

  function embedFallbackUrl(lat, lng) {
    return (
      "https://www.google.com/maps?q=" +
      encodeURIComponent(lat + "," + lng) +
      "&z=14&output=embed"
    );
  }

  function renderStaticList(container, places, categoryKey) {
    var filtered = places;
    if (categoryKey) {
      filtered = places.filter(function (p) {
        return p.category === categoryKey;
      });
    }
    if (!filtered.length) {
      filtered = places.slice(0, 6);
    }

    var wrap = document.createElement("div");
    wrap.className = "amenity-map-static-list";
    var heading = document.createElement("h3");
    heading.textContent = "Featured places near Waterfall";
    wrap.appendChild(heading);

    var ul = document.createElement("ul");
    filtered.forEach(function (place) {
      var li = document.createElement("li");
      var nameSpan = document.createElement("span");
      nameSpan.className = "place-name";
      nameSpan.textContent = place.name;
      li.appendChild(nameSpan);
      li.appendChild(document.createElement("br"));
      var metaSpan = document.createElement("span");
      metaSpan.className = "place-meta";
      if (place.address) {
        metaSpan.appendChild(document.createTextNode(place.address + " · "));
      }
      var dirLink = document.createElement("a");
      dirLink.href = directionsUrl(place.name, place.address || "");
      dirLink.target = "_blank";
      dirLink.rel = "noopener noreferrer";
      dirLink.textContent = "Directions";
      metaSpan.appendChild(dirLink);
      li.appendChild(metaSpan);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    container.appendChild(wrap);
  }

  function renderFallbackMap(wrap, config) {
    wrap.innerHTML = "";
    var c = config.community.center;
    var iframe = document.createElement("iframe");
    iframe.className = "amenity-map-fallback-iframe";
    iframe.title = "Map showing " + config.community.name + " area";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.src = embedFallbackUrl(c.lat, c.lng);
    wrap.appendChild(iframe);
  }

  function loadGoogleMaps(apiKey) {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("ssr"));
    }
    if (
      typeof window.google !== "undefined" &&
      window.google.maps &&
      typeof window.google.maps.importLibrary === "function"
    ) {
      return Promise.resolve();
    }
    if (mapsReady) return mapsReady;

    mapsReady = new Promise(function (resolve, reject) {
      var cb = "__gmapsReady";
      window[cb] = function () {
        resolve();
      };
      window.gm_authFailure = function () {
        mapsAuthFailed = true;
        window.dispatchEvent(new Event("gmaps:auth-failure"));
        mapsReady = null;
        reject(new Error("gm_authFailure"));
      };
      var s = document.createElement("script");
      s.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(apiKey) +
        "&v=weekly&loading=async&callback=" +
        cb;
      s.async = true;
      s.onerror = function () {
        mapsReady = null;
        reject(new Error("maps script failed"));
      };
      document.head.appendChild(s);
    });

    return mapsReady;
  }

  function searchCategory(center, categoryId, types, radiusMeters) {
    var existing = categorySearchCache.get(categoryId);
    if (existing) return existing;

    var promise = (async function () {
      var placesLib = await google.maps.importLibrary("places");
      var Place = placesLib.Place;
      var result = await Place.searchNearby({
        fields: [
          "displayName",
          "location",
          "formattedAddress",
          "googleMapsURI",
        ],
        locationRestriction: { center: center, radius: radiusMeters },
        includedPrimaryTypes: types,
        maxResultCount: 10,
        rankPreference: "POPULARITY",
      });
      return result && result.places ? result.places : [];
    })();

    promise.catch(function () {
      categorySearchCache.delete(categoryId);
    });
    categorySearchCache.set(categoryId, promise);
    return promise;
  }

  function buildFilterUi(root, config, onSelect) {
    var filters = document.createElement("div");
    filters.className = "amenity-map-filters";
    var tablist = document.createElement("ul");
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Filter nearby places by category");

    config.categoryOrder.forEach(function (key, index) {
      var cat = config.categories[key];
      if (!cat) return;
      var li = document.createElement("li");
      li.setAttribute("role", "presentation");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "amenity-map-filter-btn";
      btn.setAttribute("role", "tab");
      btn.id = "am-tab-" + key + "-" + root.dataset.instanceId;
      btn.setAttribute("aria-selected", index === 0 ? "true" : "false");
      btn.setAttribute("aria-controls", "am-panel-" + root.dataset.instanceId);
      btn.setAttribute("aria-label", cat.ariaLabel);
      btn.textContent = cat.label;
      btn.dataset.category = key;
      btn.addEventListener("click", function () {
        tablist.querySelectorAll("button").forEach(function (b) {
          b.setAttribute("aria-selected", "false");
        });
        btn.setAttribute("aria-selected", "true");
        onSelect(key);
      });
      li.appendChild(btn);
      tablist.appendChild(li);
    });

    filters.appendChild(tablist);
    root.appendChild(filters);
  }

  function clearMarkers(markers) {
    markers.forEach(function (m) {
      if (m.setMap) m.setMap(null);
      if (m.map) m.map = null;
    });
    markers.length = 0;
  }

  function placeDisplayName(place) {
    if (!place) return "Place";
    var n = place.displayName;
    if (n && typeof n === "object" && n.text) return n.text;
    if (typeof n === "string") return n;
    return place.name || "Place";
  }

  function buildInfoWindowContent(place) {
    var name = placeDisplayName(place);
    var address = place.formattedAddress || place.address || "";
    var dir = directionsUrl(name, address);

    var wrap = document.createElement("div");
    wrap.style.cssText =
      "max-width:240px;font-family:sans-serif;font-size:14px;line-height:1.4";

    var strong = document.createElement("strong");
    strong.textContent = name;
    wrap.appendChild(strong);

    if (address) {
      wrap.appendChild(document.createElement("br"));
      wrap.appendChild(document.createTextNode(address));
    }

    wrap.appendChild(document.createElement("br"));
    var link = document.createElement("a");
    link.href = dir;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Directions";
    wrap.appendChild(link);

    return wrap;
  }

  function placeLatLng(place) {
    var loc = place.location;
    if (!loc) return null;
    if (typeof loc.lat === "function") {
      return { lat: loc.lat(), lng: loc.lng() };
    }
    if (loc.lat != null && loc.lng != null) {
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  }

  function initInteractiveMap(root, config, apiKey) {
    var mapWrap = root.querySelector(".amenity-map-canvas-wrap");
    if (!mapWrap) return Promise.resolve();

    var statusEl = document.createElement("div");
    statusEl.className = "amenity-map-status";
    statusEl.setAttribute("aria-live", "polite");

    var mapEl = document.createElement("div");
    mapEl.className = "amenity-map-canvas";
    mapEl.setAttribute("role", "tabpanel");
    mapEl.id = "am-panel-" + root.dataset.instanceId;
    mapWrap.appendChild(mapEl);

    var markers = [];
    var map = null;
    var infoWindow = null;
    var inFallback = false;
    var activeCategory = config.categoryOrder[0];
    var authListener = null;

    function clearStaticLists() {
      root.querySelectorAll(".amenity-map-static-list").forEach(function (el) {
        el.remove();
      });
    }

    function enterFallback(categoryKey) {
      if (inFallback) {
        clearStaticLists();
        renderStaticList(root, config.curatedPlaces, categoryKey || activeCategory);
        return;
      }
      inFallback = true;
      clearMarkers(markers);
      if (infoWindow) infoWindow.close();
      if (mapEl.parentNode) mapEl.parentNode.removeChild(mapEl);
      renderFallbackMap(mapWrap, config);
      clearStaticLists();
      renderStaticList(root, config.curatedPlaces, categoryKey || activeCategory);
      statusEl.textContent =
        "Showing map preview and featured places near Waterfall.";
    }

    function onAuthFailure() {
      enterFallback(activeCategory);
    }

    authListener = onAuthFailure;
    window.addEventListener("gmaps:auth-failure", authListener);

    if (mapsAuthFailed) {
      buildFilterUi(root, config, function (key) {
        activeCategory = key;
        clearStaticLists();
        renderStaticList(root, config.curatedPlaces, key);
      });
      var filtersEarly = root.querySelector(".amenity-map-filters");
      if (filtersEarly && mapWrap.parentNode === root) {
        root.insertBefore(filtersEarly, mapWrap);
      }
      enterFallback(activeCategory);
      root.appendChild(statusEl);
      return Promise.resolve();
    }

    return loadGoogleMaps(apiKey)
      .then(function () {
        if (mapsAuthFailed) {
          throw new Error("gm_authFailure");
        }
        var maps = window.google.maps;
        var mapId = getMapId();
        var mapOptions = {
          center: config.community.center,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        };
        if (mapId) mapOptions.mapId = mapId;

        map = new maps.Map(mapEl, mapOptions);
        infoWindow = new maps.InfoWindow();

        function addCommunityMarker() {
          var pos = config.community.center;
          if (mapId && maps.marker && maps.marker.AdvancedMarkerElement) {
            var pin = document.createElement("div");
            pin.textContent = "★ " + config.community.markerLabel;
            pin.style.cssText =
              "background:#1e3a5f;color:#fff;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap";
            new maps.marker.AdvancedMarkerElement({
              map: map,
              position: pos,
              title: config.community.markerLabel,
              content: pin,
            });
          } else {
            new maps.Marker({
              map: map,
              position: pos,
              title: config.community.markerLabel,
              label: { text: "W", color: "white", fontWeight: "700" },
            });
          }
        }

        addCommunityMarker();
        root.appendChild(statusEl);

        function showCategory(categoryKey) {
          if (inFallback || mapsAuthFailed) {
            activeCategory = categoryKey;
            clearStaticLists();
            renderStaticList(root, config.curatedPlaces, categoryKey);
            return;
          }

          activeCategory = categoryKey;
          statusEl.textContent = "Loading nearby places…";
          clearMarkers(markers);
          clearStaticLists();

          var cat = config.categories[categoryKey];
          if (!cat) return;

          searchCategory(
            config.community.center,
            categoryKey,
            cat.primaryTypes || [],
            config.searchRadiusMeters
          )
            .then(function (places) {
              if (inFallback || mapsAuthFailed) return;

              if (!places.length) {
                statusEl.textContent =
                  "No live results for this category. See featured places below.";
                renderStaticList(root, config.curatedPlaces, categoryKey);
                return;
              }

              statusEl.textContent =
                places.length + " places shown (approximate distance from Waterfall).";

              places.forEach(function (place) {
                var latLng = placeLatLng(place);
                if (!latLng) return;

                var marker;
                var title = placeDisplayName(place);
                if (mapId && maps.marker && maps.marker.AdvancedMarkerElement) {
                  marker = new maps.marker.AdvancedMarkerElement({
                    map: map,
                    position: latLng,
                    title: title,
                  });
                  marker.addListener("click", function () {
                    infoWindow.setContent(buildInfoWindowContent(place));
                    infoWindow.open({ anchor: marker, map: map });
                  });
                } else {
                  marker = new maps.Marker({
                    map: map,
                    position: latLng,
                    title: title,
                  });
                  marker.addListener("click", function () {
                    infoWindow.setContent(buildInfoWindowContent(place));
                    infoWindow.open(map, marker);
                  });
                }
                markers.push(marker);
              });
            })
            .catch(function () {
              if (inFallback || mapsAuthFailed) return;
              statusEl.textContent =
                "Could not load live results. Showing featured places for this category.";
              renderStaticList(root, config.curatedPlaces, categoryKey);
            });
        }

        buildFilterUi(root, config, showCategory);
        var filters = root.querySelector(".amenity-map-filters");
        if (filters && mapWrap.parentNode === root) {
          root.insertBefore(filters, mapWrap);
        }
        showCategory(config.categoryOrder[0]);
      })
      .catch(function () {
        enterFallback(activeCategory);
        if (!root.contains(statusEl)) root.appendChild(statusEl);
      });
  }

  function initNoKeyExperience(root, config, mapWrap) {
    buildFilterUi(root, config, function (categoryKey) {
      root.querySelectorAll(".amenity-map-static-list").forEach(function (el) {
        el.remove();
      });
      renderStaticList(root, config.curatedPlaces, categoryKey);
    });
    var filters = root.querySelector(".amenity-map-filters");
    if (filters && mapWrap.parentNode === root) {
      root.insertBefore(filters, mapWrap);
    }
    renderFallbackMap(mapWrap, config);
    renderStaticList(root, config.curatedPlaces, config.categoryOrder[0]);
    var note = document.createElement("div");
    note.className = "amenity-map-status";
    note.textContent = "Featured places near Waterfall.";
    root.appendChild(note);
  }

  function initRoot(root) {
    if (root.dataset.amenityMapInitialized === "true") return;
    root.dataset.amenityMapInitialized = "true";

    var config = getConfig();
    if (!config) return;

    root.classList.add("amenity-map-root");
    if (root.dataset.compact === "true") {
      root.setAttribute("data-compact", "true");
    }

    var instanceId = String(Math.random()).slice(2, 9);
    root.dataset.instanceId = instanceId;

    var mapWrap = document.createElement("div");
    mapWrap.className = "amenity-map-canvas-wrap";
    root.appendChild(mapWrap);

    var apiKey = getApiKey();

    if (!apiKey || mapsAuthFailed) {
      initNoKeyExperience(root, config, mapWrap);
      return;
    }

    initInteractiveMap(root, config, apiKey).catch(function () {
      mapWrap.innerHTML = "";
      renderFallbackMap(mapWrap, config);
      root.querySelectorAll(".amenity-map-static-list").forEach(function (el) {
        el.remove();
      });
      renderStaticList(root, config.curatedPlaces, null);
      var errNote = document.createElement("div");
      errNote.className = "amenity-map-status";
      errNote.textContent = "Featured places near Waterfall.";
      root.appendChild(errNote);
    });
  }

  function observeRoots() {
    var roots = document.querySelectorAll("[data-amenity-map]");
    if (!roots.length) return;

    if (!("IntersectionObserver" in window)) {
      roots.forEach(initRoot);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            initRoot(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "120px", threshold: 0.01 }
    );

    roots.forEach(function (root) {
      observer.observe(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeRoots);
  } else {
    observeRoots();
  }
})();
