import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        WebView()
            .ignoresSafeArea()
    }
}

struct WebView: UIViewRepresentable {
    // URL du serveur de dev Pulse (localhost depuis le simulateur)
    // Pour un appareil physique, utilisez l'IP de votre machine
    private let devServerURL = "http://localhost:3000"

    // En Debug: charge depuis le serveur Pulse (hot-reload)
    // En Release: charge depuis les ressources locales
    #if DEBUG
    private let useDevServer = true
    #else
    private let useDevServer = false
    #endif

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()

        // Active JavaScript (nécessaire pour Pulse)
        configuration.preferences.javaScriptEnabled = true

        // Support du DOM Storage pour le store Pulse
        configuration.websiteDataStore = .default()

        // Permet le chargement des fichiers locaux
        configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator

        // Permet le scroll bouncing style iOS
        webView.scrollView.bounces = true

        // Désactive le zoom
        webView.scrollView.maximumZoomScale = 1.0
        webView.scrollView.minimumZoomScale = 1.0

        // Debug WebView en mode dev
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif

        // Charger l'app
        loadApp(webView: webView)

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Rien à faire ici
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    private func loadApp(webView: WKWebView) {
        if useDevServer {
            // Mode dev: charge depuis le serveur Pulse (hot-reload)
            if let url = URL(string: devServerURL) {
                let request = URLRequest(url: url)
                webView.load(request)
            }
        } else {
            // Mode prod: charge depuis les ressources locales
            if let indexPath = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "www") {
                let indexURL = URL(fileURLWithPath: indexPath)
                let wwwDir = indexURL.deletingLastPathComponent()
                webView.loadFileURL(indexURL, allowingReadAccessTo: wwwDir)
            }
        }
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("✅ Pulse app loaded")
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("❌ Navigation failed: \(error.localizedDescription)")
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            print("❌ Provisional navigation failed: \(error.localizedDescription)")
        }
    }
}

#Preview {
    ContentView()
}
