package com.mihye.seodang;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.robolectric.Shadows.shadowOf;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.content.pm.ServiceInfo;
import android.os.Bundle;
import android.os.Looper;
import android.speech.RecognitionService;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import androidx.appcompat.app.AppCompatActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.PluginCall;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.LooperMode;
import org.robolectric.shadows.ShadowSpeechRecognizer;

/** Exercises the native plugin with Android's recognizer shadow, without a real microphone. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 28)
@LooperMode(LooperMode.Mode.PAUSED)
public class SeodangRecognitionPluginTest {
    private ActivityController<TestActivity> activityController;
    private TestPlugin plugin;

    @Before public void setUp() {
        activityController = Robolectric.buildActivity(TestActivity.class).setup();
        plugin = new TestPlugin(activityController.get());
        ResolveInfo service = new ResolveInfo();
        service.serviceInfo = new ServiceInfo();
        service.serviceInfo.packageName = "test.recognition";
        service.serviceInfo.name = "test.recognition.Service";
        shadowOf(plugin.getContext().getPackageManager()).addResolveInfoForIntent(
            new Intent(RecognitionService.SERVICE_INTERFACE), service);
        ShadowSpeechRecognizer.setIsOnDeviceRecognitionAvailable(false);
    }

    @After public void tearDown() {
        plugin.cancel(new RecordingCall("cancel", new JSObject()));
        shadowOf(Looper.getMainLooper()).idle();
        activityController.pause().stop().destroy();
    }

    @Test public void consentedSystemRecognitionAllowsNetworkWithoutForcingOffline() {
        RecordingCall call = recognize("system", true, false);
        ShadowSpeechRecognizer recognizer = recognizer();
        Intent intent = recognizer.getLastRecognizerIntent();
        assertEquals("ko-KR", intent.getStringExtra(RecognizerIntent.EXTRA_LANGUAGE));
        assertEquals(3, intent.getIntExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 0));
        assertFalse(intent.getBooleanExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false));
        assertEquals(0, call.completions);
        assertTrue(plugin.events.isEmpty());
    }

    @Test public void systemRecognitionNeverStartsWithoutServiceConsent() {
        RecordingCall call = recognize("no-consent", false, false);
        assertEquals("SERVICE_CONSENT_REQUIRED", call.errorCode);
        assertNull(ShadowSpeechRecognizer.getLatestSpeechRecognizer());
        assertTrue(plugin.events.isEmpty());
    }

    @Test @Config(sdk = 33)
    public void onDeviceRecognitionKeepsOfflineModeWithoutNetworkConsent() {
        ShadowSpeechRecognizer.setIsOnDeviceRecognitionAvailable(true);
        RecordingCall call = recognize("on-device", false, false);
        assertTrue(recognizer().getLastRecognizerIntent()
            .getBooleanExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false));
        assertEquals(0, call.completions);
    }

    @Test @Config(sdk = 33)
    public void explicitSystemFallbackDoesNotReuseTheOfflineOnlyOption() {
        ShadowSpeechRecognizer.setIsOnDeviceRecognitionAvailable(true);
        recognize("system-fallback", true, true);
        assertFalse(recognizer().getLastRecognizerIntent()
            .getBooleanExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false));
    }

    @Test public void statusAdvertisesNativeReadyEvents() {
        RecordingCall call = new RecordingCall("status", new JSObject());
        plugin.status(call);
        shadowOf(Looper.getMainLooper()).idle();
        assertEquals(Boolean.TRUE, call.result.getBool("readyEvents"));
        assertEquals(Boolean.TRUE, call.result.getBool("available"));
    }

    @Test public void readyIsEmittedOnlyAfterNativeReadyAndIncludesTheRequestId() {
        RecordingCall call = recognize("ready-12", true, false);
        assertTrue(plugin.events.isEmpty());
        recognizer().triggerOnReadyForSpeech(new Bundle());
        assertEquals(1, plugin.events.size());
        assertEquals("ready", plugin.events.get(0).name);
        assertEquals("ready-12", plugin.events.get(0).data.getString("requestId"));
        assertEquals(0, call.completions);
        recognizer().triggerOnReadyForSpeech(new Bundle());
        assertEquals(1, plugin.events.size());
    }

    @Test public void noMatchBeforeReadyReportsStartupFailure() {
        RecordingCall call = recognize("early-no-match", true, false);
        recognizer().triggerOnError(SpeechRecognizer.ERROR_NO_MATCH);
        assertEquals("START_FAILED", call.errorCode);
        assertTrue(plugin.events.isEmpty());
        assertTrue(recognizer().isDestroyed());
    }

    @Test public void noMatchAfterReadyIsAnEmptyRecognitionResult() {
        RecordingCall call = recognize("heard-nothing", true, false);
        recognizer().triggerOnReadyForSpeech(new Bundle());
        recognizer().triggerOnError(SpeechRecognizer.ERROR_NO_MATCH);
        assertNull(call.errorCode);
        assertEquals("", call.result.getString("text"));
        assertEquals(1, call.completions);
    }

    @Test public void speechTimeoutBeforeReadyReportsStartupFailure() {
        RecordingCall call = recognize("early-timeout", true, false);
        recognizer().triggerOnError(SpeechRecognizer.ERROR_SPEECH_TIMEOUT);
        assertEquals("START_FAILED", call.errorCode);
    }

    @Test public void recoverableServiceErrorsPreserveTheirCause() {
        int[] errors = {SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
            SpeechRecognizer.ERROR_AUDIO, SpeechRecognizer.ERROR_RECOGNIZER_BUSY};
        String[] codes = {"NETWORK_ERROR", "NETWORK_ERROR", "AUDIO_ERROR", "BUSY"};
        for (int index = 0; index < errors.length; index++) {
            RecordingCall call = recognize("error-" + index, true, false);
            recognizer().triggerOnError(errors[index]);
            assertEquals(codes[index], call.errorCode);
            assertEquals(1, call.completions);
        }
    }

    @Test public void cancelledCallIgnoresLateReadyWithoutAffectingTheNextAttempt() {
        RecordingCall first = recognize("cancelled", true, false);
        ShadowSpeechRecognizer previous = recognizer();
        plugin.cancel(new RecordingCall("cancel", new JSObject()));
        RecordingCall second = recognize("current", true, false);
        previous.triggerOnReadyForSpeech(new Bundle());
        assertTrue(plugin.events.isEmpty());
        assertEquals("CANCELLED", first.errorCode);
        assertEquals(0, second.completions);
        recognizer().triggerOnReadyForSpeech(new Bundle());
        assertEquals("current", plugin.events.get(0).data.getString("requestId"));
    }

    @Test public void startupTimesOutAndReleasesTheRecognizerExactlyOnce() {
        RecordingCall call = recognize("startup-timeout", true, false);
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(7999));
        assertEquals(0, call.completions);
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(1));
        assertEquals("START_FAILED", call.errorCode);
        assertTrue(recognizer().isDestroyed());
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(20));
        assertEquals(1, call.completions);
    }

    @Test public void readyReplacesStartupDeadlineAndResultsClearTheRecordingTimeout() {
        RecordingCall call = recognize("ready-before-deadline", true, false);
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(6));
        recognizer().triggerOnReadyForSpeech(new Bundle());
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(4));
        assertEquals(0, call.completions);
        Bundle result = new Bundle();
        ArrayList<String> words = new ArrayList<>();
        words.add("저는 학생이에요.");
        result.putStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION, words);
        recognizer().triggerOnResults(result);
        assertEquals("저는 학생이에요.", call.result.getString("text"));
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(20));
        assertEquals(1, call.completions);
    }

    @Test public void cancellationRemovesTheStartupTimeout() {
        RecordingCall call = recognize("cancel-before-ready", true, false);
        plugin.cancel(new RecordingCall("cancel", new JSObject()));
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(20));
        assertEquals("CANCELLED", call.errorCode);
        assertEquals(1, call.completions);
        assertTrue(plugin.events.isEmpty());
    }

    @Test public void candidatesAreBoundedAndClearedBetweenAttempts() throws Exception {
        RecordingCall first = recognize("alternatives", true, false);
        Bundle result = new Bundle();
        result.putStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION,
            new ArrayList<>(List.of("저는 학성이에요", "저는 학생이에요.", "저는 회사원이에요", "fourth")));
        recognizer().triggerOnResults(result);
        assertEquals("저는 학성이에요", first.result.getString("text"));
        assertEquals(3, first.result.getJSONArray("alternatives").length());
        assertEquals("저는 학생이에요.", first.result.getJSONArray("alternatives").getString(1));
        RecordingCall second = recognize("empty", true, false);
        recognizer().triggerOnReadyForSpeech(new Bundle());
        recognizer().triggerOnResults(new Bundle());
        assertEquals("", second.result.getString("text"));
        assertEquals(0, second.result.getJSONArray("alternatives").length());
    }

    @Test public void manualFinishWaitsForFinalResultAndRepeatedFinishDoesNotExtendDeadline() {
        RecordingCall call = recognize("finish", true, false);
        recognizer().triggerOnReadyForSpeech(new Bundle());
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(12));
        assertEquals(0, call.completions);
        plugin.finish(new RecordingCall("finish", new JSObject()));
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(3));
        assertEquals(0, call.completions);
        plugin.finish(new RecordingCall("finish", new JSObject()));
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(1));
        assertEquals(1, call.completions);
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(20));
        assertEquals(1, call.completions);
    }

    @Test public void emptyFinalRetainsLatestPartialButNonemptyFinalReplacesIt() throws Exception {
        for (boolean emptyFinal : new boolean[]{true, false}) {
            RecordingCall call = recognize("partial-" + emptyFinal, true, false);
            Bundle partial = new Bundle();
            partial.putStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION,
                new ArrayList<>(List.of("저는 학생이에요.")));
            recognizer().triggerOnPartialResults(partial);
            Bundle result = new Bundle();
            if (!emptyFinal) result.putStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION,
                new ArrayList<>(List.of("저는 학생이 아니에요.")));
            recognizer().triggerOnResults(result);
            String expected = emptyFinal ? "저는 학생이에요." : "저는 학생이 아니에요.";
            assertEquals(expected, call.result.getString("text"));
            assertEquals(1, call.result.getJSONArray("alternatives").length());
            assertEquals(expected, call.result.getJSONArray("alternatives").getString(0));
        }
    }

    private RecordingCall recognize(String requestId, boolean allowNetwork, boolean preferSystem) {
        JSObject data = new JSObject();
        data.put("requestId", requestId);
        data.put("locale", "ko-KR");
        data.put("allowNetwork", allowNetwork);
        data.put("preferSystem", preferSystem);
        RecordingCall call = new RecordingCall("recognize", data);
        plugin.recognize(call);
        shadowOf(Looper.getMainLooper()).idle();
        return call;
    }

    private ShadowSpeechRecognizer recognizer() {
        SpeechRecognizer current = ShadowSpeechRecognizer.getLatestSpeechRecognizer();
        assertNotNull("Recognition should have created an Android recognizer", current);
        return shadowOf(current);
    }

    public static class TestActivity extends AppCompatActivity {
        @Override protected void onCreate(Bundle savedInstanceState) {
            setTheme(androidx.appcompat.R.style.Theme_AppCompat);
            super.onCreate(savedInstanceState);
        }
    }

    private static class Event {
        final String name;
        final JSObject data;
        Event(String name, JSObject data) { this.name = name; this.data = data; }
    }

    private static class TestPlugin extends SeodangRecognitionPlugin {
        private final AppCompatActivity activity;
        final List<Event> events = new ArrayList<>();
        TestPlugin(AppCompatActivity activity) { this.activity = activity; }
        @Override public Context getContext() { return activity; }
        @Override public AppCompatActivity getActivity() { return activity; }
        @Override public PermissionState getPermissionState(String alias) { return PermissionState.GRANTED; }
        @Override protected void notifyListeners(String eventName, JSObject data) {
            events.add(new Event(eventName, data));
        }
    }

    private static class RecordingCall extends PluginCall {
        JSObject result;
        String errorCode;
        int completions;
        RecordingCall(String method, JSObject data) {
            super(null, "SeodangRecognition", "test-callback", method, data);
        }
        @Override public void resolve(JSObject data) { result = data; completions++; }
        @Override public void resolve() { resolve(new JSObject()); }
        @Override public void reject(String message, String code, Exception exception, JSObject data) {
            errorCode = code; completions++;
        }
    }
}
