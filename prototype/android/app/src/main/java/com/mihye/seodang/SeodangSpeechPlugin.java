package com.mihye.seodang;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "SeodangSpeech")
public class SeodangSpeechPlugin extends Plugin {
    private TextToSpeech speech;
    private volatile boolean ready;
    private final ConcurrentHashMap<String, PluginCall> pending = new ConcurrentHashMap<>();

    @Override public void load() {
        getActivity().runOnUiThread(() -> {
            speech = new TextToSpeech(getContext(), status -> ready = status == TextToSpeech.SUCCESS);
            speech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { finish(id, false); }
                @Override public void onError(String id) { finish(id, true); }
                @Override public void onStop(String id, boolean interrupted) { finish(id, false); }
            });
        });
    }

    private void finish(String id, boolean failed) {
        PluginCall call = pending.remove(id);
        if (call != null) {
            if (failed) call.reject("Device speech failed"); else call.resolve();
        }
    }

    private void stopSpeech() {
        if (speech != null) speech.stop();
        for (String id : pending.keySet()) finish(id, false);
    }

    @PluginMethod public void speak(PluginCall call) {
        String text = call.getString("text");
        String language = call.getString("locale");
        if (text == null || text.isEmpty() || !("ja-JP".equals(language) || "ko-KR".equals(language))) {
            call.reject("Invalid speech text or locale");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (!ready || speech == null) { call.reject("Device speech is not ready"); return; }
            stopSpeech();
            int availability = speech.setLanguage(Locale.forLanguageTag(language));
            if (availability < TextToSpeech.LANG_AVAILABLE) {
                call.reject("Install a voice for this language in device settings");
                return;
            }
            speech.setSpeechRate(0.9f);
            String id = UUID.randomUUID().toString();
            pending.put(id, call);
            if (speech.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) == TextToSpeech.ERROR) finish(id, true);
        });
    }

    @PluginMethod public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { stopSpeech(); call.resolve(); });
    }

    @Override protected void handleOnPause() { stopSpeech(); }
    @Override protected void handleOnDestroy() {
        ready = false;
        stopSpeech();
        if (speech != null) speech.shutdown();
    }
}
