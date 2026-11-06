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

payload_path = path.with_name("PayloadGlobalModule.kt")
payload = payload_path.read_text(encoding="utf-8")
old = '        listOf(catalystInstance, scriptLoader).forEach { if (it != null) hook(it, hook) }'
if payload.count(old) != 1:
    raise SystemExit("Unexpected payload script loader discovery")
payload = payload.replace(old, '''        val discovered = ScriptLoaderDiscovery.discover(
            listOf(appInfo.sourceDir) + (appInfo.splitSourceDirs?.toList() ?: emptyList())
        ).mapNotNull { classLoader.safeLoadClass(it) }
        (listOfNotNull(catalystInstance, scriptLoader) + discovered).distinct()
            .filterNot { it.isInterface || java.lang.reflect.Modifier.isAbstract(it.modifiers) }
            .forEach { hook(it, hook) }''')
payload = payload.replace('scriptLoader!!.method(', 'param.method.declaringClass.method(')
old = '''        val hook = MethodHookBuilder().run {
            before {
                setGlobalVariable(param, GLOBAL_NAME, getPayloadString())
            }

            build()
        }'''
if payload.count(old) != 1:
    raise SystemExit("Unexpected payload hook")
payload = payload.replace(old, '''        // Loader metadata must exist before the main JS bundle executes.
        val hook = object : XC_MethodHook(XC_MethodHook.PRIORITY_HIGHEST) {
            override fun beforeHookedMethod(param: MethodHookParam) {
                setGlobalVariable(param, GLOBAL_NAME, getPayloadString())
            }
        }''')
payload_path.write_text(payload, encoding="utf-8")

main_path = path.parent.parent / "Main.kt"
main = main_path.read_text(encoding="utf-8")
for callback, argument in [("onInit", "startupParam"), ("onLoad", "packageParam"), ("onContext", "context"), ("onActivity", "activity")]:
    old = f"for (module in modules) module.{callback}({argument})"
    if main.count(old) != 1:
        raise SystemExit(f"Unexpected module callback: {callback}")
    main = main.replace(old, f'''for (module in modules) {{
            runCatching {{ module.{callback}({argument}) }}
                .onFailure {{ Log.e("CloudCord module ${{module.javaClass.simpleName}} {callback} failed", it) }}
        }}''')
main_path.write_text(main, encoding="utf-8")
