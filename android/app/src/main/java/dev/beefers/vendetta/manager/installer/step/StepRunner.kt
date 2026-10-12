package dev.beefers.vendetta.manager.installer.step

import android.content.Context
import android.os.Build
import android.os.Environment
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dev.beefers.vendetta.manager.BuildConfig
import dev.beefers.vendetta.manager.domain.manager.PreferenceManager
import dev.beefers.vendetta.manager.installer.step.download.DownloadBaseStep
import dev.beefers.vendetta.manager.installer.step.download.DownloadLangStep
import dev.beefers.vendetta.manager.installer.step.download.DownloadLibsStep
import dev.beefers.vendetta.manager.installer.step.download.DownloadResourcesStep
import dev.beefers.vendetta.manager.installer.step.download.DownloadVendettaStep
import dev.beefers.vendetta.manager.installer.step.installing.InstallStep
import dev.beefers.vendetta.manager.installer.step.patching.AddVendettaStep
import dev.beefers.vendetta.manager.installer.step.patching.PatchManifestsStep
import dev.beefers.vendetta.manager.installer.step.patching.PresignApksStep
import dev.beefers.vendetta.manager.installer.step.patching.ReplaceIconStep
import dev.beefers.vendetta.manager.installer.util.LogEntry
import dev.beefers.vendetta.manager.installer.util.Logger
import dev.beefers.vendetta.manager.utils.DiscordVersion
import kotlinx.collections.immutable.ImmutableList
import kotlinx.collections.immutable.toImmutableList
import kotlinx.coroutines.delay
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import java.io.File
import java.time.Instant
import java.util.zip.ZipInputStream
import java.util.zip.ZipFile

/**
 * Runs all installation steps in order
 *
 * Credit to rushii (github.com/rushiiMachine)
 *
 * @param discordVersion Version of Discord to inject CloudCord into
 */
