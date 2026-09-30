# Daily Reading Monetization Setup

The app code expects this product model:

- RevenueCat entitlement: `daily_reading`
- Store product ID: `seodang_ai_reading_monthly`
- Billing period: one month, auto-renewing
- Korea price: KRW 3,300
- Free access: today's beginner reading
- Rewarded access: one intermediate or advanced level per local date
- Subscriber access: all levels and archive, without ads

## RevenueCat and Stores

1. Create the auto-renewable monthly product in App Store Connect and Google
   Play Console using the product ID above and set the Korean price to KRW
   3,300.
2. Add both store apps and products to RevenueCat.
3. Attach both products to the `daily_reading` entitlement.
4. Put the monthly package in the current RevenueCat offering.
5. Add the public platform SDK keys to the EAS environments as
   `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and
   `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.

## AdMob

1. Create iOS and Android apps in AdMob and create one rewarded ad unit for
   each platform.
2. Add the production app IDs to EAS as `EXPO_PUBLIC_ADMOB_IOS_APP_ID` and
   `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`. Production builds stop if either is
   missing so Google's sample app IDs cannot be released accidentally.
3. Add the rewarded unit IDs to EAS as `EXPO_PUBLIC_ADMOB_REWARDED_IOS` and
   `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`.
4. Mark the Android app as containing ads in Play Console and complete the
   store privacy/data-safety forms.

Development builds use Google's official rewarded test unit. Real purchases
and ads require a new development build after native configuration changes.
