#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <CommonCrypto/CommonDigest.h>

#import "Fonts.h"
#import "LoaderConfig.h"
#import "Logger.h"
#import "Settings.h"
#import "Themes.h"
#import "Utils.h"

// todo: probably move this out of the tweak file, it would make this a lot cleaner and orangised
// however making this was painful anyway, so we can delay this until iOS switch to bridgeless and
// this needs a rewrite anyway
typedef void (^RCTPromiseResolveBlock)(id _Nullable result);
typedef void (^RCTPromiseRejectBlock)(NSString *_Nullable code, NSString *_Nullable message,
                                      NSError *_Nullable error);
typedef id _Nullable (^BridgeMethodCallback)(NSArray *_Nonnull args);

@interface BridgeRegistry : NSObject
+ (instancetype _Nonnull)shared;
- (void)registerMethod:(NSString *_Nonnull)name callback:(BridgeMethodCallback _Nonnull)cb;
- (void)clearMethods;
- (NSDictionary *_Nullable)dispatchPayload:(NSDictionary *_Nonnull)payload;
@end

@implementation BridgeRegistry
{
    NSMutableDictionary<NSString *, BridgeMethodCallback> *_methods;
    dispatch_queue_t                                       _queue;
}

+ (instancetype)shared
{
    static BridgeRegistry *instance;
    static dispatch_once_t token;
    dispatch_once(&token, ^{ instance = [[BridgeRegistry alloc] init]; });
    return instance;
}

- (instancetype)init
{
    self = [super init];
    if (self)
    {
        _methods = [NSMutableDictionary dictionary];
        _queue   = dispatch_queue_create("rain.bridge", DISPATCH_QUEUE_SERIAL);
    }
    return self;
}

- (void)registerMethod:(NSString *)name callback:(BridgeMethodCallback)cb
{
    dispatch_sync(_queue, ^{
        if (self->_methods[name])
            BunnyLog(@"[Bridge] Overwriting method '%@'", name);
        self->_methods[name] = [cb copy];
    });
}

- (void)clearMethods
{
    dispatch_sync(_queue, ^{ [self->_methods removeAllObjects]; });
    BunnyLog(@"[Bridge] Methods cleared");
}

- (NSDictionary *)dispatchPayload:(NSDictionary *)payload
{
    NSDictionary *rain = payload[@"rain"];
    if (!rain || ![rain isKindOfClass:[NSDictionary class]])
        return nil;

    NSString *name = rain[@"method"];
    NSArray  *args = rain[@"args"];
    if (![name isKindOfClass:[NSString class]])
        return @{@"error" : @"Bridge payload missing 'method' key"};
    if (!args || ![args isKindOfClass:[NSArray class]])
        args = @[];

    __block BridgeMethodCallback cb;
    dispatch_sync(_queue, ^{ cb = self->_methods[name]; });

    if (!cb)
        return @{@"error" : [NSString stringWithFormat:@"Method not registered: %@", name]};

    @try
    {
        id raw    = cb(args);
        id result = (raw == nil) ? [NSNull null] : raw;
        return @{@"result" : result};
    }
    @catch (NSException *e)
    {
        NSString *msg = [NSString stringWithFormat:@"%@: %@", e.name, e.reason ?: @"(no reason)"];
        BunnyLog(@"[Bridge] Exception in '%@': %@", name, msg);
        return @{@"error" : msg};
    }
}

@end

static NSURL         *source;
static NSString      *bunnyPatchesBundlePath;
static NSURL         *cloudcordDirectory;
static LoaderConfig  *loaderConfig;
static NSTimeInterval shakeStartTime = 0;
static BOOL           isShaking      = NO;

static NSString *sha256Hex(NSData *data)
{
    if (!data)
        return nil;
    unsigned char digest[CC_SHA256_DIGEST_LENGTH];
    CC_SHA256(data.bytes, (CC_LONG) data.length, digest);
    NSMutableString *result = [NSMutableString stringWithCapacity:CC_SHA256_DIGEST_LENGTH * 2];
    for (NSUInteger i = 0; i < CC_SHA256_DIGEST_LENGTH; i++)
        [result appendFormat:@"%02x", digest[i]];
    return result;
}

