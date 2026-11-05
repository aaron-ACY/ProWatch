package com.prowatch.health

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WatchNotificationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "WatchNotificationModule"

  @ReactMethod
  fun isPermissionGranted(promise: Promise) {
    promise.resolve(false)
  }

  @ReactMethod
  fun openPermissionSettings(promise: Promise) {
    promise.resolve(false)
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required for NativeEventEmitter compatibility
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for NativeEventEmitter compatibility
  }
}
