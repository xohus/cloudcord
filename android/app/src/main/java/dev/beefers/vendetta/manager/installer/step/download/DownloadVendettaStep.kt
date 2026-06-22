package dev.beefers.vendetta.manager.installer.step.download

import android.content.Context
import androidx.compose.runtime.Stable
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.domain.manager.PreferenceManager
import dev.beefers.vendetta.manager.installer.step.Step
import dev.beefers.vendetta.manager.installer.step.StepGroup
import dev.beefers.vendetta.manager.installer.step.StepRunner
import org.koin.core.component.inject
import java.io.File

@Stable
class DownloadVendettaStep(
    workingDir: File
) : Step() {

    private val context: Context by inject()
    private val preferenceManager: PreferenceManager by inject()

    override val group: StepGroup = StepGroup.DL
    override val nameRes: Int = R.string.step_dl_vd

    private val destination: File = preferenceManager.moduleLocation
    private val workingCopy: File = workingDir.resolve("xposed.apk")

    override suspend fun run(runner: StepRunner) {
        val assetName = "cloudcord-module.apk"

        destination.parentFile?.mkdirs()
        workingCopy.parentFile?.mkdirs()

        context.assets.open(assetName).use { input ->
            destination.outputStream().use { output ->
                input.copyTo(output)
            }
        }

        if (!destination.exists()) {
            error("Module file is missing: ${destination.absolutePath}")
        }

        if (destination.length() <= 0) {
            error("Module file is empty: ${destination.absolutePath}")
        }

        destination.copyTo(workingCopy, true)
        progress = 1f
    }
