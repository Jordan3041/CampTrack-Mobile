// Mirrors CampTrack/js/rig.js.
export const RIG_VEHICLE_TYPES: { label: string; value: string }[] = [
  { label: "— not specified —", value: "" },
  { label: "Tent (no vehicle)", value: "tent" },
  { label: "Car / SUV (no RV)", value: "car_suv" },
  { label: "Truck camper", value: "truck_camper" },
  { label: "Popup / folding trailer", value: "popup" },
  { label: "Travel trailer", value: "travel_trailer" },
  { label: "Fifth wheel", value: "fifth_wheel" },
  { label: "Class A motorhome", value: "class_a" },
  { label: "Class B camper van", value: "class_b" },
  { label: "Class C motorhome", value: "class_c" },
  { label: "Toy hauler", value: "toy_hauler" },
];

// Vehicle types that get their own hauled/driven "rig" spec fields.
export const RIG_RV_TYPES = new Set([
  "truck_camper", "popup", "travel_trailer", "fifth_wheel",
  "class_a", "class_b", "class_c", "toy_hauler",
]);

export const RIG_FEATURES = [
  "Solar panels", "Generator", "Toy hauler garage", "Awning",
  "Roof rack", "Bike rack", "Off-road package", "Satellite internet / Starlink",
];
