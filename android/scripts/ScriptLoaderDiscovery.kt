package io.github.revenge.xposed.modules

import java.io.ByteArrayInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.zip.ZipFile
import java.util.zip.ZipInputStream

/** Find the script delegate by its preserved method names, not R8 class names.
 * Read DEX metadata only; do not initialize thousands of application classes.
 */
object ScriptLoaderDiscovery {
    fun discover(paths: List<String>): Set<String> {
        val found = linkedSetOf<String>()
        for (path in paths.distinct()) ZipFile(path).use { zip ->
            val entries = zip.entries()
            while (entries.hasMoreElements()) {
                val entry = entries.nextElement()
                if (entry.name.matches(Regex("classes[0-9]*\\.dex"))) {
                    found += fromDex(zip.getInputStream(entry).use { it.readBytes() })
                } else if (entry.name == "assets/lspatch/origin.apk") {
                    // Some LSPatch versions keep sourceDir pointed at the wrapper.
                    ZipInputStream(zip.getInputStream(entry)).use { original ->
                        var nested = original.nextEntry
                        while (nested != null) {
                            if (nested.name.matches(Regex("classes[0-9]*\\.dex"))) found += fromDex(original.readBytes())
                            nested = original.nextEntry
                        }
                    }
                }
            }
        }
        return found
    }

    fun fromDex(bytes: ByteArray): Set<String> {
        require(bytes.size >= 112 && bytes.copyOfRange(0, 4).contentEquals(byteArrayOf(100, 101, 120, 10))) { "Invalid DEX header" }
        val data = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        fun table(offset: Int, count: Int, width: Int) {
            require(offset >= 0 && count >= 0 && offset.toLong() + count.toLong() * width <= bytes.size) { "Invalid DEX table" }
        }
        val stringCount = data.getInt(56)
        val strings = data.getInt(60)
        val typeCount = data.getInt(64)
        val types = data.getInt(68)
        val methodCount = data.getInt(88)
        val methods = data.getInt(92)
        table(strings, stringCount, 4); table(types, typeCount, 4); table(methods, methodCount, 8)
        fun string(index: Int): String {
            require(index in 0 until stringCount)
            var start = data.getInt(strings + index * 4)
            var lengthBytes = 0
            do {
                require(start in bytes.indices && lengthBytes++ < 5)
            } while ((bytes[start++].toInt() and 128) != 0)
            var end = start
            while (end < bytes.size && bytes[end] != 0.toByte()) end++
            require(end < bytes.size)
            return String(bytes, start, end - start, Charsets.UTF_8)
        }
        val targets = mutableMapOf<Int, Int>()
        for (index in 0 until stringCount) when (string(index)) {
            "loadScriptFromAssets" -> targets[index] = 1
            "loadScriptFromFile" -> targets[index] = 2
        }
        val classes = mutableMapOf<Int, Int>()
        for (index in 0 until methodCount) {
            val offset = methods + index * 8
            val flag = targets[data.getInt(offset + 4)] ?: continue
            val owner = data.getShort(offset).toInt() and 65535
            classes[owner] = (classes[owner] ?: 0) or flag
        }
        return classes.filterValues { it == 3 }.keys.mapTo(linkedSetOf()) { owner ->
            require(owner in 0 until typeCount)
            string(data.getInt(types + owner * 4)).removePrefix("L").removeSuffix(";").replace('/', '.')
        }
    }
}
