package com.aliucord.manager.patcher.util

import com.github.diamondminer88.zip.ZipCompression
import com.github.diamondminer88.zip.ZipReader
import com.github.diamondminer88.zip.ZipWriter
import java.io.File
import java.nio.file.Files

/** Align entries independently: a native-library split need not contain resources.arsc. */
object ApkAlignment {
    fun align(apk: File, workingDir: File, log: (String) -> Unit = {}) {
        val dexName = Regex("classes(?:[0-9]+)?\\.dex")
        val nativeName = Regex("lib/[^/]+/[^/]+\\.so")
        val entries = ZipReader(apk).use { zip ->
            zip.entryNames.filter {
                it == "resources.arsc" || dexName.matches(it) || nativeName.matches(it)
            }
        }
        if (entries.isEmpty()) return
        val temp = Files.createTempDirectory(workingDir.toPath(), "align-").toFile()
        try {
            ZipReader(apk).use { zip ->
                for ((index, name) in entries.withIndex()) {
                    temp.resolve(index.toString()).writeBytes(checkNotNull(zip.openEntry(name)).read())
                }
            }
            ZipWriter(apk, /* append = */ true).use { zip ->
                for (name in entries) zip.deleteEntry(name)
                for ((index, name) in entries.withIndex()) {
                    val alignment = if (nativeName.matches(name)) 16384 else 4
                    log("Aligning ${apk.name}: $name to $alignment bytes")
                    zip.writeEntry(name, temp.resolve(index.toString()).readBytes(), ZipCompression.NONE, alignment)
                }
            }
        } finally {
            temp.deleteRecursively()
        }
    }
}
