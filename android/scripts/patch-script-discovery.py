"""Hook Discord's explicit React Native script-loader implementations."""
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
old_candidates = '''        listOf(
            "com.facebook.react.runtime.ReactInstance\\$loadJSBundle$1",'''
if source.count(old_candidates) != 1:
    raise SystemExit("Unexpected script loader class candidates")
source = source.replace(old_candidates, '''        listOf(
            "org.chromium.net.j",
            "com.facebook.react.runtime.ReactInstance\\$loadJSBundle$1",''')
old = ').mapNotNull { classLoader.safeLoadClass(it) }.forEach { hook(it) }'
if source.count(old) != 1:
    raise SystemExit("Unexpected script loader class discovery")
path.write_text(source, encoding="utf-8")

payload_path = path.with_name("PayloadGlobalModule.kt")
payload = payload_path.read_text(encoding="utf-8")
old_script_loader = '''        val scriptLoader = classLoader.safeLoadClass("com.facebook.react.runtime.ReactInstance\\$loadJSBundle$1")'''
if payload.count(old_script_loader) != 1:
    raise SystemExit("Unexpected payload script loader selection")
payload = payload.replace(old_script_loader, '''        val scriptLoader = classLoader.safeLoadClass("org.chromium.net.j")
            ?: classLoader.safeLoadClass("com.facebook.react.runtime.ReactInstance\\$loadJSBundle$1")''')
old = '        listOf(catalystInstance, scriptLoader).forEach { if (it != null) hook(it, hook) }'
if payload.count(old) != 1:
    raise SystemExit("Unexpected payload script loader discovery")
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
