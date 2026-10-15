package dev.beefers.vendetta.manager.installer.shizuku

import android.content.Context
import dev.beefers.vendetta.manager.R
import dev.beefers.vendetta.manager.domain.manager.InstallManager
import dev.beefers.vendetta.manager.installer.Installer
import dev.beefers.vendetta.manager.utils.showToast
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import rikka.shizuku.Shizuku
import java.io.File
import java.util.UUID

class ShizukuInstaller(private val context: Context) : Installer, KoinComponent {

    val installManager: InstallManager by inject()

    override suspend fun installApks(silent: Boolean, vararg apks: File) {
        if (!ShizukuPermissions.waitShizukuPermissions()) {
            withContext(Dispatchers.Main) {
                context.showToast(R.string.msg_shizuku_denied, short = false)
            }

            throw Error("Failed to install due to missing Shizuku permissions")
        }

        require(apks.isNotEmpty()) { "No APKs supplied" }
        val tempDir = "/data/local/tmp/cloudcord-${UUID.randomUUID()}"
        var sessionId: Int? = null
        try {
            executeShellCommand("mkdir ${quote(tempDir)}")
            val totalSize = apks.sumOf { it.length() }
            val created = executeShellCommand("pm install-create -r -S $totalSize")
            val id = Regex("\\[(\\d+)\\]").find(created)?.groupValues?.get(1)?.toIntOrNull()
                ?: error("Android did not create an installation session: $created")
            sessionId = id
            apks.forEachIndexed { index, apk ->
                val path = "$tempDir/$index.apk"
                executeShellCommand("cp ${quote(apk.absolutePath)} ${quote(path)}")
                requireSuccess(executeShellCommand("pm install-write -S ${apk.length()} $id $index.apk ${quote(path)}"))
            }
            requireSuccess(executeShellCommand("pm install-commit $id"))
            sessionId = null
            installManager.getInstalled()
        } finally {
            sessionId?.let { runCatching { executeShellCommand("pm install-abandon $it") } }
            // Only remove the unique directory created for this installation.
            runCatching { executeShellCommand("rm -rf ${quote(tempDir)}") }
        }
    }

    private fun quote(value: String) = "'" + value.replace("'", "'\\''") + "'"

    private fun requireSuccess(result: String) {
        check(result.lineSequence().any { it.trim().startsWith("Success") }) {
            "Android package manager did not confirm installation: $result"
        }
    }

    private fun executeShellCommand(command: String): String {
        @Suppress("DEPRECATION")
        val process = Shizuku.newProcess(arrayOf("sh", "-c", "$command 2>&1"), null, null)
        val output = process.inputStream.bufferedReader().use { it.readText().trim() }
        val exitCode = process.waitFor()
        check(exitCode == 0) { "Android package command failed ($exitCode): $output" }
        return output
    }

}
