package com.aliucord.manager.patcher.steps.download

import android.content.Context
import com.aliucord.manager.manager.PathManager
import com.aliucord.manager.network.utils.SemVer
import com.aliucord.manager.patcher.StepRunner
import com.aliucord.manager.patcher.steps.base.DownloadStep
import dev.raincord.manager.R
import org.koin.core.component.inject
import java.util.zip.ZipFile

// CloudCord modification: only use the checksum-pinned module bundled by CI.
class DownloadRainXposedStep : DownloadStep() {
    private val context: Context by inject()
    private val paths: PathManager by inject()
    override val localizedName = R.string.patch_step_dl_rainxposed
    val targetVersion = SemVer.parse("1.0.0")
    override val targetFile get() = paths.cachedRainXposed(targetVersion)
    override val targetUrl = "bundled:cloudcord-module.apk"
    override suspend fun execute(container: StepRunner) {
        container.log("Preparing bundled CloudCord Xposed module")
        targetFile.parentFile!!.mkdirs()
        context.assets.open("cloudcord-module.apk").use { input ->
            targetFile.outputStream().use { output -> input.copyTo(output) }
        }
        ZipFile(targetFile).use { zip ->
            check(zip.getEntry("AndroidManifest.xml") != null) { "Invalid CloudCord module" }
            check(zip.getEntry("assets/xposed_init") != null) { "Missing CloudCord Xposed entry point" }
        }
    }
}
