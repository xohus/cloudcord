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
    static NSString *probe = @"(()=>{try{const m=globalThis.modules??globalThis.__c?.();if(!globalThis.modules&&m)globalThis.modules=m;return !!m&&typeof globalThis.__r==='function'&&Object.keys(m).length>0}catch{return false}})()";
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
    // React Native 344 registers Metro modules after RCTHost creates Hermes.
    // Capture the module table while Discord's main bundle is defining it. A
    // post-load `__c()` snapshot is too late for Kettu and can stall startup.
    NSString *source = @"Object.defineProperties(globalThis,{__d:{configurable:true,get(){globalThis.modules\x3f\x3f=globalThis.__c?.();return this.value},set(v){this.value=v}}});globalThis.__CLOUDCORD_BRIDGELESS__=true;";
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
            if (attempt < 300)
            {
                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.1 * NSEC_PER_SEC),
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

        NSData *preload = cloudCordResource(@"payload-base");
        NSData *runtimeBundle = cloudCordResource(@"runtime");
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
        executeCloudCordBridgeless(instance, 0);
}

%end
