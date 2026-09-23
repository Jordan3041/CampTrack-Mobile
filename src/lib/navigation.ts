// "Navigate To" — hands coordinates off to an external turn-by-turn app.
// Uses each app's universal https:// deep link (not a custom URL scheme
// like comgooglemaps:// or waze://) so no LSApplicationQueriesSchemes
// entitlement is needed: these links already redirect into the native app
// when it's installed and fall back to the mobile web otherwise, same
// pattern already used for the plain "open in Maps" link on the campsite
// coordinates row (SiteDetailSheet, Campsites list) and in map.tsx.
import { ActionSheetIOS, Alert, Linking, Platform } from "react-native";

type NavApp = { label: string; url: (lat: number, lng: number) => string };

const NAV_APPS: NavApp[] = [
  { label: "Apple Maps", url: (lat, lng) => `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d` },
  { label: "Google Maps", url: (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving` },
  { label: "Waze", url: (lat, lng) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` },
];

// Apple Maps only makes sense to offer on iOS, where it's always present.
function appsForPlatform(): NavApp[] {
  return Platform.OS === "ios" ? NAV_APPS : NAV_APPS.filter((a) => a.label !== "Apple Maps");
}

// Opens the OS-native picker (ActionSheetIOS on iOS; Alert's native dialog
// buttons elsewhere) letting the user choose which app gets the
// destination, then deep-links straight into turn-by-turn directions.
export function promptNavigateTo(lat: number, lng: number, label?: string) {
  const apps = appsForPlatform();
  const title = label ? `Navigate to ${label}` : "Navigate to";
  const open = (app: NavApp) => Linking.openURL(app.url(lat, lng)).catch(() => {});

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [...apps.map((a) => a.label), "Cancel"], cancelButtonIndex: apps.length },
      (index) => {
        if (index < apps.length) open(apps[index]);
      }
    );
    return;
  }

  Alert.alert(title, undefined, [...apps.map((a) => ({ text: a.label, onPress: () => open(a) })), { text: "Cancel", style: "cancel" as const }]);
}
