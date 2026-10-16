package com.mihye.seodang;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SeodangSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
