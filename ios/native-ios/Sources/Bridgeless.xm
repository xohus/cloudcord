#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <jsi/jsi.h>
#import <objc/runtime.h>

#include <atomic>
#include <functional>
#include <memory>
#include <string>

using namespace facebook;

extern "C" void MSHookMessageEx(Class, SEL, IMP, IMP *);

@interface NSObject (CloudCordRuntimeExecutor)
- (void)callFunctionOnBufferedRuntimeExecutor:
    (std::function<void(jsi::Runtime &)> &&)executor;
@end

@interface RCTHost : NSObject
- (void)instance:(id)instance didInitializeRuntime:(jsi::Runtime &)runtime;
@end

@interface BridgeRegistry : NSObject
+ (instancetype)shared;
- (NSDictionary *)dispatchPayload:(NSDictionary *)payload;
@end

namespace {

class CloudCordNSDataBuffer final : public jsi::Buffer
{
public:
    explicit CloudCordNSDataBuffer(NSData *data) : data_(data) {}
    size_t size() const override { return data_.length; }
    const uint8_t *data() const override
    {
        return static_cast<const uint8_t *>(data_.bytes);
    }

private:
    NSData *data_;
};

static std::atomic<jsi::Runtime *> cloudCordInjectedRuntime{nullptr};
static std::atomic_bool cloudCordRCTInstanceHooksInstalled{false};
static __weak id cloudCordLastRuntimeInstance = nil;

static void installCloudCordNativeBridge(jsi::Runtime &runtime)
{
    auto call = jsi::Function::createFromHostFunction(runtime,
        jsi::PropNameID::forUtf8(runtime, "__CLOUDCORD_NATIVE_CALL__"), 1,
        [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) -> jsi::Value {
            if (count != 1 || !args[0].isString())
                throw jsi::JSError(rt, "CloudCord native call expects a JSON payload");
            std::string json = args[0].asString(rt).utf8(rt);
            NSData *data = [NSData dataWithBytes:json.data() length:json.size()];
            id payload = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            if (![payload isKindOfClass:NSDictionary.class])
                throw jsi::JSError(rt, "Invalid CloudCord native payload");
            NSDictionary *result = [[BridgeRegistry shared] dispatchPayload:payload]
                ?: @{@"error": @"Unsupported CloudCord native payload"};
            NSData *encoded = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
            if (!encoded) throw jsi::JSError(rt, "Invalid CloudCord native result");
            return jsi::String::createFromUtf8(rt,
                std::string(static_cast<const char *>(encoded.bytes), encoded.length));
        });
    runtime.global().setProperty(runtime, "__CLOUDCORD_NATIVE_CALL__", std::move(call));
}

static BOOL evaluateCloudCordData(NSData *data, const char *tag, jsi::Runtime &runtime)
{
    if (data.length == 0) return NO;
    try
    {
        std::string source(static_cast<const char *>(data.bytes), data.length);
        auto buffer = std::make_shared<jsi::StringBuffer>(std::move(source));
        runtime.evaluateJavaScript(buffer, tag);
        return YES;
    }
    catch (const std::exception &error)
    {
        NSLog(@"[CloudCord] Bridgeless evaluation failed for %s: %s", tag, error.what());
        return NO;
    }
    catch (...)
    {
        NSLog(@"[CloudCord] Bridgeless evaluation failed for %s", tag);
        return NO;
    }
}

static NSData *cloudCordResource(NSString *name)
{
    for (NSString *bundleName in @[@"BunnyResources.bundle", @"CloudCordResources.bundle"])
    {
        NSString *path = [NSBundle.mainBundle.bundlePath stringByAppendingPathComponent:bundleName];
        NSURL *url = [[NSBundle bundleWithPath:path] URLForResource:name withExtension:@"js"];
        if (url)
        {
            NSData *data = [NSData dataWithContentsOfURL:url];
            if (data.length) return data;
        }
    }
    NSURL *fallback = [NSBundle.mainBundle URLForResource:name withExtension:@"js"];
    return fallback ? [NSData dataWithContentsOfURL:fallback] : nil;
}

static BOOL discordRuntimeIsReady(jsi::Runtime &runtime)
{
    // Discord 344 creates Metro before its React/React Native modules are ready.
    // Running CloudCord at that earlier point succeeds syntactically but misses
    // the settings stores, so no CloudCord sections are registered.
    NSString *script =
        @"(()=>{"
         "if(typeof globalThis.__r!=='function'&&typeof globalThis.metroRequire==='function')globalThis.__r=globalThis.metroRequire;"
         "const map=globalThis.modules??globalThis.__c?.();"
         "if(!globalThis.modules&&map)globalThis.modules=map;"
         "if(!map)return false;"
         "let rn=false,react=false;"
         "for(const m of(typeof map.values==='function'?map.values():Object.values(map))){"
           "const e=m?.publicModule?.exports??m?.exports??m;"
           "for(const value of[e,e?.default,e?.default?.default]){"
             "if(!value)continue;"
             "if(!rn&&value.AppState&&value.NativeModules)rn=true;"
             "if(!react&&typeof value.createElement==='function')react=true;"
             "if(rn&&react)return true;"
           "}"
         "}"
         "return false;"
        "})()";
    NSData *probe = [script dataUsingEncoding:NSUTF8StringEncoding];
    try
    {
        std::string source(static_cast<const char *>(probe.bytes), probe.length);
        auto buffer = std::make_shared<jsi::StringBuffer>(std::move(source));
        jsi::Value result = runtime.evaluateJavaScript(buffer, "cloudcord:discord-ready");
        return result.isBool() && result.getBool();
    }
    catch (...) { return NO; }
}

static void injectCloudCordModulesPatch(jsi::Runtime &runtime)
{
    NSData *modulesPatch = cloudCordResource(@"modules");
    if (modulesPatch.length)
        evaluateCloudCordData(modulesPatch, "cloudcord:modules", runtime);
}

static void injectCloudCordRuntime(jsi::Runtime &runtime, bool early = false)
{
    jsi::Runtime *expected = nullptr;
    jsi::Runtime *current = &runtime;
    if (!cloudCordInjectedRuntime.compare_exchange_strong(expected, current))
    {
        if (expected == current) return;
        cloudCordInjectedRuntime.store(current);
    }
    NSString *architecture = early
        ? @"globalThis.__CLOUDCORD_BRIDGELESS__=true;globalThis.__CLOUDCORD_EARLY_INJECTION__=true;"
        : @"globalThis.__CLOUDCORD_BRIDGELESS__=true;"
                       "if(typeof globalThis.__r!=='function'&&typeof globalThis.metroRequire==='function')globalThis.__r=globalThis.metroRequire;"
                       "(()=>{const m=globalThis.modules??globalThis.__c?.();"
                       "if(!m)return;"
                       "globalThis.modules=m;"
                       "globalThis.__CLOUDCORD_MODULE_VIEW__=typeof m.entries==='function'?Object.fromEntries(m.entries()):m;"
                       "})()";
    NSData *marker = [architecture dataUsingEncoding:NSUTF8StringEncoding];
    if (!evaluateCloudCordData(marker, "cloudcord:architecture", runtime))
    {
        cloudCordInjectedRuntime.store(nullptr);
        return;
    }
    // The legacy bridge path is skipped on 344; initialize the loader identity
    // here before runtime modules snapshot __PYON_LOADER__ at import time.
    installCloudCordNativeBridge(runtime);
    NSData *bootstrap = cloudCordResource(@"payload-base");
    if (!bootstrap.length ||
        !evaluateCloudCordData(bootstrap, "cloudcord:loader-bootstrap", runtime))
    {
        cloudCordInjectedRuntime.store(nullptr);
        NSLog(@"[CloudCord] Loader bootstrap missing or invalid; skipping runtime");
        return;
    }
    NSData *runtimeBundle = cloudCordResource(@"runtime");
    if (!runtimeBundle.length ||
        !evaluateCloudCordData(runtimeBundle, "cloudcord:runtime", runtime))
    {
        cloudCordInjectedRuntime.store(nullptr);
        NSLog(@"[CloudCord] Full 344 runtime injection failed");
        return;
    }
    NSLog(@"[CloudCord] Full 344 runtime injected after Discord bundle");
}

static void scheduleCloudCordRuntime(id instance, NSUInteger attempt)
{
    if (!instance || ![instance respondsToSelector:@selector(callFunctionOnBufferedRuntimeExecutor:)])
        return;
    cloudCordLastRuntimeInstance = instance;
    [instance callFunctionOnBufferedRuntimeExecutor:[instance, attempt](jsi::Runtime &runtime) {
        // Repeat the small registry capture as Discord replaces __d during boot.
        injectCloudCordModulesPatch(runtime);
        if (discordRuntimeIsReady(runtime))
        {
            NSLog(@"[CloudCord] Discord React Native modules are ready");
            injectCloudCordRuntime(runtime);
            return;
        }
        if (attempt < 300)
        {
            NSTimeInterval delay = attempt < 50 ? 0.1 : (attempt < 150 ? 0.25 : 0.5);
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, delay * NSEC_PER_SEC),
                dispatch_get_main_queue(), ^{ scheduleCloudCordRuntime(instance, attempt + 1); });
        }
        else
            NSLog(@"[CloudCord] Discord runtime readiness timed out; skipping injection");
    }];
}

