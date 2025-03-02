package io.github.leok7v.app

import android.webkit.*
import java.io.File

class LocalWebViewClient(private val internalStoragePath: String) : WebViewClient() {

    override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
        val url = request?.url?.toString() ?: return null
        if (url.startsWith("app://./")) {
            val assetPath = url.removePrefix("app://./")
            return try {
                val assetStream = view?.context?.assets?.open(assetPath)
                val mimeType = getMimeType(assetPath)
                WebResourceResponse(mimeType, "UTF-8", assetStream)
            } catch (e: Exception) {
                // If not found in assets, try loading from internal storage
                val file = File(internalStoragePath, assetPath)
                if (file.exists()) {
                    val mimeType = getMimeType(file.name)
                    WebResourceResponse(mimeType, "UTF-8", file.inputStream())
                } else null
            }
        }
        return super.shouldInterceptRequest(view, request)
    }

    private fun getMimeType(fileName: String): String {
        return when (fileName.substringAfterLast('.', "").lowercase()) {
            "html", "htm" -> "text/html"
            "js" -> "text/javascript"
            "css" -> "text/css"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "gif" -> "image/gif"
            else -> "application/octet-stream"
        }
    }
}
