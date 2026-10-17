package com.aliucord.manager.manager.download

import java.io.File
import java.io.IOException
import java.util.zip.ZipFile

internal object DownloadIntegrity {
    fun checkLength(received: Long, expected: Long) {
        if (received <= 0 || (expected > 0 && received != expected)) {
            throw IOException("Incomplete download: received $received bytes, expected $expected. Retry with a stable connection.")
        }
    }

    fun checkApk(file: File) {
        ZipFile(file).use { zip ->
            val manifest = zip.getEntry("AndroidManifest.xml")
                ?: throw IOException("The download is not a Discord APK. The server may have returned an error page.")
            if (manifest.size <= 0) throw IOException("Downloaded APK has an empty manifest")
            zip.getInputStream(manifest).use { input ->
                val crc = java.util.zip.CRC32()
                val buffer = ByteArray(8192)
                var received = 0L
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    crc.update(buffer, 0, count)
                    received += count
                }
                if (received != manifest.size || crc.value != manifest.crc) throw IOException("Downloaded APK manifest is corrupt")
            }
        }
    }
}
