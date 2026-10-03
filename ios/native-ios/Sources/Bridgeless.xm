// Adapted from raincord/RainTweak c2fa89a6 under OSL-3.0.
// Modified for CloudCord identity, bridge dispatch and bundled runtime.
#import <Foundation/Foundation.h>
#import <jsi/jsi.h>
#import "JSI.h"
#import "Logger.h"
#import "Utils.h"
#import "LoaderConfig.h"
#import <CommonCrypto/CommonDigest.h>
@interface BridgeRegistry : NSObject
+ (instancetype)shared;
- (NSDictionary *)dispatchPayload:(NSDictionary *)payload;
@end
@interface RCTHost : NSObject
- (void)instance:(id)instance didInitializeRuntime:(facebook::jsi::Runtime &)runtime;
@end
using namespace facebook;
static NSURL *resolveDownloadURL(void)
{
    LoaderConfig *fresh = [LoaderConfig getLoaderConfig];
    if (fresh.customLoadUrlEnabled && fresh.customLoadUrl)
    {
        return fresh.customLoadUrl;
    }
    return [NSURL URLWithString:@"https://getcloudcord.com/api/proxy/raw/dist/cc.js"];
}

static dispatch_queue_t fsQueue(void)
{
    static dispatch_queue_t queue;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        queue = dispatch_queue_create("app.cloudcord.fsQueue", DISPATCH_QUEUE_SERIAL);
    });
    return queue;
}

static void downloadBundleForNextLaunch(NSURL *rainDir)
{
    NSURL *bundleFileURL = [rainDir URLByAppendingPathComponent:@"bundle.js"];
    NSURL *targetURL = resolveDownloadURL();

    if (!targetURL) return;

    NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:targetURL
                                                       cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData
                                                   timeoutInterval:15.0];

    NSFileManager *fm = [NSFileManager defaultManager];
    NSURL *etagFileURL = [rainDir URLByAppendingPathComponent:@"etag.txt"];

    __block NSString *etag = nil;
    dispatch_sync(fsQueue(), ^{
        if ([fm fileExistsAtPath:bundleFileURL.path])
            etag = [NSString stringWithContentsOfURL:etagFileURL encoding:NSUTF8StringEncoding error:nil];
    });
    if (etag)
        [req setValue:etag forHTTPHeaderField:@"If-None-Match"];

    NSURLSession *session = [NSURLSession sessionWithConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]];
    [[session dataTaskWithRequest:req
                completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if ([response isKindOfClass:[NSHTTPURLResponse class]])
        {
            NSHTTPURLResponse *http = (NSHTTPURLResponse *)response;
            if (http.statusCode == 200 && data.length > 0)
            {
                dispatch_sync(fsQueue(), ^{
                    [data writeToURL:bundleFileURL atomically:YES];
                    NSString *newEtag = [http valueForHTTPHeaderField:@"Etag"];
                    if (newEtag)
                        [newEtag writeToURL:etagFileURL atomically:YES encoding:NSUTF8StringEncoding error:nil];
                    else
                        [fm removeItemAtURL:etagFileURL error:nil];
                });
            }
        }
        else if (error)
        {
            BunnyLog(@"downloadBundleForNextLaunch: Error: %@", error.localizedDescription);
        }
        [session finishTasksAndInvalidate];
    }] resume];
}

static void executePreloads(jsi::Runtime &runtime, NSURL *rainDir)
{
    NSURL *preloadsDirectory = [rainDir URLByAppendingPathComponent:@"preloads"];
    if ([[NSFileManager defaultManager] fileExistsAtPath:preloadsDirectory.path])
    {
        NSArray *contents = [[NSFileManager defaultManager] contentsOfDirectoryAtURL:preloadsDirectory
                                                           includingPropertiesForKeys:nil options:0 error:nil];
        for (NSURL *fileURL in contents)
        {
            if ([[fileURL pathExtension] isEqualToString:@"js"])
            {
                NSData *data = [NSData dataWithContentsOfURL:fileURL];
                if (data) [JSI evaluate:data tag:@"rain:preload" runtime:runtime];
            }
        }
    }
}


