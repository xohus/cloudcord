package dev.beefers.vendetta.manager.installer.util

import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import org.junit.Assert.assertTrue
import org.junit.Test

class ApkValidationTest {
    private fun archive(entries: Map<String, ByteArray>): File {
        val file = File.createTempFile("cloudcord-validation-", ".apk")
        file.deleteOnExit()
        ZipOutputStream(file.outputStream()).use { zip ->
            for ((name, bytes) in entries) {
                zip.putNextEntry(ZipEntry(name))
                zip.write(bytes)
                zip.closeEntry()
            }
        }
        return file
    }

    private fun rejects(file: File) {
        try {
            ApkValidation.validate(file)
            throw AssertionError("Invalid input accepted")
        } catch (e: IllegalArgumentException) {
            assertTrue(e.message!!.contains("complete APK/APKM"))
        } finally { file.delete() }
    }

    @Test fun acceptsReadableApk() {
        val file = archive(mapOf("AndroidManifest.xml" to byteArrayOf(3, 0, 8, 0)))
        try { ApkValidation.validate(file) } finally { file.delete() }
    }

    @Test fun rejectsMissingManifest() = rejects(archive(mapOf("index.html" to byteArrayOf(1))))
    @Test fun rejectsEmptyManifest() = rejects(archive(mapOf("AndroidManifest.xml" to byteArrayOf())))
    @Test fun rejectsTruncatedCentralDirectory() {
        val file = archive(mapOf("AndroidManifest.xml" to byteArrayOf(3, 0, 8, 0)))
        java.io.RandomAccessFile(file, "rw").use { it.setLength(file.length() - 22) }
        rejects(file)
    }
    @Test fun rejectsHtmlDownload() {
        val file = File.createTempFile("cloudcord-validation-", ".apk")
        file.writeText("<html>download failed</html>")
        rejects(file)
    }

    @Test fun rejectsCorruptStoredEntry() {
        val file = File.createTempFile("cloudcord-validation-", ".apk")
        val bytes = byteArrayOf(3, 0, 8, 0)
        val crc = java.util.zip.CRC32().apply { update(bytes) }
        ZipOutputStream(file.outputStream()).use { zip ->
            val entry = ZipEntry("AndroidManifest.xml").apply {
                method = ZipEntry.STORED
                size = bytes.size.toLong()
                compressedSize = size
                this.crc = crc.value
            }
            zip.putNextEntry(entry)
            zip.write(bytes)
            zip.closeEntry()
        }
        // Local ZIP header is 30 bytes, followed by the entry name, then content.
        java.io.RandomAccessFile(file, "rw").use {
            it.seek(30L + "AndroidManifest.xml".length)
            it.writeByte(4)
        }
        rejects(file)
    }
}