static NSDictionary *fetchRuntimeManifest(void)
{
    NSURL *url = [NSURL URLWithString:@"https://cloudcord.xohus.lol/api/proxy/raw/dist/runtime-manifest.json"];
    NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:url
                                                       cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData
                                                   timeoutInterval:10.0];
    [req setValue:@"1" forHTTPHeaderField:@"X-CC-Client"];
    
    __block NSDictionary *manifest = nil;
    dispatch_group_t group = dispatch_group_create();
    dispatch_group_enter(group);
    NSURLSession *session = [NSURLSession sessionWithConfiguration:[NSURLSessionConfiguration ephemeralSessionConfiguration]];
    [[session dataTaskWithRequest:req completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if (!error && [response isKindOfClass:[NSHTTPURLResponse class]] && ((NSHTTPURLResponse *) response).statusCode == 200 && data.length > 0)
        {
            NSError *jsonError = nil;
            id parsed = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
            if (!jsonError && [parsed isKindOfClass:[NSDictionary class]])
                manifest = parsed;
        }
        dispatch_group_leave(group);
    }] resume];
    dispatch_group_wait(group, dispatch_time(DISPATCH_TIME_NOW, (int64_t) (12 * NSEC_PER_SEC)));
    [session invalidateAndCancel];
    return manifest;
}

