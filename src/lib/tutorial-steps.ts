import type { IconName } from "@/components/ui/Icon";

// Mirrors CT_TUTORIAL_STEPS in CampTrack/js/tutorial.js.
export const TUTORIAL_STEPS: { title: string; body: string; icon: IconName | null }[] = [
  {
    title: "Welcome to CampTrack!",
    body: "Here's a quick tour of what you can do. Close this any time — you can always replay it later from the Help page.",
    icon: null,
  },
  {
    title: "Dashboard",
    body: "Your home base: current weather, a multi-day forecast, and your upcoming trips at a glance.",
    icon: "dashboard",
  },
  {
    title: "Campsites",
    body: "Log spots you've camped — by GPS, address, or just a name — with photos, notes, hookups, and a personal rating.",
    icon: "campsites",
  },
  {
    title: "Trips & Packing",
    body: "Plan upcoming trips and build packing checklists. Every new trip starts from a reusable default list you can edit any time.",
    icon: "trips",
  },
  {
    title: "Map",
    body: "Search any address, place, or coordinates, and jump straight to turn-by-turn directions in Google Maps.",
    icon: "map",
  },
  {
    title: "Explore",
    body: "See public campsites other CampTrack users have shared — filter by state, hookups, and rating, and add any of them straight to your own log. There's a dump station layer too.",
    icon: "explore",
  },
  {
    title: "Calendar & Maintenance",
    body: "See all your trips laid out by month, and keep a running log of RV service and repairs — attach receipts and work orders right on each record.",
    icon: "calendar",
  },
  {
    title: "You're all set!",
    body: "Find Settings and Help in the menu any time — Help has FAQs, this tour again, and a way to reach support.",
    icon: null,
  },
];
