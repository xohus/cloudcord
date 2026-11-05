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
        "if (mainScript.isFile && mainScript.length() > 0) runScriptFile(mainScript)",
        1,
    )
    if "runBlocking" in source or "readyDeferred" in source or "updateRequested.compareAndSet" not in source:
        raise ValueError("Blocking startup hook remains")
    path.write_text(source, encoding="utf-8")


def patch_activity_hook(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    old = "        val reactActivity = classLoader.loadClass(Constants.TARGET_ACTIVITY)"
    if source.count(old) != 1:
        raise ValueError("Unexpected upstream Discord activity lookup")
    source = source.replace(old, """        // Recent Discord APKs no longer ship the old ReactActivity class.
        // Use the framework callback in that case so the script hooks below
        // still get installed, and ignore activities outside the patched app.
        val reactActivity = try {
            classLoader.loadClass(Constants.TARGET_ACTIVITY)
        } catch (_: ClassNotFoundException) {
            Activity::class.java
        }
        val targetPackage = packageName""")
    old = "                val act = thisObject as Activity\n                Log.i(\"Received Activity\")"
    if source.count(old) != 1:
        raise ValueError("Unexpected upstream activity callback")
    source = source.replace(old, """                val act = thisObject as Activity
                if (act.packageName != targetPackage) return@after
                Log.i("Received Activity")""")
    path.write_text(source, encoding="utf-8")


if __name__ == "__main__":
    loader = Path(sys.argv[1])
    patch_loader(loader)
    patch_activity_hook(loader.parents[1] / "Main.kt")
