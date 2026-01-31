package com.pulse.example;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    // URL du serveur de dev Pulse (10.0.2.2 = localhost depuis l'émulateur)
    // Pour un appareil physique, utilisez l'IP de votre machine
    private static final String DEV_SERVER_URL = "http://10.0.2.2:3000";

    // Passer à true pour le hot-reload pendant le développement
    private static final boolean USE_DEV_SERVER = BuildConfig.DEBUG;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        setupWebView();

        // En dev: charge depuis le serveur Pulse (hot-reload)
        // En prod: charge depuis les assets
        if (USE_DEV_SERVER) {
            webView.loadUrl(DEV_SERVER_URL);
        } else {
            webView.loadUrl("file:///android_asset/index.html");
        }
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        // Active JavaScript (nécessaire pour Pulse)
        settings.setJavaScriptEnabled(true);

        // Support du DOM Storage pour le store Pulse
        settings.setDomStorageEnabled(true);

        // Permet le chargement des fichiers locaux
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Mixed content pour le dev server
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Améliore les performances
        settings.setCacheMode(USE_DEV_SERVER ? WebSettings.LOAD_NO_CACHE : WebSettings.LOAD_DEFAULT);

        // Clients pour gérer la navigation
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        // Debug WebView en mode dev
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }

    @Override
    public void onBackPressed() {
        // Permet la navigation arrière dans l'app Pulse
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
