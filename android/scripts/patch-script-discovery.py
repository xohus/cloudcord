"""Find Android script loading delegates even when R8 renames ReactInstance."""
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
old = ').mapNotNull { classLoader.safeLoadClass(it) }.forEach { hook(it) }'
if source.count(old) != 1:
    raise SystemExit("Unexpected script loader class discovery")
source = source.replace(old, ''').plus(runCatching {
            ScriptLoaderDiscovery.discover(listOf(appInfo.sourceDir) + (appInfo.splitSourceDirs?.toList() ?: emptyList()))
        }.onFailure { Log.e("CloudCord script delegate discovery failed", it) }.getOrDefault(emptySet()))
            .distinct().mapNotNull { classLoader.safeLoadClass(it) }
            .filterNot { it.isInterface || java.lang.reflect.Modifier.isAbstract(it.modifiers) }
            .forEach { hook(it) }''')
path.write_text(source, encoding="utf-8")
path.with_name("ScriptLoaderDiscovery.kt").write_text(
    Path(__file__).with_name("ScriptLoaderDiscovery.kt").read_text(encoding="utf-8"), encoding="utf-8")
