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
        val dependencies = container.getStep<CopyDependenciesStep>()
        val base = dependencies.patchedApk
        val splits = dependencies.patchedApks.filterNot { it == base }
        val xposed = container.getStep<DownloadRainXposedStep>().targetFile

        container.log("Adding CloudCord module with LSPatch")
        container.log("CloudCord module path = ${xposed.absolutePath}")

        // Create temporary folder in working directory
        val tempDir = Files.createTempDirectory(base.parentFile!!.toPath(), "lspatched-").toFile()

        try {
            patch(
                container,
                outputDir = tempDir,
                apkPaths = listOf(base.absolutePath),
                embeddedModules = listOf(xposed.absolutePath)
            )

            val baseName = base.nameWithoutExtension
            val outputName = String.format(Locale.getDefault(), "%s-%d-lspatched.apk", baseName, LSPConfig.instance.VERSION_CODE)
            val patched = File(tempDir, outputName).takeIf { it.isFile }
                ?: tempDir.listFiles { file -> file.isFile && file.name.startsWith("$baseName-") && file.name.endsWith("-lspatched.apk") }?.singleOrNull()
                ?: error("Missing patched APK for ${base.name}")
            // Normalize the injector output with the same modern signer as the splits.
            Signer.signApk(patched)

            // Configuration splits carry resources and libraries, not application
            // entry points. Sign them with the base key without embedding a loader.
            for (split in splits) {
                Signer.signApk(split)
                container.log("Verified configuration split ${split.name}")
            }
            check(patched.renameTo(base)) { "Could not save patched APK: ${base.name}" }
            container.log("Verified and saved ${base.name}")
        } finally {
            tempDir.deleteRecursively()
        }
    }
}
