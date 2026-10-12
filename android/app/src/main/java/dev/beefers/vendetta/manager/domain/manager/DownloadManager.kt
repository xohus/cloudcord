package dev.beefers.vendetta.manager.domain.manager

import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpRequestTimeoutException
import io.ktor.client.request.prepareGet
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsChannel
import io.ktor.http.isSuccess
import io.ktor.utils.io.readAvailable
import kotlinx.coroutines.CancellationException
import java.io.File
import java.net.SocketTimeoutException

class DownloadManager(
    private val httpClient: HttpClient,
    private val prefs: PreferenceManager
) {

    suspend fun downloadDiscordApk(version: String, out: File, onProgressUpdate: (Float?) -> Unit): DownloadResult =
        download("${prefs.mirror.baseUrl}/tracker/download/$version/base", out, onProgressUpdate)

    suspend fun downloadSplit(version: String, split: String, out: File, onProgressUpdate: (Float?) -> Unit): DownloadResult =
        download("${prefs.mirror.baseUrl}/tracker/download/$version/$split", out, onProgressUpdate)

    suspend fun downloadUpdate(out: File, url: String) =
        download(
            url,
            out
        ) {
            // got to add this later
        }

    /**
     * Start a cancellable download with explicit client timeouts.
     * @param url Remote src url
     * @param out Target path to download to
     * @param onProgressUpdate Download progress update in a `[0,1]` range, and if null then the
     *                         total size is unknown.
     */
    suspend fun download(
        url: String,
        out: File,
        onProgressUpdate: (Float?) -> Unit
    ): DownloadResult {
        return try {
            out.parentFile?.mkdirs()
            var bytesDownloaded = 0L

            httpClient.prepareGet(url).execute { response: HttpResponse ->
                val statusCode = response.status.value
                if (!response.status.isSuccess()) {
                    return@execute DownloadResult.Error(
                        url = url,
                        httpStatusCode = statusCode,
                        exceptionMessage = response.status.description,
                        bytesDownloaded = bytesDownloaded,
                    )
                }

                val totalBytes = response.headers["Content-Length"]?.toLongOrNull()
                val channel = response.bodyAsChannel()
                val buffer = ByteArray(DEFAULT_BUFFER_SIZE)

                out.outputStream().use { output ->
                    while (true) {
                        val read = channel.readAvailable(buffer)
                        if (read == -1) break
                        output.write(buffer, 0, read)
                        bytesDownloaded += read
                        onProgressUpdate(totalBytes?.takeIf { it > 0 }?.let {
                            bytesDownloaded.toFloat() / it
                        })
                    }
                }

                require(totalBytes == null || totalBytes <= 0 || bytesDownloaded == totalBytes) {
                    "Incomplete download: expected $totalBytes bytes, received $bytesDownloaded"
                }
                DownloadResult.Success(
                    httpStatusCode = statusCode,
                    bytesDownloaded = bytesDownloaded,
                )
            }
        } catch (e: CancellationException) {
            out.delete()
            DownloadResult.Cancelled(systemTriggered = false)
        } catch (t: Throwable) {
            out.delete()
            DownloadResult.Error(
                url = url,
                httpStatusCode = null,
                exceptionMessage = t.message ?: t::class.java.simpleName,
                bytesDownloaded = out.length(),
                stacktrace = t.stackTraceToString(),
                timedOut = t is HttpRequestTimeoutException || t is SocketTimeoutException,
            )
        }
    }

}

sealed interface DownloadResult {
    data class Success(
        val httpStatusCode: Int,
        val bytesDownloaded: Long,
    ) : DownloadResult

    data class Cancelled(val systemTriggered: Boolean) : DownloadResult

    data class Error(
        val url: String,
        val httpStatusCode: Int?,
        val exceptionMessage: String,
        val bytesDownloaded: Long,
        val stacktrace: String? = null,
        val timedOut: Boolean = false,
    ) : DownloadResult
}
