#import <Foundation/Foundation.h>
#import <jsi/jsi.h>

#include <atomic>
#include <functional>
#include <memory>
#include <string>

using namespace facebook;

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

static __weak id cloudCordRuntimeInstance = nil;
static std::atomic_bool cloudCordBridgelessScheduled{false};
static std::atomic_bool cloudCordRuntimeStabilizing{false};
// Discord 344 compatibility is intentionally isolated from the legacy bridge.

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

static BOOL cloudCordMetroIsReady(jsi::Runtime &runtime)
{
    // Match the readiness contract used by maintained bridgeless loaders. A
    // Metro table existing is not enough: evaluating Kettu before React Native
    // and React are exported can monopolize the JS thread during app startup.
    static NSString *probe = @"(()=>{try{const m=globalThis.modules\x3f\x3f globalThis.__c?.();if(!globalThis.modules&&m)globalThis.modules=m;if(!m||typeof m.values!=='function')return false;let rn=false,react=false,active=false,user=false;for(const entry of m.values()){const e=entry?.publicModule?.exports\x3f\x3f entry?.exports\x3f\x3f entry;for(const value of [e,e?.default,e?.default?.default]){if(!value)continue;if(!rn&&value.AppState&&value.NativeModules){rn=true;active=value.AppState.currentState==='active'}if(!react&&typeof value.createElement==='function')react=true;if(!user&&typeof value.getCurrentUser==='function'){try{user=!!value.getCurrentUser()}catch{}}if(rn&&react&&active&&user)return true}}return false}catch{return false}})()";
    NSData *data = [probe dataUsingEncoding:NSUTF8StringEncoding];
    try
    {
        std::string source(static_cast<const char *>(data.bytes), data.length);
        auto buffer = std::make_shared<jsi::StringBuffer>(std::move(source));
        jsi::Value result = runtime.evaluateJavaScript(buffer, "cloudcord:readiness");
        return result.isBool() && result.getBool();
    }
    catch (...) { return NO; }
}

static NSData *cloudCordResource(NSString *name)
{
    NSString *path = [NSBundle.mainBundle.bundlePath
        stringByAppendingPathComponent:@"BunnyResources.bundle"];
    NSBundle *resources = [NSBundle bundleWithPath:path];
    NSURL *url = [resources URLForResource:name withExtension:@"js"];
    return url ? [NSData dataWithContentsOfURL:url] : nil;
}

static void installCloudCordModuleCapture(jsi::Runtime &runtime)
{
    // Do not replace Discord's Metro globals before main.jsbundle. Discord 344
    // owns their descriptors and wrapping __d can terminate startup. We only
    // mark the architecture here; a compatibility view is created after React
    // Native is fully ready, immediately before CloudCord executes.
    NSString *source = @"globalThis.__CLOUDCORD_BRIDGELESS__=true";
    evaluateCloudCordData([source dataUsingEncoding:NSUTF8StringEncoding],
                          "cloudcord:modules", runtime);
}

static void executeCloudCordBridgeless(id instance, NSUInteger attempt)
{
    if (!instance || ![instance respondsToSelector:@selector(callFunctionOnBufferedRuntimeExecutor:)])
        return;

    [instance callFunctionOnBufferedRuntimeExecutor:[attempt](jsi::Runtime &runtime) {
        if (!cloudCordMetroIsReady(runtime))
        {
            if (attempt < 120)
            {
                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.25 * NSEC_PER_SEC),
                               dispatch_get_main_queue(), ^{
                    executeCloudCordBridgeless(cloudCordRuntimeInstance, attempt + 1);
                });
            }
            else
            {
                NSLog(@"[CloudCord] Bridgeless Metro readiness timed out");
                cloudCordBridgelessScheduled.store(false);
            }
            return;
        }

        // React and RN exports become visible before Discord has finished
        // restoring the authenticated account and navigation stores. Patching
        // during that window can leave 344 on an endless account loader. Give
        // Discord one bounded stabilization period, then re-enter through the
        // buffered runtime executor.
        if (attempt < 1000 && !cloudCordRuntimeStabilizing.exchange(true))
        {
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 6 * NSEC_PER_SEC),
                           dispatch_get_main_queue(), ^{
                executeCloudCordBridgeless(cloudCordRuntimeInstance, 1000);
            });
            return;
        }

        NSData *preload = cloudCordResource(@"payload-base");
        NSData *runtimeBundle = cloudCordResource(@"runtime");
        NSString *compat = @"(()=>{const raw=globalThis.__c?.();if(raw&&typeof raw.entries==='function'){const view={};for(const [id,module] of raw.entries())view[id]=module;globalThis.modules=view}else if(raw)globalThis.modules=raw})()";
        if (!evaluateCloudCordData([compat dataUsingEncoding:NSUTF8StringEncoding],
                                   "cloudcord:metro-compat", runtime)) return;
        if (!evaluateCloudCordData(preload, "cloudcord:preload", runtime)) return;

        NSString *marker = @"globalThis.__CLOUDCORD_LOADER__&&Object.assign(globalThis.__CLOUDCORD_LOADER__,{loaderName:'CloudCord',loaderVersion:'2',cloudcordAutoUpdateVersion:4});";
        evaluateCloudCordData([marker dataUsingEncoding:NSUTF8StringEncoding],
                              "cloudcord:loader-marker", runtime);
        if (evaluateCloudCordData(runtimeBundle, "cloudcord:runtime", runtime))
            NSLog(@"[CloudCord] Bridgeless runtime executed successfully");
    }];
}

} // namespace

%hook RCTHost

- (void)instance:(id)instance didInitializeRuntime:(jsi::Runtime &)runtime
{
    cloudCordRuntimeInstance = instance;
    NSLog(@"[CloudCord] RCTHost bridgeless runtime initialized");
    // This must run before Discord evaluates main.jsbundle.
    installCloudCordModuleCapture(runtime);
    %orig;

    if (!cloudCordBridgelessScheduled.exchange(true))
    {
        // Let Discord enqueue main.jsbundle before the first readiness probe.
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 1.0 * NSEC_PER_SEC),
                       dispatch_get_main_queue(), ^{
            executeCloudCordBridgeless(cloudCordRuntimeInstance, 0);
        });
    }
}

%end
