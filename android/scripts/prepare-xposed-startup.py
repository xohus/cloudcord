import sys
from pathlib import Path


def patch_loader(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    start = source.index("        runBlocking {")
    end = source.index("        val loadSynchronously = args[2]", start)
    old = source[start:end]
    if "HookStateHolder.readyDeferred" not in old or "UpdaterModule.downloadScript" not in old:
        raise ValueError("Unexpected upstream script loader startup block")

    source = source[:start] + """        // Startup uses the cached or bundled runtime. Downloading a newer
        // bundle must not wait on Activity.onCreate or block React Native.
        if (updateRequested.compareAndSet(false, true)) {
            runCatching { UpdaterModule.downloadScript(showUpdateDialog = true) }
                .onFailure { Log.e("Could not start CloudCord runtime update:", it) }
        }

""" + source[end:]
    for name in (
        "io.github.revenge.xposed.HookStateHolder",
        "kotlinx.coroutines.async",
        "kotlinx.coroutines.awaitAll",
        "kotlinx.coroutines.runBlocking",
    ):
        source = source.replace(f"import {name}\n", "")
    source = source.replace("import java.lang.reflect.Method\n", "import java.lang.reflect.Method\nimport java.util.concurrent.atomic.AtomicBoolean\n")
    source = source.replace(
        "    private lateinit var mainScript: File\n",
        "    private lateinit var mainScript: File\n    private val updateRequested = AtomicBoolean(false)\n",
        1,
    )
    source = source.replace(
        "if (mainScript.exists()) runScriptFile(mainScript)",
        """val cachedBundleIsCloudCord = runCatching {
                    mainScript.isFile && mainScript.length() > 0 &&
                        mainScript.inputStream().use { input ->
                            val header = ByteArray(64 * 1024)
                            val read = input.read(header)
                            read > 0 && String(header, 0, read, Charsets.UTF_8)
                                .contains("__CLOUDCORD_RUNTIME_REVISION__")
                        }
                }.getOrDefault(false)
                if (cachedBundleIsCloudCord) runScriptFile(mainScript)""",
        1,
    )
    fallback_log = 'Log.i("Main script does not exist, falling back")'
    if source.count(fallback_log) != 1:
        raise ValueError("Unexpected bundled runtime fallback log")
    source = source.replace(
        fallback_log,
        'Log.i(if (mainScript.exists()) "Cached bundle is not CloudCord; using embedded CloudCord runtime" else "Main script does not exist, falling back")',
    )
    if (
        "runBlocking" in source
        or "readyDeferred" in source
        or "updateRequested.compareAndSet" not in source
        or "__CLOUDCORD_RUNTIME_REVISION__" not in source
    ):
        raise ValueError("Blocking startup hook remains")
    path.write_text(source, encoding="utf-8")


if __name__ == "__main__":
    loader = Path(sys.argv[1])
    patch_loader(loader)
