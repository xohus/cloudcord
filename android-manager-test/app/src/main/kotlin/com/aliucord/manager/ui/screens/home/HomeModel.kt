package com.aliucord.manager.ui.screens.home

import android.app.Application
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.provider.Settings
import android.util.Log
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.core.graphics.drawable.toBitmap
import androidx.core.net.toUri
import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.aliucord.manager.network.models.BuildInfo
import com.aliucord.manager.network.models.RNATrackerIndex
import com.aliucord.manager.network.services.*
import com.aliucord.manager.network.utils.SemVer
import com.aliucord.manager.network.utils.fold
import com.aliucord.manager.patcher.InstallMetadata
import com.aliucord.manager.ui.screens.patchopts.*
import com.aliucord.manager.ui.util.DiscordVersion
import com.aliucord.manager.ui.util.toUnsafeImmutable
import com.aliucord.manager.util.*
import com.github.diamondminer88.zip.ZipReader
import dev.raincord.manager.BuildConfig
import dev.raincord.manager.R
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromStream
import org.json.JSONArray
import org.json.JSONObject

class HomeModel(
    private val application: Application,
    private val github: AliucordGithubService,
    private val maven: AliucordMavenService,
    private val rainCodeberg: RainCodebergService,
    private val rnaTracker: RNATrackerService,
    private val json: Json,
) : ScreenModel {
    var installsState by mutableStateOf<InstallsState>(InstallsState.Fetching)
        private set

    private val refreshingLock = Mutex()
    private var remoteDataJson: BuildInfo? = null
    private var trackerIndexJson: RNATrackerIndex? = null
    private var latestRainXposedVersion: SemVer? = null
    private var latestAliuhookVersion: SemVer? = null

    init {
        refresh()
    }

    fun refresh(delay: Boolean = false) = screenModelScope.launchIO {
        if (refreshingLock.isLocked) return@launchIO

        if (delay) {
            delay(250)

            if (refreshingLock.isLocked)
                return@launchIO
        }

        refreshingLock.withLock {
            val packages = fetchAliucordPackages()

            val jobs = listOf(
                screenModelScope.launch(Dispatchers.IO) {
                    fetchInstallations(packages)
                },
                screenModelScope.launch(Dispatchers.IO) {
                    if (remoteDataJson == null || latestAliuhookVersion == null)
                        fetchRemoteData()
                }
            )

            jobs.joinAll()
            mainThread { refreshInstallationsUpToDate(packages) }
        }
    }

    fun openApp(packageName: String) {
        val launchIntent = application.packageManager
            .getLaunchIntentForPackage(packageName)

        if (launchIntent != null) {
            application.startActivity(launchIntent)
        } else {
            application.showToast(R.string.launch_aliucord_fail)
        }
    }

    fun openAppInfo(packageName: String) {
        val launchIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            .setData("package:$packageName".toUri())

        application.startActivity(launchIntent)
    }

    /**
     * Creates a [PatchOptionsScreen] that can be navigated to,
     * with prefilled options from an existing installation.
     */
    fun createPrefilledPatchOptsScreen(packageName: String): PatchOptionsScreen {
        val metadata = try {
            val applicationInfo = application.packageManager.getApplicationInfo(packageName, 0)
            val metadataFile = ZipReader(applicationInfo.publicSourceDir)
                .use { it.openEntry("rain.json")?.read() }

            @OptIn(ExperimentalSerializationApi::class)
            metadataFile?.let { json.decodeFromStream<InstallMetadata>(it.inputStream()) }
        } catch (t: Throwable) {
            Log.w(BuildConfig.TAG, "Failed to parse Aliucord install metadata from package $packageName", t)
            null
        }

        val patchOptions = metadata?.options
            ?: PatchOptions.Default.copy(packageName = packageName)

        return PatchOptionsScreen(prefilledOptions = patchOptions)
    }

    private suspend fun fetchInstallations(packages: List<PackageInfo>) {
        mainThread {
            if (installsState !is InstallsState.Fetched)
                installsState = InstallsState.Fetching
        }

        try {
            val packageManager = application.packageManager
            val aliucordInstallations = packages.mapNotNull { pkg ->
                // `longVersionCode` is unnecessary since Discord doesn't use `versionCodeMajor`
                @Suppress("DEPRECATION")
                val versionCode = pkg.versionCode
                val versionName = pkg.versionName ?: return@mapNotNull null
                val applicationInfo = pkg.applicationInfo ?: return@mapNotNull null

                InstallData(
                    name = packageManager.getApplicationLabel(applicationInfo).toString(),
                    packageName = pkg.packageName,
                    isUpToDate = isInstallationUpToDate(pkg),
                    icon = packageManager
                        .getApplicationIcon(applicationInfo)
                        .toBitmap()
                        .asImageBitmap()
                        .let(::BitmapPainter),
                    version = DiscordVersion.Existing(
                        type = DiscordVersion.parseVersionType(versionCode),
                        name = versionName.split("-")[0].trim(),
                        code = versionCode,
                    ),
                )
            }

            mainThread {
                installsState = if (aliucordInstallations.isNotEmpty()) {
                    InstallsState.Fetched(data = aliucordInstallations.toUnsafeImmutable())
                } else {
                    InstallsState.None
                }
            }
        } catch (t: Throwable) {
            Log.e(BuildConfig.TAG, "Failed to query Aliucord installations", t)
            mainThread { installsState = InstallsState.Error }
        }
    }

    private suspend fun refreshInstallationsUpToDate(packages: List<PackageInfo>) {
        val installations = mainThread { (installsState as? InstallsState.Fetched)?.data }
            ?: return

        try {
            val newInstallations = installations.map { data ->
                val packageInfo = packages.find { it.packageName == data.packageName }
                    ?: throw IllegalStateException("Checking up-to-date status for package that has not been fetched")

                data.copy(isUpToDate = isInstallationUpToDate(packageInfo))
            }

            mainThread { installsState = InstallsState.Fetched(data = newInstallations.toUnsafeImmutable()) }
        } catch (t: Throwable) {
            Log.e(BuildConfig.TAG, "Failed to check installations up-to-date", t)
            mainThread { installsState = InstallsState.Error }
        }
    }

    private suspend fun fetchRemoteData() {
        listOf(
            // // These aren't needed by Rain
            // screenModelScope.launch(Dispatchers.IO) {
            //     github.getBuildData().fold(
            //         success = { remoteDataJson = it },
            //         fail = { Log.w(BuildConfig.TAG, "Failed to fetch remote build data", it) },
            //     )
            // },
            // screenModelScope.launch(Dispatchers.IO) {
            //     maven.getAliuhookVersion().fold(
            //         success = { latestAliuhookVersion = it },
            //         fail = { Log.w(BuildConfig.TAG, "Failed to fetch latest Aliuhook version", it) },
            //     )
            // },
            screenModelScope.launch(Dispatchers.IO) {
                rnaTracker.getLatestDiscordVersions().fold(
                    success = { trackerIndexJson = it },
                    fail = { Log.w(BuildConfig.TAG, "Failed to fetch latest Discord RNA versions", it) },
                )
            },
            screenModelScope.launch(Dispatchers.IO) {
                rainCodeberg.getLatestXposedRelease().fold(
                    success = { latestRainXposedVersion = SemVer.parse(it.name) },
                    fail = { Log.w(BuildConfig.TAG, "Failed to fetch latest RainXposed version", it) },
                )
            },

        ).joinAll()

        if (trackerIndexJson == null) {
            Log.w(BuildConfig.TAG, "RNATracker index is null after fetching remote data.")
            mainThread { application.showToast(R.string.home_network_fail) }
        }
        if (latestRainXposedVersion == null) {
            Log.w(BuildConfig.TAG, "Latest RainXposed version is null after fetching remote data.")
            mainThread { application.showToast(R.string.home_network_fail) }
        }
    }

    /**
     * Obtains all installed packages on the device that are an Aliucord installation.
     */
    private fun fetchAliucordPackages(): List<PackageInfo> {
        return application.packageManager
            .getInstalledPackages(PackageManager.GET_META_DATA)
            .filter {
                // Rain doesn't have "legacy installer" whatsoever
                return@filter it.applicationInfo?.metaData?.containsKey("isRain") == true

                // // Packages installed via the legacy Installer do not have the metadata marker
                // val isAliucordPkg = it.packageName == "com.aliucord"
                // val hasAliucordMeta = it.applicationInfo?.metaData?.containsKey("isAliucord") == true
                // isAliucordPkg || hasAliucordMeta
            }
    }

    /**
     * Checks whether the current Rain installation is up-to-date.
     *
     * Currently mirrors the behavior of Bunny Manager by directly comparing against
     * the latest available Discord and RainXposed release. This is a temporary approach and will remain
     * in place until Rain adds support for version pinning.
     */
    private suspend fun isInstallationUpToDate(pkg: PackageInfo): Boolean? {
        val trackerData = trackerIndexJson ?: return null // Latest stable/beta/alpha from RNA tracker

        @Suppress("DEPRECATION")
        val installedDiscordVersionCode = pkg.versionCode

        val apkPath = pkg.applicationInfo?.publicSourceDir ?: return false
        val installMetadata = try {
            val metadataFile = ZipReader(apkPath).use { it.openEntry("rain.json")?.read() }
                ?: return false

            @OptIn(ExperimentalSerializationApi::class)
            json.decodeFromStream<InstallMetadata>(metadataFile.inputStream())
        } catch (t: Throwable) {
            Log.w(BuildConfig.TAG, "Failed to parse Aliucord install metadata from package ${pkg.packageName}", t)
            return false
        }

        var expectedDiscordVersionCode: Int? = null

        // 1. Try ControlRepo
        var controlRepoDiscordVersion: Int? = null
        rainCodeberg.getControlRepo().fold(
            success = {
                controlRepoDiscordVersion = it.firstOrNull()?.discord
            },
            fail = {
                Log.w(BuildConfig.TAG, "Failed to fetch ControlRepo version for isInstallationUpToDate", it)
            }
        )

        if (controlRepoDiscordVersion != null) {
            expectedDiscordVersionCode = controlRepoDiscordVersion
        } else {
            // 2. If ControlRepo failed, check for Dev Override (from installed metadata)
            if (installMetadata.options.isDevMode && installMetadata.options.customVersionCode.isNotBlank()) {
                expectedDiscordVersionCode = installMetadata.options.customVersionCode.toIntOrNull()
            } else {
                // 3. If ControlRepo and Dev Override failed, fallback to RNATracker Stable
                expectedDiscordVersionCode = trackerData.latest.stable
            }
        }

        // If for some reason we couldn't determine an expected version, consider it not up-to-date
        if (expectedDiscordVersionCode == null) return false

        // Compare installed Discord version with the determined expected version
        val isDiscordUpToDate = installedDiscordVersionCode == expectedDiscordVersionCode

        // Compare RainXposed version
        val isRainXposedUpToDate = installMetadata.rainXposedVersion == latestRainXposedVersion

        return isDiscordUpToDate && isRainXposedUpToDate
    }
}
