(function () {
  "use strict";

  var LOADED_GOOGLE = false;
  var GOOGLE_PROMISE = null;

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

    var html =
      '<div class="amenity-map-static-list"><h3>Featured nearby places</h3><ul>';
    filtered.forEach(function (place) {
      html +=
        "<li><span class=\"place-name\">" +
        escapeHtml(place.name) +
        "</span><br><span class=\"place-meta\">" +
        escapeHtml(place.address) +
        ' · <a href="' +
        directionsUrl(place.name, place.address) +
        '" target="_blank" rel="noopener noreferrer">Directions</a></span></li>';
    });
    html += "</ul></div>";
    container.insertAdjacentHTML("beforeend", html);
  }

  function renderFallbackMap(wrap, config) {
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
    if (LOADED_GOOGLE && window.google && window.google.maps) {
      return Promise.resolve(window.google.maps);
    }
    if (GOOGLE_PROMISE) return GOOGLE_PROMISE;

    GOOGLE_PROMISE = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(apiKey) +
        "&loading=async&libraries=places&callback=__waterfallMapsInit";
      window.__waterfallMapsInit = function () {
        LOADED_GOOGLE = true;
        resolve(window.google.maps);
      };
      script.onerror = function () {
        reject(new Error("Google Maps script failed to load"));
      };
      document.head.appendChild(script);
    });

    return GOOGLE_PROMISE;
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

  function openInfoContent(place) {
    var name = placeDisplayName(place);
    var address = place.formattedAddress || place.address || "";
    var rating =
      place.rating != null ? " · Rating: " + place.rating + "/5" : "";
    var dir = directionsUrl(name, address);
    return (
      "<div style=\"max-width:240px;font-family:sans-serif;font-size:14px;line-height:1.4\">" +
      "<strong>" +
      escapeHtml(name) +
      "</strong>" +
      (address
        ? "<br>" + escapeHtml(address) + escapeHtml(rating)
        : escapeHtml(rating)) +
      '<br><a href="' +
      dir +
      '" target="_blank" rel="noopener noreferrer">Directions</a>' +
      "</div>"
    );
  }

  async function searchCategory(maps, Place, config, categoryKey) {
    var cat = config.categories[categoryKey];
    if (!cat) return [];
    var center = config.community.center;
    var all = [];
    var types = cat.primaryTypes || [];

    for (var i = 0; i < types.length; i++) {
      try {
        var request = {
          fields: [
            "displayName",
            "location",
            "formattedAddress",
            "rating",
            "googleMapsURI",
          ],
          locationRestriction: {
            center: { lat: center.lat, lng: center.lng },
            radius: config.searchRadiusMeters,
          },
          includedPrimaryTypes: [types[i]],
          maxResultCount: 12,
          rankPreference: "DISTANCE",
        };
        var result = await Place.searchNearby(request);
        if (result && result.places) {
          all = all.concat(result.places);
        }
      } catch (_err) {
        /* try next type or legacy fallback below */
      }
    }

    if (all.length) return all;

    return legacyNearbySearch(maps, center, types);
  }

  function legacyNearbySearch(maps, center, types) {
    return new Promise(function (resolve) {
      if (!maps.places || !maps.places.PlacesService) {
        resolve([]);
        return;
      }
      var div = document.createElement("div");
      var service = new maps.places.PlacesService(div);
      var type = types[0] || "restaurant";
      service.nearbySearch(
        {
          location: new maps.LatLng(center.lat, center.lng),
          radius: 8000,
          type: type,
        },
        function (results, status) {
          if (
            status === maps.places.PlacesServiceStatus.OK &&
            results &&
            results.length
          ) {
            resolve(
              results.map(function (r) {
                return {
                  displayName: r.name,
                  name: r.name,
                  formattedAddress: r.vicinity,
                  address: r.vicinity,
                  rating: r.rating,
                  location: r.geometry && r.geometry.location,
                  legacy: true,
                };
              })
            );
          } else {
            resolve([]);
          }
        }
      );
    });
  }

  async function initInteractiveMap(root, config, apiKey) {
    var maps = await loadGoogleMaps(apiKey);
    var mapWrap = root.querySelector(".amenity-map-canvas-wrap");
    if (!mapWrap) return;

    var statusEl = document.createElement("div");
    statusEl.className = "amenity-map-status";
    statusEl.setAttribute("aria-live", "polite");

    var mapEl = document.createElement("div");
    mapEl.className = "amenity-map-canvas";
    mapEl.setAttribute("role", "tabpanel");
    mapEl.id = "am-panel-" + root.dataset.instanceId;
    mapWrap.appendChild(mapEl);

    var mapId = getMapId();
    var mapOptions = {
      center: config.community.center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    };
    if (mapId) mapOptions.mapId = mapId;

    var MapCtor = maps.Map;
    var map = new MapCtor(mapEl, mapOptions);
    var markers = [];
    var infoWindow = new maps.InfoWindow();

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

    async function showCategory(categoryKey) {
      statusEl.textContent = "Loading nearby places…";
      clearMarkers(markers);
      root.querySelectorAll(".amenity-map-static-list").forEach(function (el) {
        el.remove();
      });

      var PlaceLib = null;
      try {
        PlaceLib = await maps.importLibrary("places");
      } catch (_e) {
        PlaceLib = null;
      }

      var places = [];
      if (PlaceLib && PlaceLib.Place) {
        places = await searchCategory(maps, PlaceLib.Place, config, categoryKey);
      } else {
        var cat = config.categories[categoryKey];
        places = await legacyNearbySearch(
          maps,
          config.community.center,
          cat ? cat.primaryTypes : ["restaurant"]
        );
      }

      if (!places.length) {
        statusEl.textContent =
          "No results for this category. See featured places below or open the full amenities page.";
        renderStaticList(root, config.curatedPlaces, categoryKey);
        return;
      }

      statusEl.textContent =
        places.length + " places shown (approximate distance from Waterfall).";

      places.forEach(function (place) {
        var loc = place.location;
        var latLng;
        if (loc && typeof loc.lat === "function") {
          latLng = { lat: loc.lat(), lng: loc.lng() };
        } else if (loc && loc.lat != null) {
          latLng = { lat: loc.lat, lng: loc.lng };
        } else {
          return;
        }

        var marker;
        if (mapId && maps.marker && maps.marker.AdvancedMarkerElement) {
          marker = new maps.marker.AdvancedMarkerElement({
            map: map,
            position: latLng,
            title: place.displayName || place.name,
          });
          marker.addListener("click", function () {
            infoWindow.setContent(openInfoContent(place));
            infoWindow.open({ anchor: marker, map: map });
          });
        } else {
          marker = new maps.Marker({
            map: map,
            position: latLng,
            title: place.displayName || place.name,
          });
          marker.addListener("click", function () {
            infoWindow.setContent(openInfoContent(place));
            infoWindow.open(map, marker);
          });
        }
        markers.push(marker);
      });

      if (markers.length === 1 && markers[0].position) {
        map.setCenter(markers[0].position);
      }
    }

    buildFilterUi(root, config, showCategory);
    var filters = root.querySelector(".amenity-map-filters");
    if (filters && mapWrap.parentNode === root) {
      root.insertBefore(filters, mapWrap);
    }
    await showCategory(config.categoryOrder[0]);
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

    if (!apiKey) {
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
      note.textContent =
        "Interactive map loads when PUBLIC_GOOGLE_MAPS_API_KEY is configured. Showing map preview and featured places.";
      root.appendChild(note);
      return;
    }

    initInteractiveMap(root, config, apiKey).catch(function () {
      mapWrap.innerHTML = "";
      renderFallbackMap(mapWrap, config);
      renderStaticList(root, config.curatedPlaces, null);
      var errNote = document.createElement("div");
      errNote.className = "amenity-map-status";
      errNote.textContent =
        "Could not load Google Maps. Showing preview map and featured places.";
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