static void injectPreBundle(jsi::Runtime &runtime)
{
    try
    {
        jsi::Object loaderObj(runtime);
        loaderObj.setProperty(runtime, "loaderName", jsi::String::createFromUtf8(runtime, "RainTweak"));
        loaderObj.setProperty(runtime, "loaderVersion", jsi::String::createFromUtf8(runtime, [PACKAGE_VERSION UTF8String]));
        loaderObj.setProperty(runtime, "hasThemeSupport", false);
        loaderObj.setProperty(runtime, "storedTheme", jsi::Value::null());
        loaderObj.setProperty(runtime, "fontPatch", 0);
        runtime.global().setProperty(runtime, "__RAIN_LOADER__", loaderObj);

        auto parsePayload = [](jsi::Runtime &rt, const jsi::Value *args, size_t count, NSString **methodOut, NSArray **argsOut) {
            if (count < 1 || !args[0].isObject()) {
                throw jsi::JSError(rt, "Expected a single payload object as argument.");
            }
            jsi::Object payload = args[0].asObject(rt);

            jsi::Value rainVal = payload.getProperty(rt, "rain");
            if (!rainVal.isObject()) throw jsi::JSError(rt, "Payload missing 'rain' object.");
            jsi::Object rain = rainVal.asObject(rt);

            jsi::Value methodVal = rain.getProperty(rt, "method");
            if (!methodVal.isString()) throw jsi::JSError(rt, "'method' property must be a string.");
            *methodOut = [JSI toNSString:methodVal runtime:rt];

            *argsOut = @[];
            jsi::Value argsVal = rain.getProperty(rt, "args");
            if (argsVal.isObject() && argsVal.asObject(rt).isArray(rt)) {
                *argsOut = [JSI toObjC:argsVal runtime:rt];
            }
        };

        auto syncCall = jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forUtf8(runtime, "__RAIN_BRIDGE_CALL_SYNC__"),
            1,
            [parsePayload](jsi::Runtime &rt, const jsi::Value &thisVal, const jsi::Value *args, size_t count) -> jsi::Value {
                NSString *methodName;
                NSArray *objcArgs;
                parsePayload(rt, args, count, &methodName, &objcArgs);

                NSDictionary *res = [[BridgeRegistry shared] dispatchPayload:@{@"rain": @{@"method": methodName, @"args": objcArgs ?: @[]}}];
                return [JSI fromObjC:res runtime:rt];
            }
        );
        runtime.global().setProperty(runtime, "__RAIN_BRIDGE_CALL_SYNC__", syncCall);

        auto asyncCall = jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forUtf8(runtime, "__RAIN_BRIDGE_CALL_ASYNC__"),
            1,
            [parsePayload](jsi::Runtime &rt, const jsi::Value &thisVal, const jsi::Value *args, size_t count) -> jsi::Value {
                NSString *methodName;
                NSArray *objcArgs;
                parsePayload(rt, args, count, &methodName, &objcArgs);

                jsi::Function promiseCtor = rt.global().getPropertyAsFunction(rt, "Promise");
                jsi::Function executor = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forUtf8(rt, "executor"), 2,
                    [methodName, objcArgs](jsi::Runtime &innerRt, const jsi::Value &thisVal, const jsi::Value *innerArgs, size_t innerCount) -> jsi::Value {
                        jsi::Function resolve = innerArgs[0].asObject(innerRt).asFunction(innerRt);
                        NSDictionary *res = [[BridgeRegistry shared] dispatchPayload:@{@"rain": @{@"method": methodName, @"args": objcArgs ?: @[]}}];
                        resolve.call(innerRt, [JSI fromObjC:res runtime:innerRt]);
                        return jsi::Value::undefined();
                    });
                return promiseCtor.callAsConstructor(rt, executor);
            }
        );
        runtime.global().setProperty(runtime, "__RAIN_BRIDGE_CALL_ASYNC__", asyncCall);

    }
    catch (const jsi::JSError &e) { BunnyLog(@"injectPreBundle: JSError: %s", e.what()); }
    catch (const std::exception &e) { BunnyLog(@"injectPreBundle: exception: %s", e.what()); }
}


%hook RCTHost
- (void)instance:(id)instance didInitializeRuntime:(jsi::Runtime &)runtime
{
    %orig;
    [[LoaderConfig getLoaderConfig] loadConfig];
    NSURL *rainDir = getPyoncordDirectory();
    injectPreBundle(runtime);
    NSString *bundlePath = [NSBundle.mainBundle.bundlePath stringByAppendingPathComponent:@"BunnyResources.bundle"];
    NSBundle *resources = [NSBundle bundleWithPath:bundlePath];
    NSData *identity = [@"globalThis.__CLOUDCORD_LOADER__=Object.assign(globalThis.__RAIN_LOADER__,{loaderName:'CloudCord',cloudcordAutoUpdateVersion:3,hasThemeSupport:false,fontPatch:0});globalThis.__PYON_LOADER__=globalThis.__CLOUDCORD_LOADER__;" dataUsingEncoding:NSUTF8StringEncoding];
    [JSI evaluate:identity tag:@"cloudcord:rain-identity" runtime:runtime];
    // Seed each new IPA once so an older download cannot override its runtime.
    NSData *packaged = [NSData dataWithContentsOfURL:[resources URLForResource:@"runtime" withExtension:@"js"]];
    NSURL *bundleFileURL = [rainDir URLByAppendingPathComponent:@"bundle.js"];
    NSURL *seedURL = [rainDir URLByAppendingPathComponent:@"packaged-runtime.sha256"];
    if (packaged.length) {
        unsigned char digest[CC_SHA256_DIGEST_LENGTH];
        CC_SHA256(packaged.bytes, (CC_LONG)packaged.length, digest);
        NSMutableString *hash = [NSMutableString string];
        for (NSUInteger i = 0; i < sizeof(digest); i++) [hash appendFormat:@"%02x", digest[i]];
        NSString *previous = [NSString stringWithContentsOfURL:seedURL encoding:NSUTF8StringEncoding error:nil];
        if (![hash isEqualToString:previous]) {
            if ([packaged writeToURL:bundleFileURL atomically:YES]) {
                [hash writeToURL:seedURL atomically:YES encoding:NSUTF8StringEncoding error:nil];
                [NSFileManager.defaultManager removeItemAtURL:[rainDir URLByAppendingPathComponent:@"etag.txt"] error:nil];
            }
        }
    }
    NSData *bundle = [NSData dataWithContentsOfURL:bundleFileURL];
    if (bundle && bundle.length > 0) {
        [JSI evaluate:bundle tag:@"rain:bundle" runtime:runtime];
        executePreloads(runtime, rainDir);
    } else {
        downloadBundleForNextLaunch(rainDir);
    }
    NSLog(@"[CloudCord] Rain runtime callback injected");
}
%end
%ctor { @autoreleasepool { %init; } }
