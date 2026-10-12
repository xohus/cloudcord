package dev.beefers.vendetta.manager.installer.step.download

import androidx.compose.runtime.Stable
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.installer.step.download.base.DownloadStep
import java.io.File
import android.content.Context
import dev.beefers.vendetta.manager.installer.util.ApkValidation
import org.koin.core.component.inject

/**
 * Downloads the base Discord APK
 */
@Stable
class DownloadBaseStep(
    dir: File,
    workingDir: File,
    private val version: String
): DownloadStep() {

    override val nameRes = R.string.step_dl_base

    override val url: String = "$baseUrl/tracker/download/$version/base"
    override val destination = dir.resolve("base-$version.apk")
    override val workingCopy = workingDir.resolve("base-$version.apk")
    override val failureLabel = "base APK"
    override val importsManualDiscordSource = true

    private val context: Context by inject()

    override suspend fun verify() {
        super.verify()
        ApkValidation.validateDiscordBase(destination, context, version)
    }

}
