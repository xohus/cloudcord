package dev.beefers.vendetta.manager.installer.util

import android.content.Context
import java.io.File
import java.util.zip.ZipFile
import java.util.zip.CRC32

/** Validate the central directory before native patching, including cached/imported APKs. */
object ApkValidation {
    fun validateDiscordBase(apk: File, context: Context, expectedVersion: String) {
        @Suppress("DEPRECATION")
        val info = context.packageManager.getPackageArchiveInfo(apk.absolutePath, 0)
            ?: error("Cannot read Discord APK metadata. Import a complete Discord base APK/APKM.")
        require(info.packageName == "com.discord") { "Import must contain the original Discord APK, not another app or a previously patched client." }
        require(info.longVersionCode.toString() == expectedVersion) {
            "This CloudCord loader supports Discord version code $expectedVersion; imported APK is ${info.longVersionCode}."
        }
    }

    fun validate(apk: File) {
        try {
            ZipFile(apk).use { zip ->
                val manifest = zip.getEntry("AndroidManifest.xml")
                    ?: error("Missing AndroidManifest.xml")
                require(!manifest.isDirectory && manifest.size > 0) { "Empty AndroidManifest.xml" }
                val buffer = ByteArray(8192)
                val names = mutableSetOf<String>()
                for (entry in zip.entries().asSequence()) {
                    require(names.add(entry.name)) { "Duplicate ZIP entry" }
                    if (entry.isDirectory) continue
                    val crc = CRC32()
                    var size = 0L
                    zip.getInputStream(entry).use { input ->
                        while (true) {
                            val count = input.read(buffer)
                            if (count == -1) break
                            size += count
                            require(size <= 512L * 1024 * 1024) { "APK entry too large" }
                            crc.update(buffer, 0, count)
                        }
                    }
                    require(size == entry.size && crc.value == entry.crc) { "Corrupt APK entry" }
                }
            }
        } catch (e: Exception) {
            throw IllegalArgumentException(
                "Invalid or incomplete APK. Download Discord again or import a complete APK/APKM file.", e
            )
        }
    }
}