static BOOL isPlausibleRuntime(NSData *data)
{
    if (!data || data.length < 512 || data.length > 8 * 1024 * 1024)
        return NO;
    NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    if (!text)
        return NO;
    NSString *trimmed = [text stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    if ([trimmed hasPrefix:@"<"])
        return NO;
    return [text containsString:@"CloudCord"] || [text containsString:@"cloudcord"];
}

static NSURL *resolveDownloadURL(NSString **expectedHash, NSNumber **expectedSize)
{
    if (expectedHash)
        *expectedHash = nil;
    if (expectedSize)
        *expectedSize = nil;

    LoaderConfig *fresh = [LoaderConfig getLoaderConfig];
    if (fresh.customLoadUrlEnabled && fresh.customLoadUrl)
        return fresh.customLoadUrl;

    NSDictionary *manifest = fetchRuntimeManifest();
    NSString *urlString = [manifest[@"url"] isKindOfClass:[NSString class]] ? manifest[@"url"] : nil;
    NSString *hash = [manifest[@"sha256"] isKindOfClass:[NSString class]] ? [manifest[@"sha256"] lowercaseString] : nil;
    NSNumber *size = [manifest[@"size"] isKindOfClass:[NSNumber class]] ? manifest[@"size"] : nil;

    if (!urlString || ![urlString hasPrefix:@"https://cloudcord.xohus.lol/api/proxy/"] || hash.length != 64 || !size || size.unsignedLongLongValue < 512 || size.unsignedLongLongValue > 8 * 1024 * 1024)
    {
        BunnyLog(@"[Updater] Runtime manifest is missing or invalid; keeping cached runtime");
        return nil;
    }

    NSCharacterSet *nonHex = [[NSCharacterSet characterSetWithCharactersInString:@"0123456789abcdef"] invertedSet];
    if ([hash rangeOfCharacterFromSet:nonHex].location != NSNotFound)
    {
        BunnyLog(@"[Updater] Runtime manifest SHA-256 is invalid; keeping cached runtime");
        return nil;
    }

    if (expectedHash)
        *expectedHash = hash;
    if (expectedSize)
        *expectedSize = size;
    return [NSURL URLWithString:urlString];
}

static BOOL downloadBundle(BOOL isExplicit)
{
    NSURL *bundleFileURL = [cloudcordDirectory URLByAppendingPathComponent:@"bundle.js"];
    NSURL *etagFileURL = [cloudcordDirectory URLByAppendingPathComponent:@"etag.txt"];
    NSFileManager *fm = [NSFileManager defaultManager];

    NSString *expectedHash = nil;
    NSNumber *expectedSize = nil;
    NSURL *targetURL = resolveDownloadURL(&expectedHash, &expectedSize);
    if (!targetURL)
        return NO;

    BOOL cachedMatchesManifest = YES;
    if (expectedHash && [fm fileExistsAtPath:bundleFileURL.path])
    {
        NSData *cached = [NSData dataWithContentsOfURL:bundleFileURL];
        cachedMatchesManifest = cached && [[sha256Hex(cached) lowercaseString] isEqualToString:expectedHash];
        if (!cachedMatchesManifest)
        {
            BunnyLog(@"[Updater] Cached runtime hash does not match manifest; forcing a full download");
            [fm removeItemAtURL:etagFileURL error:nil];
        }
    }

    BunnyLog(@"[Updater] Fetching verified bundle (explicit=%d): %@", isExplicit, targetURL.absoluteString);
    NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:targetURL
                                                       cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData
                                                   timeoutInterval:15.0];
    [req setValue:@"1" forHTTPHeaderField:@"X-CC-Client"];
    if (!isExplicit && cachedMatchesManifest)
    {
        NSString *etagValue = [NSString stringWithContentsOfURL:etagFileURL encoding:NSUTF8StringEncoding error:nil];
        if (etagValue && [fm fileExistsAtPath:bundleFileURL.path])
            [req setValue:etagValue forHTTPHeaderField:@"If-None-Match"];
    }

    __block BOOL success = NO;
    dispatch_group_t group = dispatch_group_create();
    dispatch_group_enter(group);
    NSURLSession *session = [NSURLSession sessionWithConfiguration:[NSURLSessionConfiguration ephemeralSessionConfiguration]];
    [[session dataTaskWithRequest:req completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if ([response isKindOfClass:[NSHTTPURLResponse class]])
        {
            NSHTTPURLResponse *http = (NSHTTPURLResponse *) response;
            if (http.statusCode == 200 && data.length > 0)
            {
                BOOL valid = isPlausibleRuntime(data);
                if (valid && expectedSize)
                    valid = data.length == expectedSize.unsignedLongLongValue;
                if (valid && expectedHash)
                    valid = [[[sha256Hex(data) lowercaseString] copy] isEqualToString:expectedHash];

                if (!valid)
                {
                    BunnyLog(@"[Updater] Rejected runtime update: size/hash/content validation failed");
                }
                else
                {
                    if ([fm fileExistsAtPath:bundleFileURL.path])
                        moveCachedBundleToBackup();

                    NSError *writeError = nil;
                    if ([data writeToURL:bundleFileURL options:NSDataWritingAtomic error:&writeError])
                    {
                        NSString *newEtag = http.allHeaderFields[@"Etag"] ?: http.allHeaderFields[@"ETag"];
                        if (newEtag)
                            [newEtag writeToURL:etagFileURL atomically:YES encoding:NSUTF8StringEncoding error:nil];
                        else
                            [fm removeItemAtURL:etagFileURL error:nil];
                        success = YES;
                        BunnyLog(@"[Updater] Verified runtime installed (%lu bytes)", (unsigned long) data.length);
                    }
                    else
                    {
                        BunnyLog(@"[Updater] Atomic runtime write failed: %@", writeError.localizedDescription);
                        if (![fm fileExistsAtPath:bundleFileURL.path])
                            restoreBundleFromBackup();
                    }
                }
            }
            else if (http.statusCode == 304 && [fm fileExistsAtPath:bundleFileURL.path] && cachedMatchesManifest)
            {
                success = YES;
            }
        }
        else if (error)
        {
            BunnyLog(@"[Updater] Download error: %@", error.localizedDescription);
        }

        if (!success && ![fm fileExistsAtPath:bundleFileURL.path])
            restoreBundleFromBackup();
        dispatch_group_leave(group);
    }] resume];
    dispatch_group_wait(group, dispatch_time(DISPATCH_TIME_NOW, (int64_t) (18 * NSEC_PER_SEC)));
    [session invalidateAndCancel];
    return success;
}

