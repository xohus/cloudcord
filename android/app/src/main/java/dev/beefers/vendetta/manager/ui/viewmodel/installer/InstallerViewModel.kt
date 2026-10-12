package dev.beefers.vendetta.manager.ui.viewmodel.installer

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.app.ShareCompat
import androidx.core.content.FileProvider
import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import dev.beefers.vendetta.manager.BuildConfig
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.domain.manager.InstallManager
import dev.beefers.vendetta.manager.installer.step.Step
import dev.beefers.vendetta.manager.installer.step.StepGroup
import dev.beefers.vendetta.manager.installer.step.StepRunner
import dev.beefers.vendetta.manager.utils.copyText
import dev.beefers.vendetta.manager.utils.DiscordVersion
import dev.beefers.vendetta.manager.utils.showToast
import kotlinx.collections.immutable.ImmutableMap
import kotlinx.collections.immutable.toImmutableMap
import kotlinx.coroutines.Job
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

class InstallerViewModel(
    private val context: Context,
    private val installManager: InstallManager,
    private val discordVersion: DiscordVersion
) : ScreenModel {

    var runner by mutableStateOf(StepRunner(discordVersion))
        private set

    val groupedSteps: ImmutableMap<StepGroup, List<Step>>
        get() = StepGroup.entries
            .associateWith { group ->
                runner.steps.filter { step -> step.group == group }
            }
            .toImmutableMap()

    private val tempLogStorageDir = context.filesDir.resolve("logsTmp").also {
        it.mkdirs()
    }

    private val logsString: String
        get() = runner.logger.logs.joinToString("\n") { it.toString() }

    private val installationRunning = AtomicBoolean(false)
    private val transitionMutex = Mutex()

    private var job: Job? = null

    init {
        startInstall()
    }

    var backDialogOpened by mutableStateOf(false)
        private set

    var expandedGroup by mutableStateOf<StepGroup?>(null)
        private set

    fun logError(msg: String?) {
        runner.logger.e("")
        runner.logger.e(msg)
    }

    fun clearCache() {
        runner.clearCache()
        context.showToast(R.string.msg_cleared_cache)
    }

    fun openBackDialog() {
        backDialogOpened = true
    }

    fun closeBackDialog() {
        backDialogOpened = false
    }

    fun dismissDownloadFailedDialog() {
        runner.downloadErrored = false
    }

    fun expandGroup(group: StepGroup?) {
        expandedGroup = group
    }

    fun launchVendetta() {
        installManager.current?.let {
            val intent = context.packageManager.getLaunchIntentForPackage(it.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }

    fun cancelInstall() {
        runCatching {
            job?.cancel("User exited the installer")
        }
    }

    fun retryInstall() {
        screenModelScope.launch {
            transitionMutex.withLock {
                job?.cancelAndJoin()
                runner = StepRunner(discordVersion, manualDiscordSource = runner.manualDiscordSource)
                startInstall()
            }
        }
    }

    fun importDiscordApk(uri: Uri?) {
        if (uri == null) return

        screenModelScope.launch {
            transitionMutex.withLock {
                job?.cancelAndJoin()
                val imported = withContext(Dispatchers.IO) {
                    copyImportToAppStorage(uri)
                }
                if (imported == null) {
                    context.showToast(R.string.msg_invalid_discord_apk)
                    return@withLock
                }
                runner = StepRunner(discordVersion, manualDiscordSource = imported)
                startInstall()
            }
        }
    }

    fun copyLogs() {
        val logText = if (runner.logFile.exists()) runner.logFile.readText() else logsString
        context.copyText(logText)
        context.showToast(R.string.msg_copied)
    }

    private fun startInstall() {
        val activeRunner = runner
        job = screenModelScope.launch(Dispatchers.Main) {
            if (installationRunning.getAndSet(true)) {
                return@launch
            }

            try {
                withContext(Dispatchers.IO) {
                    activeRunner.runAll()
                }
            } finally {
                installationRunning.set(false)
            }
        }
    }

    private fun copyImportToAppStorage(uri: Uri): File? {
        val fileName = queryFileName(uri) ?: uri.lastPathSegment ?: return null
        val extension = fileName.substringAfterLast('.', "").lowercase()
        if (extension !in setOf("apk", "apkm", "apks", "xapk")) {
            return null
        }

        val importDir = context.filesDir.resolve("manual-discord-import").also {
            it.deleteRecursively()
            it.mkdirs()
        }
        val out = importDir.resolve("discord-source.$extension")
        return try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                out.outputStream().use { output -> input.copyTo(output) }
            } ?: return null

            out.takeIf { it.exists() && it.canRead() && it.length() > 0 }
        } catch (_: Throwable) {
            null
        }
    }

    private fun queryFileName(uri: Uri): String? {
        return context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (nameIndex >= 0 && cursor.moveToFirst()) cursor.getString(nameIndex) else null
        }
    }

    private fun saveToAppStorage(): File {
        // Delete old logs to prevent junk buildup
        tempLogStorageDir.deleteRecursively()
        tempLogStorageDir.mkdirs()

        val tmpFile = tempLogStorageDir.resolve("VD-Manager-${System.currentTimeMillis()}.log")
        tmpFile.outputStream().use { stream ->
            stream.write(logsString.toByteArray())
        }

        return tmpFile
    }

    fun shareLogs(activityContext: Context) {
        val saved = saveToAppStorage()
        val uri = FileProvider.getUriForFile(
            activityContext,
            BuildConfig.APPLICATION_ID + ".provider",
            saved
        )

        ShareCompat.IntentBuilder(activityContext)
            .setType("text/plain")
            .setStream(uri)
            .apply {
                intent.apply {
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            }
            .startChooser()
    }

}