typedef void (*CloudCordLoadBundleIMP)(id, SEL, NSURL *);
typedef void (*CloudCordLoadSourceIMP)(id, SEL, id);
static CloudCordLoadBundleIMP originalLoadBundle = nullptr;
static CloudCordLoadSourceIMP originalLoadSource = nullptr;

static void cloudCordLoadBundle(id self, SEL selector, NSURL *url)
{
    if ([self respondsToSelector:@selector(callFunctionOnBufferedRuntimeExecutor:)])
        [self callFunctionOnBufferedRuntimeExecutor:[](jsi::Runtime &runtime) {
            injectCloudCordModulesPatch(runtime);
        }];
    if (originalLoadBundle) originalLoadBundle(self, selector, url);
    scheduleCloudCordRuntime(self, 0);
}

static void cloudCordLoadSource(id self, SEL selector, id source)
{
    if ([self respondsToSelector:@selector(callFunctionOnBufferedRuntimeExecutor:)])
        [self callFunctionOnBufferedRuntimeExecutor:[](jsi::Runtime &runtime) {
            injectCloudCordModulesPatch(runtime);
        }];
    if (originalLoadSource) originalLoadSource(self, selector, source);
    scheduleCloudCordRuntime(self, 0);
}

static void installRCTInstanceHooks(NSUInteger attempt)
{
    if (cloudCordRCTInstanceHooksInstalled.load()) return;
    Class cls = NSClassFromString(@"RCTInstance");
    Method bundle = cls ? class_getInstanceMethod(cls, NSSelectorFromString(@"_loadJSBundle:")) : nullptr;
    Method source = cls ? class_getInstanceMethod(cls, NSSelectorFromString(@"_loadScriptFromSource:")) : nullptr;
    if (!cls || (!bundle && !source))
    {
        if (attempt < 300) dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.1 * NSEC_PER_SEC),
            dispatch_get_main_queue(), ^{ installRCTInstanceHooks(attempt + 1); });
        return;
    }
    if (bundle) MSHookMessageEx(cls, NSSelectorFromString(@"_loadJSBundle:"),
        (IMP)cloudCordLoadBundle, (IMP *)&originalLoadBundle);
    if (source) MSHookMessageEx(cls, NSSelectorFromString(@"_loadScriptFromSource:"),
        (IMP)cloudCordLoadSource, (IMP *)&originalLoadSource);
    cloudCordRCTInstanceHooksInstalled.store(true);
    NSLog(@"[CloudCord] Installed Discord 344 RCTInstance loader hooks");
}

} // namespace

%hook RCTHost

- (void)instance:(id)instance didInitializeRuntime:(jsi::Runtime &)runtime
{
    NSLog(@"[CloudCord] RCTHost bridgeless runtime initialized");
    %orig;
    // Inject on the same runtime-creation boundary used by RainTweak, before
    // Metro's entry module runs. The bundled entry owns the startup handoff.
    injectCloudCordRuntime(runtime, true);
    if (cloudCordInjectedRuntime.load() != &runtime)
        scheduleCloudCordRuntime(instance, 0);
}

%end

%ctor
{
    @autoreleasepool
    {
        installRCTInstanceHooks(0);
        [NSNotificationCenter.defaultCenter
            addObserverForName:UIApplicationDidBecomeActiveNotification
            object:nil queue:NSOperationQueue.mainQueue usingBlock:^(__unused NSNotification *note) {
                if (!cloudCordInjectedRuntime.load() && cloudCordLastRuntimeInstance)
                    scheduleCloudCordRuntime(cloudCordLastRuntimeInstance, 0);
            }];
    }
}
