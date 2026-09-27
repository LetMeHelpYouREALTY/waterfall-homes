/**
 * Waterfall (North Las Vegas, NV 89085) — map center and amenity categories.
 * Center: OpenStreetMap geocode of site NAP 4063 Lower Saxon Ave (Waterfall / Nelson Ranch).
 */
(function () {
  window.WATERFALL_AMENITY_MAP_CONFIG = {
    community: {
      name: "Waterfall",
      fullName: "Waterfall, North Las Vegas",
      city: "North Las Vegas",
      state: "NV",
      postalCode: "89085",
      center: { lat: 36.3119192, lng: -115.1950015 },
      markerLabel: "Waterfall Community",
      addressLine: "4063 Lower Saxon Ave, North Las Vegas, NV 89085",
    },
    searchRadiusMeters: 8000,
    /** Family community — schools included; not age-restricted or high-rise. */
    categoryOrder: [
      "restaurants",
      "cafes",
      "grocery",
      "parks",
      "golf",
      "healthcare",
      "pharmacies",
      "shopping",
      "parking",
      "fitness",
      "schools",
    ],
    categories: {
      restaurants: {
        label: "Restaurants",
        ariaLabel: "Show restaurants near Waterfall",
        primaryTypes: ["restaurant"],
      },
      cafes: {
        label: "Cafes",
        ariaLabel: "Show cafes near Waterfall",
        primaryTypes: ["cafe", "bakery"],
      },
      grocery: {
        label: "Grocery",
        ariaLabel: "Show grocery stores near Waterfall",
        primaryTypes: ["grocery_store", "supermarket"],
      },
      parks: {
        label: "Parks",
        ariaLabel: "Show parks near Waterfall",
        primaryTypes: ["park"],
      },
      golf: {
        label: "Golf",
        ariaLabel: "Show golf courses near Waterfall",
        primaryTypes: ["golf_course"],
      },
      healthcare: {
        label: "Healthcare",
        ariaLabel: "Show hospitals and doctors near Waterfall",
        primaryTypes: ["hospital", "doctor"],
      },
      pharmacies: {
        label: "Pharmacies",
        ariaLabel: "Show pharmacies near Waterfall",
        primaryTypes: ["pharmacy", "drugstore"],
      },
      shopping: {
        label: "Shopping",
        ariaLabel: "Show shopping near Waterfall",
        primaryTypes: ["shopping_mall", "department_store"],
      },
      parking: {
        label: "Parking",
        ariaLabel: "Show parking near Waterfall",
        primaryTypes: ["parking"],
      },
      fitness: {
        label: "Fitness",
        ariaLabel: "Show gyms and fitness near Waterfall",
        primaryTypes: ["gym"],
      },
      schools: {
        label: "Schools",
        ariaLabel: "Show schools near Waterfall",
        primaryTypes: ["school", "primary_school", "secondary_school"],
      },
    },
    /** Verified nearby places for fallback list and ItemList schema (no invented ratings). */
    curatedPlaces: [
      {
        id: "smiths-aliante",
        name: "Smith's Food and Drug",
        type: "GroceryStore",
        category: "grocery",
        address: "6855 Aliante Pkwy, North Las Vegas, NV 89084",
      },
      {
        id: "albertsons-ann",
        name: "Albertsons",
        type: "GroceryStore",
        category: "grocery",
        address: "3010 W Ann Rd, North Las Vegas, NV 89031",
      },
      {
        id: "aliante-casino",
        name: "Aliante Casino + Hotel",
        type: "EntertainmentBusiness",
        category: "restaurants",
        address: "7300 Aliante Pkwy, North Las Vegas, NV 89084",
      },
      {
        id: "aliante-nature-park",
        name: "Aliante Nature Discovery Park",
        type: "Park",
        category: "parks",
        address: "2627 Nature Park Dr, North Las Vegas, NV 89084",
      },
      {
        id: "aliante-golf",
        name: "Aliante Golf Club",
        type: "GolfCourse",
        category: "golf",
        address: "7101 Aliante Pkwy, North Las Vegas, NV 89084",
      },
      {
        id: "centennial-hills-hospital",
        name: "Centennial Hills Hospital Medical Center",
        type: "Hospital",
        category: "healthcare",
        address: "6900 N Durango Dr, Las Vegas, NV 89149",
      },
      {
        id: "triggs-elementary",
        name: "Triggs Elementary School",
        type: "School",
        category: "schools",
        address: "7330 W Gowan Rd, Las Vegas, NV 89129",
      },
      {
        id: "cadwallader-middle",
        name: "Cadwallader Middle School",
        type: "School",
        category: "schools",
        address: "7457 W Azure Dr, Las Vegas, NV 89128",
      },
      {
        id: "canyon-springs-high",
        name: "Canyon Springs High School",
        type: "School",
        category: "schools",
        address: "350 E Alexander Rd, North Las Vegas, NV 89032",
      },
    ],
  };
})();
