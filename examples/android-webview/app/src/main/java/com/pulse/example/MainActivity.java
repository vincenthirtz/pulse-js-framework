package com.pulse.example;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        setupWebView();

        // Charge l'app Pulse depuis les assets
        webView.loadUrl("file:///android_asset/index.html");
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

        // Améliore les performances
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Clients pour gérer la navigation
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
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