static void registerBridgeMethods(void)
{
    BridgeRegistry *b = [BridgeRegistry shared];

    [b registerMethod:@"updater.clear"
             callback:^id(NSArray *args) {
                 NSFileManager *fm = [NSFileManager defaultManager];
                 [fm removeItemAtURL:[cloudcordDirectory URLByAppendingPathComponent:@"bundle.js"]
                               error:nil];
                 [fm removeItemAtURL:[cloudcordDirectory URLByAppendingPathComponent:@"etag.txt"]
                               error:nil];
                 BunnyLog(@"[Updater] Cache cleared via bridge");
                 return nil;
             }];

    [b registerMethod:@"updater.download"
             callback:^id(NSArray *args) {
                 BunnyLog(@"[Updater] updater.download bridge method called");
                 dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                     BunnyLog(@"[Updater] Background block executing");
                     LoaderConfig *cfg = [LoaderConfig getLoaderConfig];
                     BunnyLog(@"[Updater] customLoadUrlEnabled=%d url=%@", cfg.customLoadUrlEnabled,
                              cfg.customLoadUrl.absoluteString);
                     downloadBundle(YES);
                     BunnyLog(@"[Updater] downloadBundle returned");
                 });
                 return nil;
             }];

    [b registerMethod:@"updater.reload"
             callback:^id(NSArray *args) {
                 dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                     BunnyLog(@"[Updater] Explicit download + reload started");
                     downloadBundle(YES);
                     dispatch_async(dispatch_get_main_queue(), ^{
                         UIWindow *w = [UIApplication sharedApplication].windows.firstObject;
                         if (w.rootViewController)
                             reloadApp(w.rootViewController);
                     });
                 });
                 return nil;
             }];
}

%hook RCTCxxBridge

