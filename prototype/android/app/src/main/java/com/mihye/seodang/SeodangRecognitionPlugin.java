package com.mihye.seodang;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(name = "SeodangRecognition", permissions = {
    @Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO})
})
public class SeodangRecognitionPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private PluginCall pending;
    private Runnable timeout;
    private String text = "";
    private ArrayList<String> alternatives = new ArrayList<>();
    private boolean ready;
    private boolean ending;

    private boolean onDeviceAvailable() {
        return Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
    }

    @PluginMethod public void status(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject result = new JSObject();
            boolean onDevice = onDeviceAvailable();
            result.put("onDevice", onDevice);
            result.put("available", onDevice || SpeechRecognizer.isRecognitionAvailable(getContext()));
            result.put("permission", getPermissionState("microphone").toString());
            result.put("readyEvents", true);
            call.resolve(result);
        });
    }

    @PluginMethod public void recognize(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String locale = call.getString("locale");
            if (!("ko-KR".equals(locale) || "ja-JP".equals(locale))) { call.reject("Invalid locale", "INVALID_LOCALE"); return; }
            // Do not replace a call while its Android permission dialog is open.
            if (pending != null) { call.reject("Recognition is busy", "BUSY"); return; }
            pending = call;
            if (getPermissionState("microphone") == PermissionState.GRANTED) begin(call);
            else if (getPermissionState("microphone") == PermissionState.DENIED) complete("PERMISSION_BLOCKED");
            else requestPermissionForAlias("microphone", call, "microphoneResult");
        });
    }

    @PermissionCallback private void microphoneResult(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pending != call) return;
            if (getPermissionState("microphone") == PermissionState.GRANTED) begin(call);
            else complete(getActivity().shouldShowRequestPermissionRationale(Manifest.permission.RECORD_AUDIO)
                ? "PERMISSION_DENIED" : "PERMISSION_BLOCKED");
        });
    }

    private void begin(PluginCall call) {
        boolean onDevice = onDeviceAvailable() && !Boolean.TRUE.equals(call.getBoolean("preferSystem", false));
        if (!onDevice && !Boolean.TRUE.equals(call.getBoolean("allowNetwork", false))) {
            complete("SERVICE_CONSENT_REQUIRED"); return;
        }
        if (!onDevice && !SpeechRecognizer.isRecognitionAvailable(getContext())) {
            complete("RECOGNITION_UNAVAILABLE"); return;
        }
        text = "";
        alternatives.clear();
        ready = false;
        ending = false;
        try {
            recognizer = onDevice ? SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext())
                : SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new RecognitionListener() {
                public void onReadyForSpeech(Bundle params) { inputReady(call); }
                public void onBeginningOfSpeech() { inputReady(call); }
                public void onRmsChanged(float rms) {}
                public void onBufferReceived(byte[] buffer) {}
                public void onEndOfSpeech() {}
                public void onEvent(int type, Bundle params) {}
                public void onPartialResults(Bundle result) {
                    if (pending == call) readResult(result);
                }
                public void onResults(Bundle result) {
                    if (pending != call) return;
                    readResult(result); complete(null);
                }
                public void onError(int error) {
                    if (pending != call) return;
                    // Log engine diagnostics only, never recorded audio or recognized words.
                    Log.w("SeodangRecognition", "engine=" + (onDevice ? "device" : "system")
                        + " ready=" + ready + " error=" + error);
                    if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) complete("PERMISSION_BLOCKED");
                    else if (error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED || error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE) complete("LANGUAGE_UNAVAILABLE");
                    else if (error == SpeechRecognizer.ERROR_NETWORK || error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) complete("NETWORK_ERROR");
                    else if (error == SpeechRecognizer.ERROR_AUDIO) complete("AUDIO_ERROR");
                    else if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY || error == SpeechRecognizer.ERROR_TOO_MANY_REQUESTS) complete("BUSY");
                    else if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) complete(ready ? null : "START_FAILED");
                    else complete("RECOGNITION_FAILED");
                }
            });
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("locale"));
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            // System recognition is reached only after explicit network consent.
            // Forcing offline here fails on devices without the lesson's language pack.
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, onDevice);
            timeout = () -> { if (pending == call) complete("START_FAILED"); };
            handler.postDelayed(timeout, 8000);
            recognizer.startListening(intent);
        } catch (SecurityException error) { complete("PERMISSION_BLOCKED"); }
        catch (RuntimeException error) { complete("RECOGNITION_UNAVAILABLE"); }
    }

    private void inputReady(PluginCall call) {
        if (pending != call || ready) return;
        ready = true;
        clearTimeout();
        JSObject event = new JSObject();
        event.put("requestId", call.getString("requestId"));
        notifyListeners("ready", event);
        timeout = () -> { if (pending == call) endInput(); };
        handler.postDelayed(timeout, 20000);
    }

    private void readResult(Bundle result) {
        ArrayList<String> values = result.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        ArrayList<String> current = new ArrayList<>();
        if (values != null) for (String value : values) {
            if (value != null && !value.trim().isEmpty() && !current.contains(value.trim())) {
                current.add(value.trim());
                if (current.size() == 3) break;
            }
        }
        // Some services end with an empty bundle after valid partial speech.
        // Retain only the latest nonempty result from this attempt, never merge it.
        if (!current.isEmpty()) { alternatives = current; text = current.get(0); }
    }

    private void clearTimeout() { if (timeout != null) handler.removeCallbacks(timeout); timeout = null; }

    private void complete(String code) {
        PluginCall call = pending;
        pending = null;
        clearTimeout();
        SpeechRecognizer previous = recognizer; recognizer = null;
        String result = text; text = "";
        JSArray candidates = new JSArray(alternatives); alternatives.clear();
        ready = false;
        ending = false;
        if (previous != null) { previous.cancel(); previous.destroy(); }
        if (call == null) return;
        if (code != null) call.reject(code, code);
        else { JSObject value = new JSObject(); value.put("text", result); value.put("alternatives", candidates); call.resolve(value); }
    }

    private void endInput() {
        if (pending == null || recognizer == null || ending) return;
        ending = true;
        clearTimeout();
        PluginCall call = pending;
        recognizer.stopListening();
        if (pending != call) return;
        timeout = () -> { if (pending == call) complete(null); };
        handler.postDelayed(timeout, 4000);
    }

    @PluginMethod public void finish(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pending != null && recognizer == null) complete("CANCELLED");
            else endInput();
            call.resolve();
        });
    }
    @PluginMethod public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> { complete("CANCELLED"); call.resolve(); });
    }
    @PluginMethod public void openSettings(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            complete("CANCELLED");
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getContext().getPackageName())));
                call.resolve();
            } catch (RuntimeException error) { call.reject("Cannot open app settings", "SETTINGS_UNAVAILABLE"); }
        });
    }
    @Override protected void handleOnPause() {
        // A permission prompt also pauses the activity. Only stop an active mic.
        getActivity().runOnUiThread(() -> { if (recognizer != null) complete("INTERRUPTED"); });
    }
    @Override protected void handleOnStop() { getActivity().runOnUiThread(() -> complete("INTERRUPTED")); }
    @Override protected void handleOnDestroy() { getActivity().runOnUiThread(() -> complete("CANCELLED")); }
}
