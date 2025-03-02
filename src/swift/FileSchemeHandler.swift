import Foundation
import WebKit

class FileSchemeHandler: NSObject, WKURLSchemeHandler {

    func send_response(url: URL, urlSchemeTask: WKURLSchemeTask, message: String) {
        if let r = response(url, mt: "text/plain") {
            urlSchemeTask.didReceive(r)
            if let data = message.data(using: .utf8) {
                urlSchemeTask.didReceive(data)
                urlSchemeTask.didFinish()
            } else {
                print("Failed to encode response body as UTF-8.")
            }
        }
    }

    func log(_ webView: WKWebView, urlSchemeTask: WKURLSchemeTask, url: URL) {
        if let body = urlSchemeTask.request.httpBody {
            guard let request = String(data: body, encoding: .utf8) else {
                print("Failed to decode body as UTF-8 string.")
                return
            }
            print(request)
        }
        send_response(url: url, urlSchemeTask: urlSchemeTask, message: "")
    }


    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {

        func failWithError() {
            let error = NSError(domain: NSURLErrorDomain,
                                code: NSURLErrorResourceUnavailable,
                                userInfo: nil);
            urlSchemeTask.didFailWithError(error);
        }

        guard
            let u = urlSchemeTask.request.url,
            let p = u.path.removingPercentEncoding else {
                failWithError(); return
            }
        let resourcePath = p.hasPrefix("/") ? String(p.dropFirst()) : p
        guard let r = response(u, mt: mimeType(for: p)) else {
            failWithError(); return
        }
        if resourcePath == "log" {
            log(webView, urlSchemeTask: urlSchemeTask, url: u)
            return
        } else if resourcePath == "quit" {
            #if os(macOS)
            DispatchQueue.main.async {
                NSApplication.shared.windows.forEach { $0.close() }
            }
            #elseif os(iOS)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.001) {
                fatalError("Quit")
            }
            #endif
            return
        }
        guard let f = Bundle.main.url(forResource: resourcePath,
                                      withExtension: nil) else {
            failWithError(); return
        }
        let ext = URL(fileURLWithPath: resourcePath).pathExtension.lowercased()
        let binary = ["png", "jpg", "jpeg", "gif", "ico", "webp"].contains(ext)
        urlSchemeTask.didReceive(r)
        if binary {
            guard let data = try? Data(contentsOf: f) else {
                failWithError(); return
            }
            urlSchemeTask.didReceive(data)
        } else {
            guard
                let fileContent = try? String(contentsOf: f, encoding: .utf8),
                let data = fileContent.data(using: .utf8) else {
                    failWithError(); return
            }
            urlSchemeTask.didReceive(data)
        }
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
    }

    // Helper function to determine the MIME type based on file extension
    private func mimeType(for p: String) -> String {
        switch URL(fileURLWithPath: p).pathExtension.lowercased() {
            case "html", "htm": return "text/html"
            case "js": return "text/javascript"
            case "css": return "text/css"
            case "png": return "image/png"
            case "jpg", "jpeg": return "image/jpeg"
            default: return "application/octet-stream"
        }
    }
    
    let allowedOrigin = "app://"
    
    func response(_ u: URL, mt: String) -> HTTPURLResponse? {
        let responseHeaders = [
            "Access-Control-Allow-Origin": allowedOrigin,
            "Content-Type": mt,
            "Content-Security-Policy":
                "default-src 'self' app://;" +
                "img-src 'self' app:// data:;" +
                "style-src 'self' app:// 'unsafe-inline';" +
                "script-src 'self' app:// 'unsafe-inline';"
        ]
        return HTTPURLResponse(url: u,
                               statusCode: 200,
                               httpVersion: "HTTP/1.1",
                               headerFields: responseHeaders)
    }

}
