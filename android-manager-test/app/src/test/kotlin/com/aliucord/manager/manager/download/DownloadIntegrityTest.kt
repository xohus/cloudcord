package com.aliucord.manager.manager.download

import java.io.File
import java.io.IOException
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import org.junit.Assert.assertThrows
import org.junit.Test

class DownloadIntegrityTest {
    @Test fun acceptsCompleteAndUnknownLengthDownloads() {
        DownloadIntegrity.checkLength(120, 120)
        DownloadIntegrity.checkLength(120, 0)
    }

    @Test fun rejectsEmptyTruncatedAndOversizedDownloads() {
        for ((received, expected) in listOf(0L to 0L, 119L to 120L, 121L to 120L)) {
            assertThrows(IOException::class.java) { DownloadIntegrity.checkLength(received, expected) }
        }
    }

    private fun archive(entry: String, content: ByteArray): File {
        val file = File.createTempFile("cloudcord-download-test-", ".apk")
        ZipOutputStream(file.outputStream()).use { zip ->
            zip.putNextEntry(ZipEntry(entry))
            zip.write(content)
            zip.closeEntry()
        }
        return file
    }

    @Test fun acceptsReadableManifest() {
        val file = archive("AndroidManifest.xml", byteArrayOf(3, 0, 8, 0))
        try { DownloadIntegrity.checkApk(file) } finally { file.delete() }
    }

    @Test fun rejectsMissingOrEmptyManifest() {
        for ((entry, content) in listOf("error.html" to byteArrayOf(1), "AndroidManifest.xml" to byteArrayOf())) {
            val file = archive(entry, content)
            try { assertThrows(IOException::class.java) { DownloadIntegrity.checkApk(file) } }
            finally { file.delete() }
        }
    }

    @Test fun rejectsTruncatedZip() {
        val file = archive("AndroidManifest.xml", byteArrayOf(3, 0, 8, 0))
        try {
            java.io.RandomAccessFile(file, "rw").use { it.setLength(file.length() - 22) }
            assertThrows(IOException::class.java) { DownloadIntegrity.checkApk(file) }
        } finally { file.delete() }
    }
}
