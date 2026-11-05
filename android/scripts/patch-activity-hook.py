"""Keep module registration reachable after Discord removed ReactActivity."""
import sys
from pathlib import Path


def patch_activity_hook(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    old = "        val reactActivity = classLoader.loadClass(Constants.TARGET_ACTIVITY)"
    if source.count(old) != 1:
        raise ValueError("Unexpected upstream Discord activity lookup")
    source = source.replace(old, """        val reactActivity = try {
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
    patch_activity_hook(Path(sys.argv[1]))
