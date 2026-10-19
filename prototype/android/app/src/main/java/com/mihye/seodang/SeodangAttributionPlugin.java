package com.mihye.seodang;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.atomic.AtomicBoolean;

/** Called by JS only after explicit version 3 analytics consent. */
@CapacitorPlugin(name = "SeodangAttribution")
public class SeodangAttributionPlugin extends Plugin {
    @PluginMethod public void getInstallReferrer(PluginCall call) {
        InstallReferrerClient client = InstallReferrerClient.newBuilder(getContext()).build();
        AtomicBoolean finished = new AtomicBoolean(false);
        Handler handler = new Handler(Looper.getMainLooper());
        Runnable timeout = () -> {
            if (finished.compareAndSet(false, true)) {
                client.endConnection();
                call.reject("Install source unavailable");
            }
        };
        handler.postDelayed(timeout, 10000);
        try {
            client.startConnection(new InstallReferrerStateListener() {
                @Override public void onInstallReferrerSetupFinished(int code) {
                    if (!finished.compareAndSet(false, true)) return;
                    handler.removeCallbacks(timeout);
                    try {
                        if (code != InstallReferrerClient.InstallReferrerResponse.OK) {
                            call.reject("Install source unavailable");
                            return;
                        }
                        String raw = client.getInstallReferrer().getInstallReferrer();
                        JSObject result = new JSObject();
                        if (raw != null && raw.length() <= 4096) {
                            Uri query = Uri.parse("https://referrer.invalid/?" + raw);
                            for (String key : new String[]{"utm_source", "utm_medium", "utm_campaign", "utm_content"}) {
                                String value = query.getQueryParameter(key);
                                if (value != null && value.matches("[a-zA-Z0-9_-]{1,100}")) result.put(key, value);
                            }
                        }
                        result.put("acquisition_status", result.has("utm_source") ? "attributed" : "unattributed");
                        // Package installation time separates old installs observed after an update.
                        result.put("installTimeMs", getContext().getPackageManager()
                                .getPackageInfo(getContext().getPackageName(), 0).firstInstallTime);
                        call.resolve(result);
                    } catch (Exception e) {
                        call.reject("Install source unavailable");
                    } finally { client.endConnection(); }
                }
                @Override public void onInstallReferrerServiceDisconnected() { timeout.run(); }
            });
        } catch (Exception e) { timeout.run(); }
    }
}
