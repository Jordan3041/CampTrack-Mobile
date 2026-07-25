import React, { useState } from "react";
import { Linking, Text } from "react-native";

import { FaqItem } from "@/components/help/FaqItem";
import { TutorialModal } from "@/components/TutorialModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";

const FAQS = [
  {
    q: "How do I make a campsite visible to other users?",
    a: 'Open the campsite in your log, edit it, and turn on "Make this campsite public." It needs GPS coordinates to show up on the Explore map — address-only or name-only entries won\'t appear there.',
  },
  {
    q: "I forgot my password. How do I get back in?",
    a: 'Use "Forgot password?" on the sign-in page. You\'ll need the email saved on your account — you can check or add one any time from Settings. If you signed up with Google or Apple, there\'s no password to reset; just use that sign-in button instead.',
  },
  {
    q: "Can I change my units (°F/°C, miles/km)?",
    a: "Yes — Settings has temperature and distance unit options, plus calendar preferences like which day the week starts on.",
  },
  {
    q: "How do I add photos to a campsite?",
    a: "When adding or editing a campsite, use the Photos field to select one or more images. They're compressed automatically before uploading to keep things fast.",
  },
  {
    q: "What happens to my data if I add someone else's campsite from Explore?",
    a: '"Add to my campsites" copies the name, location, hookups, and notes into your own private log — it doesn\'t copy their photos or your own rating, since a rating and the photos on file are personal to the original owner. You can edit anything about your copy afterward.',
  },
  {
    q: "Can I attach a receipt to a maintenance record?",
    a: "Yes — the RV Maintenance page lets you attach receipts or work orders (PDF, images, Word/Excel docs) to any record.",
  },
  {
    q: "Is my data private?",
    a: "By default, yes — campsites, trips, and maintenance records are visible only to you. The only exception is a campsite you've explicitly marked public, and even then only its name, location, hookups, rating, notes, and photos are shown — never your username or account details.",
  },
];

// Mirrors CampTrack/help.html + js/help.js.
export default function HelpScreen() {
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <Screen>
      <Card>
        <Text className="font-display text-lg text-ink mb-1">Take the tour again</Text>
        <Text className="text-stone text-sm mb-3">A quick walkthrough of what CampTrack can do.</Text>
        <Button title="Replay tutorial" icon="play" onPress={() => setTutorialOpen(true)} />
      </Card>
      <TutorialModal visible={tutorialOpen} onFinish={() => setTutorialOpen(false)} />

      <Card>
        <Text className="font-display text-lg text-ink mb-1">Frequently asked questions</Text>
        {FAQS.map((f) => (
          <FaqItem key={f.q} question={f.q} answer={f.a} />
        ))}
      </Card>

      <Card>
        <Text className="font-display text-lg text-ink mb-1">Still need help?</Text>
        <Text className="text-stone text-sm mb-3">Reach out and we'll get back to you.</Text>
        <Button
          title="Email support@camptrack.org"
          icon="email"
          variant="ghost"
          onPress={() => Linking.openURL("mailto:support@camptrack.org?subject=CampTrack%20support")}
        />
      </Card>
    </Screen>
  );
}
