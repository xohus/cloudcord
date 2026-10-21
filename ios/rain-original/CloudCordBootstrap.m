// CloudCord adapter only. RainTweak's binary and runtime hooks are not modified.
#import <Foundation/Foundation.h>
#import <dlfcn.h>
#import <CommonCrypto/CommonDigest.h>
#import "CloudCordRuntimeCache.h"

__attribute__((constructor)) static void connectCloudCordToRain(void) {
    @autoreleasepool {
        NSFileManager *fm = NSFileManager.defaultManager;
        NSURL *documents = [fm URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].lastObject;
        NSURL *rain = [documents URLByAppendingPathComponent:@"rain"];
        [fm createDirectoryAtURL:rain withIntermediateDirectories:YES attributes:nil error:nil];
        // Inspect the actual installed host after the user's signer has processed it.
        // No certificate, account, receipt or authentication data is collected.
        BOOL sharedContainerAvailable = NO;
        @try {
            sharedContainerAvailable = [fm containerURLForSecurityApplicationGroupIdentifier:@"group.com.hammerandchisel.discord"] != nil;
        } @catch (NSException *exception) {
            sharedContainerAvailable = NO;
        }
        NSURL *broadcast = [NSBundle.mainBundle.bundleURL URLByAppendingPathComponent:@"PlugIns/BroadcastUpload.appex"];
        NSDictionary *broadcastInfo = [NSDictionary dictionaryWithContentsOfURL:[broadcast URLByAppendingPathComponent:@"Info.plist"]];
        NSDictionary *broadcastCheck = @{
            @"hostSharedContainerAvailable": @(sharedContainerAvailable),
            @"broadcastExtensionPresent": @([fm fileExistsAtPath:broadcast.path]),
            @"broadcastUploadPointValid": @([broadcastInfo[@"NSExtension"][@"NSExtensionPointIdentifier"] isEqualToString:@"com.apple.broadcast-services-upload"])
        };
        NSData *broadcastJSON = [NSJSONSerialization dataWithJSONObject:broadcastCheck options:0 error:nil];
        [broadcastJSON writeToURL:[rain URLByAppendingPathComponent:@"cloudcord-broadcast-check.json"] atomically:YES];
        NSURL *runtime = [NSBundle.mainBundle.bundleURL URLByAppendingPathComponent:@"BunnyResources.bundle/runtime.js"];
        NSData *data = [NSData dataWithContentsOfURL:runtime];
        if (!data.length) {
            NSLog(@"[CloudCord] No packaged runtime; leaving Discord unmodified");
            return;
        }
        // Install the packaged runtime once per build; retain later explicit updates.
        unsigned char digest[CC_SHA256_DIGEST_LENGTH];
        CC_SHA256(data.bytes, (CC_LONG)data.length, digest);
        NSMutableString *hash = [NSMutableString string];
        for (NSUInteger i = 0; i < sizeof(digest); i++) [hash appendFormat:@"%02x", digest[i]];
        if (!CloudCordEnsureRuntimeCache(fm, rain, data, hash)) {
            NSLog(@"[CloudCord] Could not prepare runtime cache; leaving Discord unmodified");
            return;
        }
        NSDictionary *config = @{@"customLoadUrl": @{
            @"enabled": @YES, @"url": @"https://getcloudcord.com/api/proxy/raw/dist/cc.js"
        }};
        NSData *json = [NSJSONSerialization dataWithJSONObject:config options:0 error:nil];
        if (![json writeToURL:[rain URLByAppendingPathComponent:@"loader.json"] atomically:YES]) return;
        // Load Rain only after its files are ready, including before its font ctor.
        NSString *library = [NSBundle.mainBundle.bundlePath stringByAppendingPathComponent:@"Frameworks/RainTweak.dylib"];
        if (!dlopen(library.fileSystemRepresentation, RTLD_NOW | RTLD_GLOBAL))
            NSLog(@"[CloudCord] RainTweak could not load: %s", dlerror());
    }
}
