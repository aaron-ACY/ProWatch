# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt

# react-native-reanimated & TurboModules
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native & Hermes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**

# BLE Plx & RxAndroidBle
-keep class com.polidea.rxandroidble2.** { *; }
-keep class com.polidea.multiplatformbleadapter.** { *; }
-dontwarn com.polidea.rxandroidble2.**

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Svg
-keep class com.horcrux.svg.** { *; }

# OkHttp & Okio
-dontwarn okhttp3.**
-dontwarn okio.**
