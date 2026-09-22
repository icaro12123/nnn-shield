package org.nnn.shield;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSettingsPlugin.class);
        super.onCreate(savedInstanceState);

        // Make system status bar and navigation bar seamless with app background
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            int appBgColor = Color.parseColor("#0B0813");
            getWindow().setStatusBarColor(appBgColor);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getWindow().setNavigationBarColor(appBgColor);
            }
        }
    }

    @CapacitorPlugin(name = "NativeSettings")
    public static class NativeSettingsPlugin extends Plugin {
        @PluginMethod
        public void openNetworkSettings(PluginCall call) {
            String[] actions = new String[] {
                Settings.ACTION_WIRELESS_SETTINGS,
                Settings.ACTION_NETWORK_OPERATOR_SETTINGS,
                Settings.ACTION_SETTINGS
            };

            boolean success = false;
            for (String action : actions) {
                try {
                    Intent intent = new Intent(action);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    success = true;
                    break;
                } catch (Exception ignored) {}
            }

            if (success) {
                call.resolve();
            } else {
                call.reject("Impossibile aprire le impostazioni di sistema.");
            }
        }
    }
}