- (void)executeApplicationScript:(NSData *)script url:(NSURL *)url async:(BOOL)async
{
    if (![url.absoluteString containsString:@"main.jsbundle"])
    {
        return %orig;
    }

    [[BridgeRegistry shared] clearMethods];
    registerBridgeMethods();
    BunnyLog(@"[Bridge] Native bridge ready for new JS context");

    gBridge = self;
    BunnyLog(@"Stored bridge reference: %@", gBridge);

    NSBundle *bunnyPatchesBundle = [NSBundle bundleWithPath:bunnyPatchesBundlePath];
    if (!bunnyPatchesBundle)
    {
        BunnyLog(@"Failed to load BunnyPatches bundle from path: %@", bunnyPatchesBundlePath);
        showErrorAlert(@"Loader Error",
                       @"Failed to initialize mod loader. Please reinstall the tweak.", nil);
        return %orig;
    }

    NSURL *patchPath = [bunnyPatchesBundle URLForResource:@"payload-base" withExtension:@"js"];
    if (!patchPath)
    {
        BunnyLog(@"Failed to find payload-base.js in bundle");
        showErrorAlert(@"Loader Error",
                       @"Failed to initialize mod loader. Please reinstall the tweak.", nil);
        return %orig;
    }

    NSData *patchData = [NSData dataWithContentsOfURL:patchPath];
    BunnyLog(@"Injecting loader");
    %orig(patchData, source, YES);

    NSString *updaterMarker = @"globalThis.__CLOUDCORD_LOADER__&&Object.assign(globalThis.__CLOUDCORD_LOADER__,{loaderName:\"CloudCord\",loaderVersion:\"2\",cloudcordAutoUpdateVersion:3});";
    %orig([updaterMarker dataUsingEncoding:NSUTF8StringEncoding], source, YES);

    __block NSData *bundle =
        [NSData dataWithContentsOfURL:[cloudcordDirectory URLByAppendingPathComponent:@"bundle.js"]];

    BunnyLog(@"[Updater] Checking for runtime updates before execution");
    downloadBundle(NO);
    bundle = [NSData
        dataWithContentsOfURL:[cloudcordDirectory URLByAppendingPathComponent:@"bundle.js"]];

    NSData *themeData =
        [NSData dataWithContentsOfURL:[cloudcordDirectory
                                          URLByAppendingPathComponent:@"current-theme.json"]];
    if (themeData)
    {
        NSError      *jsonError;
        NSDictionary *themeDict = [NSJSONSerialization JSONObjectWithData:themeData
                                                                  options:0
                                                                    error:&jsonError];
        if (!jsonError)
        {
            BunnyLog(@"Loading theme data...");
            if (themeDict[@"data"])
            {
                NSDictionary *data = themeDict[@"data"];
                if (data[@"semanticColors"] && data[@"rawColors"])
                {
                    BunnyLog(@"Initializing theme colors from theme data");
                    initializeThemeColors(data[@"semanticColors"], data[@"rawColors"]);
                }
            }

            NSString *jsCode =
                [NSString stringWithFormat:@"globalThis.__CLOUDCORD_LOADER__.storedTheme=%@",
                                           [[NSString alloc] initWithData:themeData
                                                                 encoding:NSUTF8StringEncoding]];
            %orig([jsCode dataUsingEncoding:NSUTF8StringEncoding], source, async);
        }
        else
        {
            BunnyLog(@"Error parsing theme JSON: %@", jsonError);
        }
    }
    else
    {
        BunnyLog(@"No theme data found at path: %@",
                 [cloudcordDirectory URLByAppendingPathComponent:@"current-theme.json"]);
    }

    NSData *fontData = [NSData
        dataWithContentsOfURL:[cloudcordDirectory URLByAppendingPathComponent:@"fonts.json"]];
    if (fontData)
    {
        NSError      *jsonError;
        NSDictionary *fontDict = [NSJSONSerialization JSONObjectWithData:fontData
                                                                 options:0
                                                                   error:&jsonError];
        if (!jsonError && fontDict[@"main"])
        {
            BunnyLog(@"Found font configuration, applying...");
            patchFonts(fontDict[@"main"], fontDict[@"name"]);
        }
    }

    if (bundle)
    {
        BunnyLog(@"Executing JS bundle");
        %orig(bundle, source, async);
    }
    else
    {
        BunnyLog(@"ERROR: No bundle available to execute!");
        showErrorAlert(
            @"Bundle Error",
            @"Failed to load bundle. Please check your internet connection and restart the app.",
            nil);
    }

    NSURL *preloadsDirectory = [cloudcordDirectory URLByAppendingPathComponent:@"preloads"];
    if ([[NSFileManager defaultManager] fileExistsAtPath:preloadsDirectory.path])
    {
        NSError *error = nil;
        NSArray *contents =
            [[NSFileManager defaultManager] contentsOfDirectoryAtURL:preloadsDirectory
                                          includingPropertiesForKeys:nil
                                                             options:0
                                                               error:&error];
        if (!error)
        {
            for (NSURL *fileURL in contents)
            {
                if ([[fileURL pathExtension] isEqualToString:@"js"])
                {
                    BunnyLog(@"Executing preload JS file %@", fileURL.absoluteString);
                    NSData *data = [NSData dataWithContentsOfURL:fileURL];
                    if (data)
                        %orig(data, source, async);
                }
            }
        }
        else
        {
            BunnyLog(@"Error reading contents of preloads directory");
        }
    }

    %orig(script, url, async);
}

%end

%hook RCTFileReaderModule

- (void)readAsDataURL:(NSDictionary *)blob
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
    NSDictionary *result = [[BridgeRegistry shared] dispatchPayload:blob];
    if (result)
    {
        BunnyLog(@"[Bridge] Handled readAsDataURL for method: %@", blob[@"rain"][@"method"]);
        resolve(result);
        return;
    }
    %orig;
}

%end

%hook UIWindow

