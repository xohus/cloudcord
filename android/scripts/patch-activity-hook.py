"""Keep module registration reachable across Discord activity class changes."""
import sys
from pathlib import Path


def patch_activity_hook(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    old = "        val reactActivity = classLoader.loadClass(Constants.TARGET_ACTIVITY)"
    if source.count(old) != 1:
        raise ValueError("Unexpected upstream Discord activity lookup")
    source = source.replace(old, """        val reactActivity = runCatching {
        classLoader.loadClass("${Constants.TARGET_PACKAGE}.main.MainActivity")
        }.getOrElse {
            runCatching { classLoader.loadClass(Constants.TARGET_ACTIVITY) }
                .getOrElse { Activity::class.java }
        }
        val targetPackage = packageName""")
    old = "                val act = thisObject as Activity\n                Log.i(\"Received Activity\")"
    if source.count(old) != 1:
        raise ValueError("Unexpected upstream activity callback")
    source = source.replace(old, """                val act = thisObject as Activity
                if (act.packageName != targetPackage) return@after
                Log.i("Received Activity")""")
    old = "                this@Main.onActivity(act)"
    if source.count(old) != 1:
        raise ValueError("Unexpected upstream module activity dispatch")
    source = source.replace(old, """                this@Main.onActivity(act)
                runCatching { CloudCordRecovery.attach(act) }
                    .onFailure { Log.e("CloudCord recovery attachment failed", it) }""")
    path.write_text(source, encoding="utf-8")
    recovery = Path(__file__).with_name("CloudCordRecovery.kt")
    path.with_name(recovery.name).write_bytes(recovery.read_bytes())


if __name__ == "__main__":
    patch_activity_hook(Path(sys.argv[1]))
