package com.aliucord.manager.patcher.util

import com.github.diamondminer88.zip.ZipCompression
import com.github.diamondminer88.zip.ZipReader
import com.github.diamondminer88.zip.ZipWriter
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

/** Rebuild modified APKs with a valid first ZIP header and aligned stored entries. */
object ApkAlignment {
    fun align(apk: File, workingDir: File, log: (String) -> Unit = {}) {
        val dexName = Regex("classes(?:[0-9]+)?\\.dex")
        val nativeName = Regex("lib/[^/]+/[^/]+\\.so")
        val temp = Files.createTempFile(workingDir.toPath(), "aligned-", ".apk").toFile()
        try {
            ZipReader(apk).use { input ->
                check("AndroidManifest.xml" in input.entryNames) { "Missing manifest in ${apk.name}" }
                ZipWriter(temp, /* append = */ false).use { output ->
                    // In-place deletion/alignment can leave zero padding at offset 0.
                    // Android rejects that even if the central directory and signature verify.
                    // A compressed manifest written first needs no leading alignment padding.
                    output.writeEntry("AndroidManifest.xml", input.openEntry("AndroidManifest.xml")!!.read())
                    for (name in input.entryNames) {
                        if (name == "AndroidManifest.xml") continue
                        val entry = checkNotNull(input.openEntry(name))
                        if (entry.isDir) {
                            output.writeDir(name)
                            continue
                        }
                        val mustStore = name == "resources.arsc" || dexName.matches(name) || nativeName.matches(name)
                        val compression = if (mustStore) ZipCompression.NONE else entry.compression
                        val alignment = when {
                            nativeName.matches(name) -> 16384
                            compression == ZipCompression.NONE -> 4
                            else -> 0
                        }
                        output.writeEntry(name, entry.read(), compression, alignment)
                    }
                }
            }
            temp.inputStream().use { input ->
                val signature = ByteArray(4)
                check(input.read(signature) == 4 && signature.contentEquals(byteArrayOf(0x50, 0x4b, 3, 4))) {
                    "Invalid ZIP header after rebuilding ${apk.name}"
                }
            }
            Files.move(temp.toPath(), apk.toPath(), StandardCopyOption.REPLACE_EXISTING)
            log("Rebuilt ${apk.name} with a valid ZIP header and aligned libraries")
        } finally {
            temp.delete()
        }
    }
}
