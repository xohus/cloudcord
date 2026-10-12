package dev.beefers.vendetta.manager.installer.session

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller.SessionParams
import android.content.pm.PackageManager
import android.os.Build
import dev.beefers.vendetta.manager.installer.Installer
import java.io.File

internal class SessionInstaller(private val context: Context) : Installer {

    private val packageManager: PackageManager = context.packageManager

    override suspend fun installApks(silent: Boolean, vararg apks: File) {
        val params = SessionParams(SessionParams.MODE_FULL_INSTALL).apply {
            if (Build.VERSION.SDK_INT >= 31) {
                setInstallScenario(PackageManager.INSTALL_SCENARIO_FAST)

                if (silent) {
                    setRequireUserAction(SessionParams.USER_ACTION_NOT_REQUIRED)
                }
            }
        }

        val packageInstaller = packageManager.packageInstaller
        val sessionId = packageInstaller.createSession(params)
        try {
            packageInstaller.openSession(sessionId).use { session ->
                apks.forEach { apk ->
                    session.openWrite(apk.name, 0, apk.length()).use { output ->
                        apk.inputStream().use { input -> input.copyTo(output) }
                        session.fsync(output)
                    }
                }

                val callbackIntent = Intent(context, InstallService::class.java).apply {
                    action = "vendetta.actions.ACTION_INSTALL"
                }

                @SuppressLint("UnspecifiedImmutableFlag")
                val contentIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    PendingIntent.getService(context, sessionId, callbackIntent, PendingIntent.FLAG_MUTABLE)
                } else {
                    PendingIntent.getService(context, sessionId, callbackIntent, 0)
                }

                session.commit(contentIntent.intentSender)
            }
        } catch (t: Throwable) {
            // Do not leave an incomplete package session after IO/cancellation errors.
            runCatching { packageInstaller.abandonSession(sessionId) }
            throw t
        }
    }
}
