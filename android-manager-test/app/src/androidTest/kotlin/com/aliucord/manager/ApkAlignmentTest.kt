package com.aliucord.manager

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.aliucord.manager.patcher.util.ApkAlignment
import com.github.diamondminer88.zip.ZipReader
import com.github.diamondminer88.zip.ZipWriter
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.nio.file.Files

@RunWith(AndroidJUnit4::class)
class ApkAlignmentTest {
    @Test fun alignsLibrariesWithoutResourcesAndPreservesOtherArchitectures() {
        val cache = InstrumentationRegistry.getInstrumentation().targetContext.cacheDir
        val dir = Files.createTempDirectory(cache.toPath(), "alignment-test-").toFile()
        try {
            val apk = dir.resolve("split.apk")
            val arm = ByteArray(37) { (it + 71).toByte() }
            val x86 = ByteArray(41) { (it + 117).toByte() }
            ZipWriter(apk).use {
                it.writeEntry("AndroidManifest.xml", byteArrayOf(1, 2, 3))
                it.writeEntry("lib/armeabi-v7a/test.so", arm)
                it.writeEntry("lib/x86_64/test.so", x86)
            }
            ApkAlignment.align(apk, dir)
            ZipReader(apk).use {
                assertArrayEquals(arm, it.openEntry("lib/armeabi-v7a/test.so")!!.read())
                assertArrayEquals(x86, it.openEntry("lib/x86_64/test.so")!!.read())
            }
            val bytes = apk.readBytes()
            assertArrayEquals(byteArrayOf(0x50, 0x4b, 3, 4), bytes.copyOfRange(0, 4))
            for (payload in listOf(arm, x86)) {
                val offset = bytes.indices.firstOrNull { start ->
                    start + payload.size <= bytes.size && payload.indices.all { bytes[start + it] == payload[it] }
                }
                assertNotNull("Library must be stored uncompressed", offset)
                assertEquals(0, offset!! % 16384)
            }
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test fun toleratesNonconsecutiveDexNames() {
        val cache = InstrumentationRegistry.getInstrumentation().targetContext.cacheDir
        val dir = Files.createTempDirectory(cache.toPath(), "dex-test-").toFile()
        try {
            val apk = dir.resolve("base.apk")
            val dex = byteArrayOf(10, 20, 30, 40)
            ZipWriter(apk).use {
                it.writeEntry("AndroidManifest.xml", byteArrayOf(1, 2, 3))
                it.writeEntry("classes.dex", dex)
                it.writeEntry("classes3.dex", dex)
                it.writeEntry("assets/plugin.dex", dex)
            }
            ApkAlignment.align(apk, dir)
            ZipReader(apk).use {
                for (name in listOf("classes.dex", "classes3.dex", "assets/plugin.dex")) {
                    assertArrayEquals(dex, it.openEntry(name)!!.read())
                }
            }
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test fun rebuildsLanguageSplitAfterManifestAndResourceReplacement() {
        val cache = InstrumentationRegistry.getInstrumentation().targetContext.cacheDir
        val dir = Files.createTempDirectory(cache.toPath(), "language-test-").toFile()
        try {
            val apk = dir.resolve("lang.apk")
            val manifest = byteArrayOf(1, 2, 3, 4, 5)
            val resources = ByteArray(133) { it.toByte() }
            ZipWriter(apk).use {
                it.writeEntry("AndroidManifest.xml", manifest)
                it.writeEntry("resources.arsc", resources)
            }
            ZipWriter(apk, true).use {
                it.deleteEntry("AndroidManifest.xml", false)
                it.writeEntry("AndroidManifest.xml", manifest)
            }
            ApkAlignment.align(apk, dir)
            assertArrayEquals(byteArrayOf(0x50, 0x4b, 3, 4), apk.readBytes().copyOfRange(0, 4))
            ZipReader(apk).use {
                assertArrayEquals(manifest, it.openEntry("AndroidManifest.xml")!!.read())
                val entry = it.openEntry("resources.arsc")!!
                assertArrayEquals(resources, entry.read())
                assertEquals(0L, entry.dataOffset % 4)
            }
        } finally {
            dir.deleteRecursively()
        }
    }
}
