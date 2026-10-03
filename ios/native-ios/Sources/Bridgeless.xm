// Adapted from raincord/RainTweak c2fa89a6 under OSL-3.0.
// Modified for CloudCord identity, bridge dispatch and bundled runtime.
#import <Foundation/Foundation.h>
#import <jsi/jsi.h>
#import "JSI.h"
#import "Logger.h"
#import "Fonts.h"
#import "Themes.h"
#import "Utils.h"
@interface BridgeRegistry : NSObject
+ (instancetype)shared;
- (NSDictionary *)dispatchPayload:(NSDictionary *)payload;
@end
@interface RCTHost : NSObject
- (void)instance:(id)instance didInitializeRuntime:(facebook::jsi::Runtime &)runtime;
@end
using namespace facebook;
static void injectPreBundle(jsi::Runtime &runtime)
{
    try
    {
        jsi::Object loaderObj(runtime);
        loaderObj.setProperty(runtime, "loaderName", jsi::String::createFromUtf8(runtime, "RainTweak"));
        loaderObj.setProperty(runtime, "loaderVersion", jsi::String::createFromUtf8(runtime, [PACKAGE_VERSION UTF8String]));
        loaderObj.setProperty(runtime, "hasThemeSupport", true);
        loaderObj.setProperty(runtime, "storedTheme", jsi::Value::null());
        loaderObj.setProperty(runtime, "fontPatch", 2);
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
    injectPreBundle(runtime);
    NSString *bundlePath = [NSBundle.mainBundle.bundlePath stringByAppendingPathComponent:@"BunnyResources.bundle"];
    NSBundle *resources = [NSBundle bundleWithPath:bundlePath];
    NSData *identity = [@"globalThis.__CLOUDCORD_LOADER__=Object.assign(globalThis.__RAIN_LOADER__,{loaderName:'CloudCord',cloudcordAutoUpdateVersion:3,hasThemeSupport:true,fontPatch:2});globalThis.__PYON_LOADER__=globalThis.__CLOUDCORD_LOADER__;" dataUsingEncoding:NSUTF8StringEncoding];
    [JSI evaluate:identity tag:@"cloudcord:rain-identity" runtime:runtime];
    NSData *themeData = [NSData dataWithContentsOfURL:[getPyoncordDirectory() URLByAppendingPathComponent:@"current-theme.json"]];
    id theme = themeData.length ? [NSJSONSerialization JSONObjectWithData:themeData options:0 error:nil] : nil;
    if ([theme isKindOfClass:NSDictionary.class]) {
        NSString *json = [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:theme options:0 error:nil] encoding:NSUTF8StringEncoding];
        if (json) [JSI evaluate:[[NSString stringWithFormat:@"globalThis.__CLOUDCORD_LOADER__.storedTheme=%@;", json] dataUsingEncoding:NSUTF8StringEncoding] tag:@"cloudcord:saved-theme" runtime:runtime];
    }
    NSData *fontData = [NSData dataWithContentsOfURL:[getPyoncordDirectory() URLByAppendingPathComponent:@"fonts.json"]];
    id fonts = fontData.length ? [NSJSONSerialization JSONObjectWithData:fontData options:0 error:nil] : nil;
    // Rain's callback precedes Discord's JS bundle. Appearance work belongs
    // after that bundle loads, on the UI thread, not inside runtime creation.
    if ([theme isKindOfClass:NSDictionary.class] || [fonts isKindOfClass:NSDictionary.class]) {
        __block id observer = nil;
        observer = [NSNotificationCenter.defaultCenter addObserverForName:@"RCTJavaScriptDidLoadNotification" object:nil queue:NSOperationQueue.mainQueue usingBlock:^(__unused NSNotification *note) {
            [NSNotificationCenter.defaultCenter removeObserver:observer];
            observer = nil;
            if ([theme isKindOfClass:NSDictionary.class]) {
                id data = theme[@"data"];
                id main = [data isKindOfClass:NSDictionary.class] ? data[@"main"] : nil;
                if (![main isKindOfClass:NSDictionary.class]) main = theme[@"main"];
                if ([main isKindOfClass:NSDictionary.class]) initializeThemeColors(main[@"semantic"], main[@"raw"]);
                else if ([data isKindOfClass:NSDictionary.class]) initializeThemeColors(data[@"semanticColors"], data[@"rawColors"]);
            }
            if ([fonts isKindOfClass:NSDictionary.class]) patchFonts(fonts[@"main"], fonts[@"name"]);
        }];
    }
    NSData *bundle = [NSData dataWithContentsOfURL:[resources URLForResource:@"runtime" withExtension:@"js"]];
    if (bundle.length) [JSI evaluate:bundle tag:@"cloudcord:rain-runtime" runtime:runtime];
    NSLog(@"[CloudCord] Rain runtime callback injected");
}
%end
%ctor { @autoreleasepool { %init; } }
