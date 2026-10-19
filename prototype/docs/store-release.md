# Store release

The Capacitor app in `prototype/` replaces the legacy Expo app starting with 1.1.0.
Both platforms keep the existing store identity `com.mihye.seodang` and EAS project
`a15f3174-b503-4d50-b6e2-d1704bd67b40`. Use the existing remote signing credentials.

Run release commands from `prototype/`, never the repository root:

```sh
npm ci
npm run check
npx eas-cli build --platform all --profile production
npx eas-cli submit --platform ios --profile production --id <verified-ios-build-id>
npx eas-cli submit --platform android --profile production --id <verified-android-build-id>
```

The two production GitHub workflows use this directory and remain manual-only.
Custom EAS builds sync bundled web assets and build the committed native projects;
they do not run Expo prebuild or bundle the legacy React Native application.
Android requires Java 21. iOS uses Swift Package Manager, not CocoaPods.

The shared scheme in `ios/Seodang.xcodeproj/` is an EAS CLI discovery shim: the CLI
only searches one directory below `ios` for schemes. The actual Xcode project and
identical shared scheme remain at Capacitor's standard `ios/App/App.xcodeproj`.
The custom Gymfile builds the actual project explicitly. Keep the two schemes equal.

The approved bilingual dog/book icon is bundled on both platforms. Device speech
uses AVSpeechSynthesizer on iOS and TextToSpeech on Android. Learning media and
Rive runtime are bundled for offline use. iOS speaking practice requests microphone and speech recognition permissions and requires on-device recognition.

## Existing installations

The bundle/package identifiers and signing credentials preserve the existing app
container. No legacy AsyncStorage files are deleted or overwritten. The replacement
curriculum uses a separate WebView localStorage schema; old course completion is
not mapped onto unrelated new lessons. Existing prototype saves continue to use
`seodang.web-prototype.v1`, but a separately installed `.prototype` app has a different
container and is not the store app.

The replacement has no ads or subscriptions. Version 1.2.0 adds device-bound community accounts, posts/photos, corrections and accepted private conversations. Optional analytics consent v3 includes Android Play install attribution; iOS attribution is unsupported. Update store privacy and UGC declarations for this release.
Store listing screenshots and privacy disclosures should reflect the new app.
EAS iOS submission uploads to App Store Connect; review submission and public
release are separate steps. Check each console for the final review/release state.
