package com.mihye.seodang;

import android.os.Bundle;
import android.content.res.Configuration;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SeodangSpeechPlugin.class);
        registerPlugin(SeodangAttributionPlugin.class);
        super.onCreate(savedInstanceState);
        applyAppTextZoom();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            private boolean pending;

            @Override public void handleOnBackPressed() {
                if (pending) return;
                if (getBridge() == null || getBridge().getWebView() == null) {
                    moveTaskToBack(true);
                    return;
                }
                pending = true;
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new Event('seodang:back',{cancelable:true}))",
                    unhandled -> {
                        pending = false;
                        if (!"false".equals(unhandled)) moveTaskToBack(true);
                    }
                );
            }
        });
    }

    @Override public void onConfigurationChanged(Configuration configuration) {
        super.onConfigurationChanged(configuration);
        applyAppTextZoom();
    }

    private void applyAppTextZoom() {
        // App text sizing (100% / 120%) is controlled by its own reading setting.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setTextZoom(100);
        }
    }
}
