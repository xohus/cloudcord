"""Add Discord 352+ font and theme hooks to the bundled Xposed module."""
import sys
from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if source.count(old) != 1:
        raise SystemExit(f"Unexpected upstream {label}")
    return source.replace(old, new)


def patch_fonts(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    source = replace_once(
        source,
        "    private lateinit var fontsDir: File\n"
        "    private lateinit var fontsDownloadsDir: File\n",
        "    private var fontsDir: File? = null\n"
        "    private var fontsDownloadsDir: File? = null\n",
        "font directory fields",
    )

    start = "        XposedHelpers.findAndHookMethod(\n"
    end = "\n\n        val fontDefFile"
    if source.count(start) != 1 or source.count(end) != 1:
        raise SystemExit("Unexpected upstream font hook block")
    start_index = source.index(start)
    end_index = source.index(end, start_index)
    legacy_hook = source[start_index:end_index]
    legacy_hook = legacy_hook.replace(
        "                    val style: Int = param.args[1] as Int",
        """                    val style = when (val styleArg = param.args[1]) {
                        is Int -> styleArg
                        else -> styleFromFontStyle(styleArg)
                    }""",
        1,
    )
    source = source[:start_index] + """        val legacyHooked = runCatching {
""" + "\n".join(
        f"    {line}" for line in legacy_hook.splitlines()
    ) + """
        }.onFailure { Log.e("Failed to hook legacy React font manager", it) }
            .isSuccess

        val newFontManager = classLoader.safeLoadClass("il.c")
        val newFontStyle = classLoader.safeLoadClass("il.b")
        val newHooked = if (newFontManager != null && newFontStyle != null) {
            runCatching {
                XposedHelpers.findAndHookMethod(
                    newFontManager,
                    "a",
                    String::class.java,
                    newFontStyle,
                    AssetManager::class.java,
                    object : XC_MethodReplacement() {
                        override fun replaceHookedMethod(param: MethodHookParam): Typeface? {
                            val fontFamilyName = param.args[0].toString()
                            val style = styleFromFontStyle(param.args[1])
                            val assetManager = param.args[2] as AssetManager
                            return createAssetTypeface(fontFamilyName, style, assetManager)
                        }
                    }
                )
            }.onFailure { Log.e("Failed to hook il.c.a", it) }
                .isSuccess
        } else false

        if (!legacyHooked && !newHooked) {
            Log.e("Failed to hook createAssetTypeface on all known font manager classes")
        }""" + source[end_index:]

    source = replace_once(
        source,
        """        fontsDownloadsDir = File(appInfo.dataDir, "${Constants.FILES_DIR}/downloads/fonts").apply { asDir() }
        fontsDir = File(fontsDownloadsDir, fontDef.name!!).apply { asDir() }
        fontsAbsPath = fontsDir.absolutePath + "/"

        fontsDir.listFiles()?.forEach { file ->""",
        """        val fontName = fontDef.name ?: return@with
        val downloadsDir = File(appInfo.dataDir, "${Constants.FILES_DIR}/downloads/fonts").apply { asDir() }
        val setDir = File(downloadsDir, fontName).apply { asDir() }
        fontsDownloadsDir = downloadsDir
        fontsDir = setDir
        fontsAbsPath = setDir.absolutePath + "/"

        setDir.listFiles()?.forEach { file ->""",
        "font directory initialization",
    )
    source = replace_once(
        source,
        'File(fontsDir, "$name${FILE_EXTENSIONS.first { url.endsWith(it) }}").apply { asFile() }',
        'File(downloadsDir, "$fontName/$name${FILE_EXTENSIONS.first { url.endsWith(it) }}").apply { asFile() }',
        "font download destination",
    )
    old_font_file = """val (customName, refName) = fontFamilyName.split(":")
                        val file = File(fontsDownloadsDir, "$customName/$refName.$fileExtension").apply { asFile() }"""
    if source.count(old_font_file) != 1:
        raise SystemExit("Unexpected upstream fallback font lookup")
    source = source.replace(
        old_font_file,
        "val file = customFontFile(fontFamilyName, fileExtension) ?: continue",
    )
    old_font_file = """val (customName, refName) = fontFamilyName.split(":")
                val file = File(fontsDownloadsDir, "$customName/$refName.$fileExtension").apply { asFile() }
                if (!file.exists()) throw Exception()"""
    if source.count(old_font_file) != 1:
        raise SystemExit("Unexpected upstream custom font lookup")
    source = source.replace(
        old_font_file,
        """val file = customFontFile(fontFamilyName, fileExtension) ?: continue
                if (!file.exists()) continue""",
    )
    source = replace_once(
        source,
        "        val extension = EXTENSIONS[style]",
        '        val extension = EXTENSIONS.getOrElse(style) { "" }',
        "font style extension lookup",
    )
    closing_index = source.rfind("\n}")
    if closing_index < 0:
        raise SystemExit("Unexpected end of font module")
    source = source[:closing_index] + """

    private fun customFontFile(fontFamilyName: String, fileExtension: String): File? {
        val parts = fontFamilyName.split(":")
        if (parts.size != 2) return null
        val downloadsDir = fontsDownloadsDir ?: return null
        return File(downloadsDir, "${parts[0]}/${parts[1]}$fileExtension")
    }

    private fun styleFromFontStyle(fontStyle: Any?): Int {
        if (fontStyle == null) return 0
        return runCatching {
            val fields = fontStyle.javaClass.declaredFields
            val italic = fields.firstOrNull { it.type == Boolean::class.javaPrimitiveType }
                ?.apply { isAccessible = true }
                ?.getBoolean(fontStyle) ?: false
            val weight = fields.firstOrNull { it.type == Int::class.javaPrimitiveType }
                ?.apply { isAccessible = true }
                ?.getInt(fontStyle) ?: 400

            if (weight >= 700) {
                if (italic) 3 else 1
            } else {
                if (italic) 2 else 0
            }
        }.getOrDefault(0)
    }
""" + source[closing_index:]
    path.write_text(source, encoding="utf-8")


def patch_themes(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    source = replace_once(
        source,
        "import android.content.res.Resources\n",
        "import android.content.res.Resources\nimport android.view.View\n",
        "theme imports",
    )
    source = replace_once(
        source,
        "import io.github.revenge.xposed.Module\n",
        "import io.github.revenge.xposed.Module\nimport io.github.revenge.xposed.Utils.Log\n",
        "theme logger import",
    )
    start = "    fun hookTheme() {\n"
    end = "\n    // Parse HEX colour string"
    if source.count(start) != 1 or source.count(end) != 1:
        raise SystemExit("Unexpected upstream theme hook block")
    start_index = source.index(start)
    end_index = source.index(end, start_index)
    source = source[:start_index] + r'''    fun hookTheme() {
        val theme = this.theme ?: return

        theme.data.rawColors?.forEach { (key, value) ->
            rawColorMap[key.lowercase()] = hexStringToColorInt(value)
        }

        val darkThemes = listOf(
            "com.discord.theme.ThemeModule\$Dark",
            "com.discord.theme.DarkerTheme",
            "com.discord.theme.DarkTheme",
        ).mapNotNull { param.classLoader.safeLoadClass(it) }
        val lightThemes = listOf(
            "com.discord.theme.ThemeModule\$Light",
            "com.discord.theme.LightTheme",
        ).mapNotNull { param.classLoader.safeLoadClass(it) }

        if (darkThemes.isEmpty() || lightThemes.isEmpty()) {
            Log.w("Discord theme palette classes not found, skipping semantic color hooks")
        }

        theme.data.semanticColors?.forEach { (key, value) ->
            val methodName = "get${key.fromScreamingSnakeToCamelCase()}"
            value.forEachIndexed { index, color ->
                val targets = when (index) {
                    0 -> darkThemes
                    1 -> lightThemes
                    else -> emptyList()
                }
                targets.forEach { hookThemeMethod(it, methodName, hexStringToColorInt(color)) }
            }
        }

        if (theme.data.rawColors.isNullOrEmpty()) return

        val patch = MethodHookBuilder().run {
            before {
                val resources = when {
                    args[0] is Context -> (args[0] as Context).resources
                    args[0] is Resources -> args[0] as Resources
                    args.size > 1 && args[1] is Resources -> args[1] as Resources
                    args.size > 2 && args[2] is Resources -> args[2] as Resources
                    args.size > 1 && args[1] is View -> (args[1] as View).context.resources
                    else -> null
                }
                val colorId = when {
                    args[0] is Int -> args[0] as Int
                    args.size > 1 && args[1] is Int -> args[1] as Int
                    else -> null
                }

                if (resources != null && colorId != null) {
                    val name = runCatching { resources.getResourceEntryName(colorId) }.getOrNull()
                    if (name != null) rawColorMap[name]?.let { result = it }
                }
            }

            build()
        }

        param.classLoader.safeLoadClass("com.discord.theme.utils.ColorUtilsKt")?.let { themeManager ->
            listOf(
                runCatching {
                    themeManager.getDeclaredMethod(
                        "getColorCompat",
                        Resources::class.java,
                        Int::class.javaPrimitiveType,
                        Resources.Theme::class.java,
                    )
                }.getOrNull(),
                runCatching {
                    themeManager.getDeclaredMethod(
                        "getColorCompat", Context::class.java, Int::class.javaPrimitiveType
                    )
                }.getOrNull(),
            ).filterNotNull().forEach { it.hook(patch) }
        }

        param.classLoader.safeLoadClass("vh.c")?.let { colorUtils ->
            listOf(
                runCatching {
                    colorUtils.getDeclaredMethod(
                        "c",
                        Int::class.javaPrimitiveType,
                        Resources.Theme::class.java,
                        Resources::class.java,
                    )
                }.getOrNull(),
                runCatching {
                    colorUtils.getDeclaredMethod(
                        "e", Context::class.java, Int::class.javaPrimitiveType
                    )
                }.getOrNull(),
                runCatching {
                    colorUtils.getDeclaredMethod(
                        "d", Int::class.javaPrimitiveType, View::class.java
                    )
                }.getOrNull(),
            ).filterNotNull().forEach { it.hook(patch) }
        }
    }
''' + source[end_index:]
    path.write_text(source, encoding="utf-8")


if __name__ == "__main__":
    root = Path(sys.argv[1])
    modules = root / "app/src/main/kotlin/io/github/revenge/xposed/modules/appearance"
    patch_fonts(modules / "FontsModule.kt")
    patch_themes(modules / "ThemesModule.kt")
