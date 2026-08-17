package io.github.thepratik92.tempo;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import java.util.Locale;

public class MainActivity extends BridgeActivity {

    /** Latest system-bar insets in CSS pixels: top, right, bottom, left. */
    private float[] safeArea = { 0f, 0f, 0f, 0f };

    /**
     * The narrow surface the web layer talks to. It needs two things the page
     * cannot work out for itself: how much room the system bars take, and a way
     * to say which direction to paint their icons — the theme lives in the web
     * app, so only it knows whether the ground behind the bars is light.
     */
    public class SystemBars {

        /** "top,right,bottom,left" in CSS pixels. */
        @JavascriptInterface
        public String insets() {
            return String.format(Locale.US, "%.1f,%.1f,%.1f,%.1f", safeArea[0], safeArea[1], safeArea[2], safeArea[3]);
        }

        @JavascriptInterface
        public void setLightBackground(final boolean light) {
            runOnUiThread(() -> applyBarIcons(light));
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Draw the WebView behind the status and navigation bars instead of
        // letting the window inset it — that inset is what left a band of window
        // background above the header and below the footer.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Otherwise Android paints its own scrim behind the bars, which puts
            // the bands straight back.
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
        applyBarIcons(false);

        // The bridge and its WebView are built during super.onCreate above.
        final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;

        webView.addJavascriptInterface(new SystemBars(), "TempoSystemBars");

        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            int ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime()).bottom;

            // Taking the window out of fitsSystemWindows also opts out of the
            // automatic resize when the keyboard opens, so the IME inset is
            // applied by hand. Margin rather than padding, so the WebView really
            // shrinks and the page's viewport height follows it.
            ViewGroup.MarginLayoutParams params = (ViewGroup.MarginLayoutParams) view.getLayoutParams();
            if (params.bottomMargin != ime) {
                params.bottomMargin = ime;
                view.setLayoutParams(params);
            }

            // Android WebView reports env(safe-area-inset-*) for a display
            // cutout but not for the system bars, so the page is told directly.
            // With the keyboard up the WebView already stops above it, so the
            // navigation bar is no longer under the page.
            float density = getResources().getDisplayMetrics().density;
            safeArea = new float[] { bars.top / density, bars.right / density, ime > 0 ? 0f : bars.bottom / density, bars.left / density };
            webView.evaluateJavascript(
                String.format(
                    Locale.US,
                    "document.documentElement.style.setProperty('--safe-top','%.1fpx');" +
                    "document.documentElement.style.setProperty('--safe-right','%.1fpx');" +
                    "document.documentElement.style.setProperty('--safe-bottom','%.1fpx');" +
                    "document.documentElement.style.setProperty('--safe-left','%.1fpx');",
                    safeArea[0],
                    safeArea[1],
                    safeArea[2],
                    safeArea[3]
                ),
                null
            );
            return windowInsets;
        });
    }

    private void applyBarIcons(boolean lightBackground) {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(lightBackground);
        controller.setAppearanceLightNavigationBars(lightBackground);
    }
}
