package dev.beefers.vendetta.manager.ui.viewmodel.home

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Environment
import android.provider.Settings
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.cachedIn
import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import dev.beefers.vendetta.manager.BuildConfig
import dev.beefers.vendetta.manager.domain.manager.DownloadManager
import dev.beefers.vendetta.manager.domain.manager.DownloadResult
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.installer.util.ApkValidation
import dev.beefers.vendetta.manager.installer.util.Signer
import dev.beefers.vendetta.manager.utils.showToast
import dev.beefers.vendetta.manager.domain.manager.InstallManager
import dev.beefers.vendetta.manager.domain.manager.InstallMethod
import dev.beefers.vendetta.manager.domain.manager.PreferenceManager
import dev.beefers.vendetta.manager.domain.repository.RestRepository
import dev.beefers.vendetta.manager.installer.Installer
import dev.beefers.vendetta.manager.installer.session.SessionInstaller
import dev.beefers.vendetta.manager.installer.shizuku.ShizukuInstaller
import dev.beefers.vendetta.manager.network.dto.Release
import dev.beefers.vendetta.manager.network.utils.CommitsPagingSource
import dev.beefers.vendetta.manager.network.utils.dataOrNull
import dev.beefers.vendetta.manager.utils.DiscordVersion
import dev.beefers.vendetta.manager.utils.isMiui
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.CancellationException
import java.security.MessageDigest
import java.io.File

// help me
fun versionStringToCode(version: String): Int {
    val parts = version.split('.').mapNotNull { it.toIntOrNull() }
    val major = parts.getOrNull(0) ?: 0
    val minor = parts.getOrNull(1) ?: 0
    val patch = parts.getOrNull(2) ?: 0
    return major * 10000 + minor * 100 + patch
}

class HomeViewModel(
    private val repo: RestRepository,
    val context: Context,
    val prefs: PreferenceManager,
    val installManager: InstallManager,
    private val downloadManager: DownloadManager
) : ScreenModel {

    private val cacheDir = context.externalCacheDir ?: File(
        Environment.getExternalStorageDirectory(),
        Environment.DIRECTORY_DOWNLOADS
    ).resolve("CloudCordManager").also { it.mkdirs() }

    var discordVersions by mutableStateOf<Map<DiscordVersion.Type, DiscordVersion?>?>(null)
        private set

    var release by mutableStateOf<Release?>(null)
        private set

    var showUpdateDialog by mutableStateOf(false)
    var isUpdating by mutableStateOf(false)
    val commits = Pager(PagingConfig(pageSize = 20)) { CommitsPagingSource(repo) }.flow.cachedIn(screenModelScope)

    init {
        getDiscordVersions()
        checkForUpdate()
    }

    fun getDiscordVersions() {
        screenModelScope.launch {
            discordVersions = null
            // Use the same live channel index as the background update checker.
            // Never disguise a failed lookup as an up-to-date pinned release.
            discordVersions = repo.getLatestDiscordVersions().dataOrNull
                ?: DiscordVersion.Type.entries.associateWith { null }
            if (discordVersions?.get(prefs.channel) == null) {
                context.showToast(R.string.msg_target_unavailable, short = false)
            }
            if (prefs.autoClearCache) autoClearCache()
        }
    }

    fun launchVendetta() {
        installManager.getInstalled()
        val installed = installManager.current
        val intent = installed?.let { context.packageManager.getLaunchIntentForPackage(it.packageName) }
        if (intent == null) {
            context.showToast(R.string.msg_launch_failed, short = false)
            return
        }
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: Exception) {
            context.showToast(R.string.msg_launch_failed, short = false)
        }
    }

    fun uninstallVendetta() {
        installManager.uninstall()
    }

    fun launchVendettaInfo() {
        installManager.current?.let {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                data = Uri.parse("package:${it.packageName}")
                context.startActivity(this)
            }
        }
    }

    private fun autoClearCache() {
        val currentVersion =
            DiscordVersion.fromVersionCode(installManager.current?.longVersionCode.toString()) ?: return
        val latestVersion = when {
            prefs.discordVersion.isBlank() -> discordVersions?.get(prefs.channel)
            else -> DiscordVersion.fromVersionCode(prefs.discordVersion)
        } ?: return

        if (latestVersion > currentVersion) {
            for (file in (context.externalCacheDir ?: context.cacheDir).listFiles()
                ?: emptyArray()) {
                if (file.isDirectory) file.deleteRecursively()
            }
        }
    }

    private fun checkForUpdate() {
        screenModelScope.launch {
            release = repo.getLatestRelease("xohus/cloudcord").dataOrNull
            showUpdateDialog = (release?.managerVersionCode ?: 0) > BuildConfig.VERSION_CODE
        }
    }

    fun downloadAndInstallUpdate() {
        if (isUpdating) return
        val selectedRelease = release ?: return
        val asset = selectedRelease.managerAsset ?: return
        if ((selectedRelease.managerVersionCode ?: 0) <= BuildConfig.VERSION_CODE) return
        isUpdating = true
        screenModelScope.launch {
            val update = File(cacheDir, "update.apk")
            if (update.exists()) update.delete()
            try {
                if (downloadManager.downloadUpdate(update, asset.downloadUrl) !is DownloadResult.Success) {
                    context.showToast(R.string.msg_download_failed)
                    return@launch
                }
                withContext(Dispatchers.IO) {
                    require(update.length() == asset.size) { "Manager update size mismatch" }
                    val digest = MessageDigest.getInstance("SHA-256")
                    update.inputStream().use { input ->
                        val buffer = ByteArray(8192)
                        while (true) {
                            val count = input.read(buffer)
                            if (count == -1) break
                            digest.update(buffer, 0, count)
                        }
                    }
                    val sha = digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) }
                    require(sha.equals(asset.digest?.removePrefix("sha256:"), ignoreCase = true)) { "Manager update checksum mismatch" }
                    ApkValidation.validate(update)
                    Signer.verifyApk(update)
                    @Suppress("DEPRECATION")
                    val installed = context.packageManager.getPackageInfo(BuildConfig.APPLICATION_ID, PackageManager.GET_SIGNING_CERTIFICATES)
                    @Suppress("DEPRECATION")
                    val incoming = context.packageManager.getPackageArchiveInfo(update.absolutePath, PackageManager.GET_SIGNING_CERTIFICATES)
                        ?: error("Invalid Manager package")
                    require(incoming.packageName == BuildConfig.APPLICATION_ID && incoming.longVersionCode == selectedRelease.managerVersionCode?.toLong()) { "Wrong Manager package or version" }
                    val currentSigners = installed.signingInfo?.apkContentsSigners?.toSet()
                    val updateSigners = incoming.signingInfo?.apkContentsSigners?.toSet()
                    require(!currentSigners.isNullOrEmpty() && currentSigners == updateSigners) { "Manager signing key changed" }
                }
            val installer: Installer = when (prefs.installMethod) {
                InstallMethod.DEFAULT -> SessionInstaller(context)
                InstallMethod.SHIZUKU -> ShizukuInstaller(context)
            }

            installer.installApks(silent = !isMiui, update)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                update.delete()
                context.showToast(R.string.msg_download_verify_failed)
            } finally {
                isUpdating = false
            }
        }
    }

}
