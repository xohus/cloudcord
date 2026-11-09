package com.aliucord.manager

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.aliucord.manager.patcher.RainPatchRunner
import com.aliucord.manager.patcher.steps.download.CopyDependenciesStep
import com.aliucord.manager.patcher.steps.install.InstallStep
import com.aliucord.manager.ui.screens.patchopts.PatchOptions
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Test
import org.junit.runner.RunWith

/** Runs the production patch pipeline; CI installs its exact output with PackageManager. */
@RunWith(AndroidJUnit4::class)
class PatchPipelineTest {
    @Test
    fun patchLatestDiscord() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val results = context.filesDir.resolve("pipeline-results").apply { mkdirs() }
        val arguments = InstrumentationRegistry.getArguments()
        val version = arguments.getString("discordVersion")
        val defaults = PatchOptions.Default
        val packageName = arguments.getString("clientPackage") ?: defaults.packageName
        val options = (if (version.isNullOrBlank()) defaults else
            PatchOptions.Default.copy(isDevMode = true, customVersionCode = version)
        ).copy(packageName = packageName)
        val runner = RainPatchRunner(options)
        try {
            withTimeout(15 * 60 * 1000L) {
                for (step in runner.steps) {
                    if (step is InstallStep) break
                    runner.log("Integration test: ${step.javaClass.simpleName}")
                    step.executeCatching(runner)?.let { throw it }
                }
                for (apk in runner.getStep<CopyDependenciesStep>().patchedApks) {
                    apk.copyTo(results.resolve(apk.name), overwrite = true)
                }
            }
        } finally {
            results.resolve("patch.log").writeText(runner.getLog())
        }
    }
}
