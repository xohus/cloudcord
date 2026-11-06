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
import org.lsposed.patch.ApkPatcher
import org.lsposed.patch.util.Logger
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.Locale
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream

class InjectRainXposedStep : Step() {
    override val group: StepGroup = StepGroup.Install
    override val localizedName: Int = R.string.patch_step_inject_rain

    private fun rebuildForSigning(apk: File) {
        val rebuilt = File(apk.parentFile, apk.name + ".repacked")
        try {
            ZipFile(apk).use { input ->
                ZipOutputStream(rebuilt.outputStream().buffered()).use { output ->
                    val entries = input.entries().asSequence().toList()
                        .sortedBy { if (it.name == "AndroidManifest.xml") 0 else 1 }
                    for (entry in entries) {
                        val clean = ZipEntry(entry.name).apply {
                            time = 315619200000L
                            method = entry.method
                            if (method == ZipEntry.STORED) {
                                size = entry.size
                                crc = entry.crc
                            }
                        }
                        // Do not retain the injector's 4 KiB alignment extra fields:
                        // apksig prioritizes those over its requested 16 KiB default.
                        output.putNextEntry(clean)
                        input.getInputStream(entry).use { it.copyTo(output, 128 * 1024) }
                        output.closeEntry()
                    }
                }
            }
            Files.move(rebuilt.toPath(), apk.toPath(), StandardCopyOption.REPLACE_EXISTING)
        } finally {
            rebuilt.delete()
        }
    }

    suspend fun patch(
        container: StepRunner,
        outputDir: File,
        apkPaths: List<String>,
        embeddedModules: List<String>,
    ) {
        withContext(Dispatchers.IO) {
            val logger = object : Logger() {
                    override fun d(p0: String?) {
                        container.log("[LSPatch:D] $p0")
                    }

                    override fun e(p0: String?) {
                        container.log("[LSPatch:E] $p0")
                    }

                    override fun i(p0: String?) {
                        container.log("[LSPatch] $p0")
                    }
                }
            val spec = LSPatch(
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
            ).toSpec()
            ApkPatcher(logger, spec).patch()
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
            rebuildForSigning(patched)
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
