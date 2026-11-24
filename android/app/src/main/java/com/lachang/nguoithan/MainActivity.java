package com.lachang.nguoithan;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {

    private static MainActivity instance;
    private WebView webView;

    public static MainActivity getInstance() {
        return instance;
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Tự động cấp quyền Micro/Audio cho Web Speech API
                request.grant(request.getResources());
            }
        });

        // Tải trang web chính thức của Lá Chắn Người Thân
        webView.loadUrl("https://thanhthaohihihihi.vercel.app/");

        // Kiểm tra xem đã bật quyền lắng nghe thông báo chưa
        checkNotificationPermission();
    }

    private void checkNotificationPermission() {
        if (!isNotificationServiceEnabled()) {
            new AlertDialog.Builder(this)
                .setTitle("🛡️ BẢO VỆ NGƯỜI CAO TUỔI")
                .setMessage("Để ứng dụng tự động nhận diện tin nhắn lừa đảo và phát giọng nói hỏi ý kiến bác/cô/chú, vui lòng bật quyền 'Truy cập thông báo' cho ứng dụng Lá Chắn.")
                .setPositiveButton("Bật ngay", (dialog, which) -> {
                    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                    startActivity(intent);
                })
                .setNegativeButton("Để sau", null)
                .show();
        }
    }

    private boolean isNotificationServiceEnabled() {
        String pkgName = getPackageName();
        final String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (!TextUtils.isEmpty(flat)) {
            final String[] names = flat.split(":");
            for (String name : names) {
                final ComponentName cn = ComponentName.unflattenFromString(name);
                if (cn != null && TextUtils.equals(pkgName, cn.getPackageName())) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Bắn thông báo an toàn từ Android Service vào giao diện Web Lá Chắn
     */
    public static void dispatchNotificationToWeb(String title, String content, String packageName) {
        if (instance != null && instance.webView != null) {
            instance.runOnUiThread(() -> {
                try {
                    JSONObject json = new JSONObject();
                    json.put("title", title);
                    json.put("content", content);
                    json.put("packageName", packageName);

                    String script = String.format("if (typeof window.onReceiveAppNotification === 'function') { window.onReceiveAppNotification(%s); }", json.toString());
                    instance.webView.evaluateJavascript(script, null);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (instance == this) instance = null;
        super.onDestroy();
    }
}
