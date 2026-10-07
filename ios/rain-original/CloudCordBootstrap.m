// CloudCord adapter only. RainTweak's binary and runtime hooks are not modified.
#import <Foundation/Foundation.h>
#import <dlfcn.h>
#import <CommonCrypto/CommonDigest.h>
#import "SharedContainer.h"

__attribute__((constructor)) static void connectCloudCordToRain(void) {
    @autoreleasepool {
        NSFileManager *fm = NSFileManager.defaultManager;
        NSURL *documents = [fm URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].lastObject;
        NSURL *rain = [documents URLByAppendingPathComponent:@"rain"];
        [fm createDirectoryAtURL:rain withIntermediateDirectories:YES attributes:nil error:nil];
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
        NSURL *marker = [rain URLByAppendingPathComponent:@"cloudcord-build.sha256"];
        NSString *old = [NSString stringWithContentsOfURL:marker encoding:NSUTF8StringEncoding error:nil];
        if (![hash isEqualToString:old]) {
            if (![data writeToURL:[rain URLByAppendingPathComponent:@"bundle.js"] atomically:YES]) return;
            [hash writeToURL:marker atomically:YES encoding:NSUTF8StringEncoding error:nil];
            [fm removeItemAtURL:[rain URLByAppendingPathComponent:@"etag.txt"] error:nil];
        }
        NSDictionary *config = @{@"customLoadUrl": @{
            @"enabled": @YES, @"url": @"https://getcloudcord.com/api/proxy/raw/dist/cc.js"
        }};
        NSData *json = [NSJSONSerialization dataWithJSONObject:config options:0 error:nil];
        if (![json writeToURL:[rain URLByAppendingPathComponent:@"loader.json"] atomically:YES]) return;
        // Load Rain only after its files are ready, including before its font ctor.
        Method containerMethod = class_getInstanceMethod(NSFileManager.class,
            @selector(containerURLForSecurityApplicationGroupIdentifier:));
        IMP nativeContainerResolver = containerMethod ? method_getImplementation(containerMethod) : NULL;
        NSString *library = [NSBundle.mainBundle.bundlePath stringByAppendingPathComponent:@"Frameworks/RainTweak.dylib"];
        if (!dlopen(library.fileSystemRepresentation, RTLD_NOW | RTLD_GLOBAL))
            NSLog(@"[CloudCord] RainTweak could not load: %s", dlerror());
        else
            cloudcordPreserveSharedContainers(nativeContainerResolver);
    }
}
