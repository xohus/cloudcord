package com.aliucord.manager.patcher.steps.install

import com.aliucord.manager.patcher.StepRunner
import com.aliucord.manager.patcher.steps.StepGroup
import com.aliucord.manager.patcher.steps.base.Step
import com.aliucord.manager.patcher.steps.download.CopyDependenciesStep
import com.aliucord.manager.patcher.steps.download.DownloadRainXposedStep
import com.aliucord.manager.patcher.util.Signer
import dev.raincord.manager.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.lsposed.lspatch.share.LSPConfig
import org.lsposed.patch.LSPatch
import org.lsposed.patch.util.Logger
import java.io.File
import java.nio.file.Files
import java.util.Locale

class InjectRainXposedStep : Step() {
    override val group: StepGroup = StepGroup.Install
    override val localizedName: Int = R.string.patch_step_inject_rain

    suspend fun patch(
        container: StepRunner,
        outputDir: File,
        apkPaths: List<String>,
        embeddedModules: List<String>,
    ) {
        withContext(Dispatchers.IO) {
            LSPatch(
                object : Logger() {
                    override fun d(p0: String?) {
                        container.log("[LSPatch:D] $p0")
                    }

                    override fun e(p0: String?) {
                        container.log("[LSPatch:E] $p0")
                    }

                    override fun i(p0: String?) {
                        container.log("[LSPatch] $p0")
                    }
                },
                *apkPaths.toTypedArray(),
                "-o",
                outputDir.absolutePath,
                "-l",
                "0",
                "-v",
                "-m",
                *embeddedModules.toTypedArray(),
                "-k",
                Signer.getKeystoreFile().absolutePath,
                "password",
                "alias",
                "password"
            ).doCommandLine()
        }
    }

    override suspend fun execute(container: StepRunner) = withContext(Dispatchers.IO) {
        val apks = container.getStep<CopyDependenciesStep>().patchedApks
        val xposed = container.getStep<DownloadRainXposedStep>().targetFile

        container.log("Adding CloudCord module with LSPatch")
        container.log("CloudCord module path = ${xposed.absolutePath}")

        // Create temporary folder in working directory
        val tempDir = Files.createTempDirectory(apks.first().parentFile!!.toPath(), "lspatched-").toFile()

        try {
            patch(
                container,
                outputDir = tempDir,
                apkPaths = apks.map { it.absolutePath },
                embeddedModules = listOf(xposed.absolutePath)
            )

            // LSPatch signs its output with the supplied key. Verify the whole set before replacing any input.
            val outputs = apks.map { original ->
                val baseName = original.nameWithoutExtension
                val outputName = String.format(Locale.getDefault(), "%s-%d-lspatched.apk", baseName, LSPConfig.instance.VERSION_CODE)
                val patched = File(tempDir, outputName).takeIf { it.isFile }
                    ?: tempDir.listFiles { file -> file.isFile && file.name.startsWith("$baseName-") && file.name.endsWith("-lspatched.apk") }?.singleOrNull()
                    ?: error("Missing patched APK for ${original.name}")
                Signer.verifyApk(patched)
                original to patched
            }
            for ((original, patched) in outputs) {
                check(patched.renameTo(original)) { "Could not save patched APK: ${original.name}" }
                container.log("Verified and saved ${original.name}")
            }
        } finally {
            tempDir.deleteRecursively()
        }
    }
}
