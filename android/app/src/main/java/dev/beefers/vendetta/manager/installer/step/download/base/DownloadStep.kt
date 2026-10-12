package dev.beefers.vendetta.manager.installer.step.download.base

import android.content.Context
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.domain.manager.DownloadManager
import dev.beefers.vendetta.manager.domain.manager.DownloadResult
import dev.beefers.vendetta.manager.domain.manager.PreferenceManager
import dev.beefers.vendetta.manager.installer.step.Step
import dev.beefers.vendetta.manager.installer.step.StepGroup
import dev.beefers.vendetta.manager.installer.step.StepRunner
import dev.beefers.vendetta.manager.installer.step.StepStatus
import dev.beefers.vendetta.manager.installer.util.ApkValidation
import dev.beefers.vendetta.manager.utils.mainThread
import dev.beefers.vendetta.manager.utils.showToast
import kotlinx.coroutines.CancellationException
import org.koin.core.component.inject
import java.io.File
import kotlin.math.roundToInt

/**
 * Specialized step used to download a file
 *
 * Files are downloaded to [destination] then copied to [workingCopy] for safe patching
 */
@Stable
abstract class DownloadStep: Step() {

    protected val preferenceManager: PreferenceManager by inject()
    protected val baseUrl = preferenceManager.mirror.baseUrl

    private val downloadManager: DownloadManager by inject()
    private val context: Context by inject()

    /**
     * Url of the desired file to download
     */
    abstract val url: String

    /**
     * Where to download the file to
     */
    abstract val destination: File

    /**
     * Where the downloaded file should be copied to so that it can be used for patching
     */
    abstract val workingCopy: File

    protected open val failureLabel: String = "APK"
    protected open val importsManualDiscordSource: Boolean = false

    override val group: StepGroup = StepGroup.DL

    var cached by mutableStateOf(false)
        private set

    /**
     * Verifies that a file was properly downloaded
     */
    open suspend fun verify() {
        if (!destination.exists())
            error("Downloaded file is missing: ${destination.absolutePath}")

        if (destination.length() <= 0)
            error("Downloaded file is empty: ${destination.absolutePath}")
        ApkValidation.validate(destination)
    }

    override suspend fun run(runner: StepRunner) {
        val fileName = destination.name
        if (runner.manualDiscordSource != null) {
            if (importsManualDiscordSource) {
                runner.importManualDiscordSource()
                progress = 1f
            } else {
                runner.logger.i("Skipping $fileName download because a manual Discord source was imported")
                progress = 1f
            }
            return
        }

        runner.logger.i("Checking if $fileName is cached")
        if (destination.exists()) {
            runner.logger.i("Checking if $fileName isn't empty")
            val validCache = try {
                verify()
                true
            } catch (e: Exception) {
                runner.logger.i("Discarding invalid cached APK: ${e.message}")
                false
            }
            if (validCache) {
                runner.logger.i("$fileName is cached")
                cached = true

                runner.logger.i("Moving $fileName to working directory")
                destination.copyTo(workingCopy, true)
                runner.registerDiscordApk(workingCopy)

                status = StepStatus.SUCCESSFUL
                return
            }

            runner.logger.i("Deleting invalid cached file: $fileName")
            destination.delete()
        }

        runner.logger.i("$fileName was not properly cached, downloading now")
        runner.logger.i("Download URL: $url")
        runner.logger.i("Download destination: ${destination.absolutePath}")
        runner.logger.i("Download start: $fileName")
        var lastProgress: Float? = null
        val result = downloadManager.download(url, destination) { newProgress ->
            progress = newProgress
            if (newProgress != lastProgress && newProgress != null) {
                lastProgress = newProgress
                runner.logger.d("$fileName download progress: ${(lastProgress!! * 100f).roundToInt()}%")
            }
        }

        when (result) {
            is DownloadResult.Success -> {
                runner.logger.i("Download end: $fileName")
                runner.logger.i("HTTP status code: ${result.httpStatusCode}")
                runner.logger.i("Bytes downloaded: ${result.bytesDownloaded}")
                try {
                    runner.logger.i("Verifying downloaded file")
                    verify()
                    runner.logger.i("$fileName downloaded successfully")
                } catch (t: Throwable) {
                    destination.delete()
                    mainThread {
                        context.showToast(R.string.msg_download_verify_failed)
                    }

                    throw t
                }
                runner.logger.i("Moving $fileName to working directory")
                destination.copyTo(workingCopy, true)
                runner.registerDiscordApk(workingCopy)
            }

            is DownloadResult.Error -> {
                val status = result.httpStatusCode?.toString() ?: "unavailable"
                val message = buildString {
                    append("Failed to download $failureLabel")
                    append("\nURL: ${result.url}")
                    append("\nHTTP status: $status")
                    append("\nException: ${result.exceptionMessage}")
                }

                runner.logger.e("Failed to download $failureLabel")
                runner.logger.e("URL attempted: ${result.url}")
                runner.logger.e("HTTP status code: $status")
                runner.logger.e("Bytes downloaded: ${result.bytesDownloaded}")
                if (result.timedOut) runner.logger.e("Timeout error")
                runner.logger.e("Exception message: ${result.exceptionMessage}")
                result.stacktrace?.let { runner.logger.e(it) }

                mainThread {
                    context.showToast(R.string.msg_download_failed)
                    runner.downloadErrored = true
                }

                throw DownloadStepException(message)
            }

            is DownloadResult.Cancelled -> {
                status = StepStatus.UNSUCCESSFUL
                throw CancellationException("$fileName download cancelled")
            }
        }
    }

}

class DownloadStepException(message: String) : Exception(message)
