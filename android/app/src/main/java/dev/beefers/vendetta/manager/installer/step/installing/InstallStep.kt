package dev.beefers.vendetta.manager.installer.step.installing

import android.content.Context
import android.content.pm.PackageManager
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.domain.manager.InstallMethod
import dev.beefers.vendetta.manager.domain.manager.PreferenceManager
import dev.beefers.vendetta.manager.installer.Installer
import dev.beefers.vendetta.manager.installer.session.SessionInstaller
import dev.beefers.vendetta.manager.installer.shizuku.ShizukuInstaller
import dev.beefers.vendetta.manager.installer.step.Step
import dev.beefers.vendetta.manager.installer.step.StepGroup
import dev.beefers.vendetta.manager.installer.step.StepRunner
import dev.beefers.vendetta.manager.installer.util.AxmlUtil
import dev.beefers.vendetta.manager.installer.util.ApkValidation
import dev.beefers.vendetta.manager.installer.util.Signer
import dev.beefers.vendetta.manager.utils.isMiui
import org.koin.core.component.inject
import java.io.File

/**
 * Installs all the modified splits with the users desired [Installer]
 *
 * @see SessionInstaller
 * @see ShizukuInstaller
 *
 * @param lspatchedDir Where all the patched APKs are
 */
class InstallStep(
    private val lspatchedDir: File
): Step() {

    private val preferences: PreferenceManager by inject()
    private val context: Context by inject()

    override val group = StepGroup.INSTALLING
    override val nameRes = R.string.step_installing

    override suspend fun run(runner: StepRunner) {
        runner.logger.i("Installing apks")
        val files = lspatchedDir.listFiles()
            ?.filter { it.isFile && it.extension.equals("apk", ignoreCase = true) }
            ?.toTypedArray()
            ?.takeIf { it.isNotEmpty() }
            ?: throw Error("Missing APKs from LSPatch step; failure likely")

        val signerFingerprints = files.associateWith { apk ->
            ApkValidation.validate(apk)
            Signer.verifyApk(apk)
        }

        val manifests = files.associateWith(AxmlUtil::readManifestInfo)
        val baseApk = files.singleOrNull { manifests.getValue(it).splitName == null }
            ?: error("Expected exactly one base APK in the LSPatch output")
        val baseManifest = manifests.getValue(baseApk)
        manifests.values.forEach { manifest ->
            check(
                manifest.packageName == baseManifest.packageName &&
                    manifest.longVersionCode == baseManifest.longVersionCode
            ) {
                "Discord APK splits do not belong to the same app version. Import a complete APK/APKM or retry the download."
            }
        }
        val signers = signerFingerprints.getValue(baseApk)
        check(signers.isNotEmpty()) { "Patched APK signing certificate is missing" }

        // Android 10 cannot read metadata from standalone config splits; apksig verifies them directly.
        files.filterNot { it == baseApk }.forEach { apk ->
            check(signerFingerprints.getValue(apk) == signers) {
                "Discord APK splits have different signing certificates. Installation stopped."
            }
        }

        // Detect a lost/replaced per-device signing key before opening the OS installer.
        // Never uninstall an existing client to hide a certificate conflict.
        @Suppress("DEPRECATION")
        val installed = try {
            context.packageManager.getPackageInfo(
                baseManifest.packageName,
                PackageManager.GET_SIGNING_CERTIFICATES
            )
        } catch (_: PackageManager.NameNotFoundException) {
            null
        }
        if (installed != null) {
            val installedSigners = installed.signingInfo?.apkContentsSigners
                ?.map { Signer.certificateFingerprint(it.toByteArray()) }
                ?.toSet()
            check(installedSigners == signers) {
                "Signing key mismatch with the installed CloudCord client. Updating requires the original Manager's signing key. Do not uninstall Discord or clear app data to bypass this error."
            }
        }

        val installer: Installer = when (preferences.installMethod) {
            InstallMethod.DEFAULT -> SessionInstaller(context)
            InstallMethod.SHIZUKU -> ShizukuInstaller(context)
        }

        installer.installApks(silent = !isMiui, *files)
        runner.logger.i("Install result: Android confirmed installation of ${files.size} APK(s)")
    }

}