- (void)motionBegan:(UIEventSubtype)motion withEvent:(UIEvent *)event
{
    if (motion == UIEventSubtypeMotionShake)
    {
        isShaking      = YES;
        shakeStartTime = [[NSDate date] timeIntervalSince1970];
    }
    %orig;
}

- (void)motionEnded:(UIEventSubtype)motion withEvent:(UIEvent *)event
{
    if (motion == UIEventSubtypeMotionShake && isShaking)
    {
        NSTimeInterval shakeDuration = [[NSDate date] timeIntervalSince1970] - shakeStartTime;
        if (shakeDuration >= 0.5 && shakeDuration <= 2.0)
            dispatch_async(dispatch_get_main_queue(), ^{ showSettingsSheet(); });
        isShaking = NO;
    }
    %orig;
}

%end

%ctor
{
    @autoreleasepool
    {
        source = [NSURL URLWithString:@"CloudCord"];

        NSString *install_prefix = @"/var/jb";
        isJailbroken             = [[NSFileManager defaultManager] fileExistsAtPath:install_prefix];
        BOOL jbPathExists        = [[NSFileManager defaultManager] fileExistsAtPath:install_prefix];

        NSString *bundlePath =
            [NSString stringWithFormat:@"%@/Library/Application Support/BunnyResources.bundle",
                                       install_prefix];
        BunnyLog(@"Is jailbroken: %d", isJailbroken);
        BunnyLog(@"Bundle path for jailbroken: %@", bundlePath);

        NSString *jailedPath = [[NSBundle mainBundle].bundleURL.path
            stringByAppendingPathComponent:@"BunnyResources.bundle"];
        BunnyLog(@"Bundle path for jailed: %@", jailedPath);

        bunnyPatchesBundlePath = isJailbroken ? bundlePath : jailedPath;

        if (jbPathExists)
        {
            BunnyLog(@"Jailbreak path exists, attempting to load bundle from: %@", bundlePath);
            BOOL      bundleExists = [[NSFileManager defaultManager] fileExistsAtPath:bundlePath];
            NSBundle *testBundle   = [NSBundle bundleWithPath:bundlePath];

            if (bundleExists && testBundle)
            {
                bunnyPatchesBundlePath = bundlePath;
                BunnyLog(@"Successfully loaded bundle from jailbroken path");
            }
            else
            {
                BunnyLog(@"Bundle not found at jailbroken path, falling back to jailed");
                bunnyPatchesBundlePath = jailedPath;
            }
        }
        else
        {
            BunnyLog(@"Not jailbroken, using jailed bundle path");
            bunnyPatchesBundlePath = jailedPath;
        }

        BunnyLog(@"Selected bundle path: %@", bunnyPatchesBundlePath);

        NSBundle *bunnyPatchesBundle = [NSBundle bundleWithPath:bunnyPatchesBundlePath];
        if (!bunnyPatchesBundle)
        {
            BunnyLog(@"Failed to load bunnyPatches bundle from any path");
            BunnyLog(@"  Jailbroken path: %@", bundlePath);
            BunnyLog(@"  Jailed path: %@", jailedPath);
            BunnyLog(@"  /var/jb exists: %d", jbPathExists);
            bunnyPatchesBundlePath = nil;
        }
        else
        {
            BunnyLog(@"Bundle loaded successfully");
            NSError *error = nil;
            NSArray *bundleContents =
                [[NSFileManager defaultManager] contentsOfDirectoryAtPath:bunnyPatchesBundlePath
                                                                    error:&error];
            if (error)
                BunnyLog(@"Error listing bundle contents: %@", error);
            else
                BunnyLog(@"Bundle contents: %@", bundleContents);
        }

        cloudcordDirectory = getPyoncordDirectory();
        loaderConfig      = [[LoaderConfig alloc] init];
        [loaderConfig loadConfig];

        %init;

        [[BridgeRegistry shared] clearMethods];
        registerBridgeMethods();
        BunnyLog(@"[Bridge] Native bridge initialised");
    }
}
