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
    NSData *probe = [@"typeof globalThis.__r==='function'||typeof globalThis.metroRequire==='function'" dataUsingEncoding:NSUTF8StringEncoding];
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

static void injectCloudCordRuntime(jsi::Runtime &runtime)
{
    jsi::Runtime *expected = nullptr;
    jsi::Runtime *current = &runtime;
    if (!cloudCordInjectedRuntime.compare_exchange_strong(expected, current))
    {
        if (expected == current) return;
        cloudCordInjectedRuntime.store(current);
    }
    NSData *marker = [@"globalThis.__CLOUDCORD_BRIDGELESS__=true;if(typeof globalThis.__r!=='function'&&typeof globalThis.metroRequire==='function')globalThis.__r=globalThis.metroRequire" dataUsingEncoding:NSUTF8StringEncoding];
    if (!evaluateCloudCordData(marker, "cloudcord:architecture", runtime))
    {
        cloudCordInjectedRuntime.store(nullptr);
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
        if (discordRuntimeIsReady(runtime))
        {
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
    injectCloudCordModulesPatch(runtime);
    %orig;
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