@Stable
class StepRunner(
    private val discordVersion: DiscordVersion,
    val manualDiscordSource: File? = null,
): KoinComponent {

    private val preferenceManager: PreferenceManager by inject()
    private val context: Context by inject()
    private val debugInfo = """
            CloudCord Manager v${BuildConfig.VERSION_NAME}
            Built from commit ${BuildConfig.GIT_COMMIT} on ${BuildConfig.GIT_BRANCH} ${if (BuildConfig.GIT_LOCAL_CHANGES || BuildConfig.GIT_LOCAL_COMMITS) "(Changes Present)" else ""}
            
            Installer start time: ${Instant.now()}
            Running Android ${Build.VERSION.RELEASE}, API level ${Build.VERSION.SDK_INT}
            Supported ABIs: ${Build.SUPPORTED_ABIS.joinToString()}
            Device: ${Build.MANUFACTURER} - ${Build.MODEL} (${Build.DEVICE})
            ${if(Build.VERSION.SDK_INT > Build.VERSION_CODES.S) "SOC: ${Build.SOC_MANUFACTURER} ${Build.SOC_MODEL}\n" else "\n\n"} 
            Adding CloudCord to Discord v$discordVersion
            Discord source: ${manualDiscordSource?.absolutePath ?: "automatic download"}
            
            
        """.trimIndent()

    val logFile: File = context.filesDir.resolve("cloudcord-installer.log").also {
        it.parentFile?.mkdirs()
        it.writeText("")
    }

    /**
     * Logger associated with this runner
     */
    val logger = Logger("StepRunner", logFile).also { logger ->
        debugInfo.split("\n").forEach {
            logger.logs += LogEntry(it, LogEntry.Level.INFO) // Add debug information to logs but don't print to logcat
            logFile.appendText(LogEntry(it, LogEntry.Level.INFO).toString() + "\n")
        }
    }

    /**
     * Root directory for all downloaded files
     */
    private val cacheDir =
        context.externalCacheDir
        ?: File(Environment.getExternalStorageDirectory(), Environment.DIRECTORY_DOWNLOADS)
            .resolve("CloudCordManager")
            .also { it.mkdirs() }

    /**
     * Where version specific downloads are persisted
     */
    private val discordCacheDir = cacheDir.resolve(discordVersion.toVersionCode())

    /**
     * Working directory where apks are directly modified (i.e. replacing the app icon)
     */
    private val patchedDir = discordCacheDir.resolve("patched").also { it.deleteRecursively() }

    /**
     * Where apks are moved to once signed
     */
    private val signedDir = discordCacheDir.resolve("signed").also { it.deleteRecursively() }

    /**
     * Output directory for LSPatch
     */
    private val lspatchedDir = patchedDir.resolve("lspatched").also { it.deleteRecursively() }

    var currentStep by mutableStateOf<Step?>(null)
        private set

    /**
     * Whether or not the patching/installation process has completed.
     * Note that this does not mean all steps were finished successfully
     */
    var completed by mutableStateOf(false)
        private set

    /**
     * Whether or not a download step failed, this is only for errors related to network conditions and not cancellations
     */
    var downloadErrored by mutableStateOf(false)

    var failure by mutableStateOf<InstallerFailure?>(null)
        private set

    private var manualDiscordImported = false
    private val mutableDiscordApks = mutableListOf<File>()

    val discordApks: List<File>
        get() = mutableDiscordApks.toList()

    /**
     * List of steps to go through for this install
     *
     * ORDER MATTERS
     */
    val steps: ImmutableList<Step> = buildList {
        // Downloading
        add(DownloadBaseStep(discordCacheDir, patchedDir, discordVersion.toVersionCode()))
        add(DownloadLibsStep(discordCacheDir, patchedDir, discordVersion.toVersionCode()))
        add(DownloadLangStep(discordCacheDir, patchedDir, discordVersion.toVersionCode()))
        add(DownloadResourcesStep(discordCacheDir, patchedDir, discordVersion.toVersionCode()))
        add(DownloadVendettaStep(patchedDir))

        // Patching
        if (preferenceManager.patchIcon) add(ReplaceIconStep())
        add(PatchManifestsStep())
        add(PresignApksStep(signedDir))
        add(AddVendettaStep(signedDir, lspatchedDir))

        // Installing
        add(InstallStep(lspatchedDir))
    }.toImmutableList()

    /**
     * Get a step that has already been successfully executed.
     * This is used to retrieve previously executed dependency steps from a later step.
     */
    inline fun <reified T : Step> getCompletedStep(): T {
        val step = steps.asSequence()
            .filterIsInstance<T>()
            .filter { it.status == StepStatus.SUCCESSFUL }
            .firstOrNull()

        if (step == null) {
            throw IllegalArgumentException("No completed step ${T::class.simpleName} exists in container")
        }

        return step
    }

    /**
     * Clears all cached files
     */
    fun clearCache() {
        cacheDir.deleteRecursively()
    }

    fun registerDiscordApk(file: File) {
        if (mutableDiscordApks.none { it.absolutePath == file.absolutePath }) {
            mutableDiscordApks += file
        }
    }

    fun importManualDiscordSource() {
        if (manualDiscordImported) return

        val source = manualDiscordSource
            ?: throw IllegalStateException("No manual Discord source is configured")

        logger.i("Importing manual Discord source: ${source.absolutePath}")
        if (!source.exists() || !source.canRead() || source.length() <= 0) {
            throw IllegalArgumentException("Invalid Discord APK/APKM file")
        }

        patchedDir.mkdirs()
        val extension = source.extension.lowercase()
        if (extension == "apk") {
            dev.beefers.vendetta.manager.installer.util.ApkValidation.validate(source)
            val out = patchedDir.resolve(source.name.ifBlank { "manual-discord.apk" })
            source.copyTo(out, overwrite = true)
            logger.i("Imported manual APK to ${out.absolutePath} (${out.length()} bytes)")
            registerDiscordApk(out)
        } else {
            // ZipInputStream alone accepts truncated archives without a central directory.
            ZipFile(source).use { zip ->
                require(zip.entries().asSequence().any { it.name.endsWith(".apk", ignoreCase = true) }) {
                    "APK bundle contains no APK files"
                }
            }
            ZipInputStream(source.inputStream().buffered()).use { zip ->
                while (true) {
                    val entry = zip.nextEntry ?: break
                    if (!entry.isDirectory && entry.name.endsWith(".apk", ignoreCase = true)) {
                        val name = File(entry.name).name.ifBlank { "split-${mutableDiscordApks.size}.apk" }
                        val out = patchedDir.resolve(name)
                        require(!out.exists()) { "APK bundle contains duplicate split filenames" }
                        out.outputStream().use { output -> zip.copyTo(output) }
                        dev.beefers.vendetta.manager.installer.util.ApkValidation.validate(out)
                        logger.i("Imported manual split ${entry.name} to ${out.absolutePath} (${out.length()} bytes)")
                        registerDiscordApk(out)
                    }
                    zip.closeEntry()
                }
            }
        }

        if (mutableDiscordApks.isEmpty()) {
            throw IllegalArgumentException("Invalid Discord APK/APKM file")
        }

        val bases = mutableDiscordApks.filter {
            dev.beefers.vendetta.manager.installer.util.AxmlUtil.isBaseApk(it)
        }
        require(bases.size == 1) { "Import must contain exactly one Discord base APK plus its splits" }
        // Archive entry order is not guaranteed. Patching expects the base first.
        mutableDiscordApks.remove(bases.single())
        mutableDiscordApks.add(0, bases.single())

        manualDiscordImported = true
    }

    /**
     * Run all the [steps] in order
     */
    suspend fun runAll(): Throwable? {
        for (step in steps) {
            if (completed) return null // Failsafe in case runner is incorrectly marked as not completed too early

            currentStep = step
            val error = step.runCatching(this)
            if (error != null) {
                logger.e("Failed on ${step::class.simpleName}", error)
                failure = InstallerFailure(
                    title = error.message ?: "Installer failed",
                    details = error.stackTraceToString().trim(),
                )

                completed = true
                return error
            }

            // Add delay for human psychology and
            // better group visibility in UI (the active group can change way too fast)
            if (!preferenceManager.isDeveloper && step.durationMs < 1000) {
                delay(1000L - step.durationMs)
            }
        }

        completed = true
        return null
    }

}

data class InstallerFailure(
    val title: String,
    val details: String,
)
