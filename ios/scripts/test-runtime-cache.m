#import "../rain-original/CloudCordRuntimeCache.h"
#import "../rain-original/CloudCordRuntimeUpdate.h"

#define CHECK(condition, message) do { if (!(condition)) { NSLog(@"FAIL: %@", message); return 1; } } while (0)

int main(void) {
    @autoreleasepool {
        NSData *runtime = [[@"// CloudCord runtime\n" stringByPaddingToLength:600 withString:@" " startingAtIndex:0] dataUsingEncoding:NSUTF8StringEncoding];
        NSMutableDictionary *manifest = [@{@"schema": @1, @"url": @"https://getcloudcord.com/api/proxy/raw/dist/cc.js?ref=abc",
            @"size": @(runtime.length), @"sha256": CloudCordRuntimeHash(runtime)} mutableCopy];
        CHECK(CloudCordVerifiedRuntime(runtime, manifest), @"verified runtime accepted");
        CHECK(!CloudCordVerifiedRuntime([@"truncated" dataUsingEncoding:NSUTF8StringEncoding], manifest), @"truncated runtime rejected");
        NSMutableData *wrong = [runtime mutableCopy];
        ((char *)wrong.mutableBytes)[0] = 'x';
        CHECK(!CloudCordVerifiedRuntime(wrong, manifest), @"wrong checksum rejected");
        for (NSString *url in @[@"https://getcloudcord.com.evil.test/api/proxy/raw/dist/cc.js", @"http://getcloudcord.com/api/proxy/raw/dist/cc.js", @"https://getcloudcord.com/api/proxy/raw/other.js"]) {
            manifest[@"url"] = url;
            CHECK(!CloudCordValidRuntimeManifest(manifest), @"untrusted runtime location rejected");
        }
        CHECK(!CloudCordValidRuntimeManifest(@[]), @"invalid manifest rejected");
        NSFileManager *fm = NSFileManager.defaultManager;
        NSURL *root = [[NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES]
            URLByAppendingPathComponent:[@"cloudcord-cache-test-" stringByAppendingString:NSUUID.UUID.UUIDString]];
        CHECK([fm createDirectoryAtURL:root withIntermediateDirectories:YES attributes:nil error:nil], @"temporary test directory");
        @try {
            NSURL *bundle = [root URLByAppendingPathComponent:@"bundle.js"];
            NSURL *marker = [root URLByAppendingPathComponent:@"cloudcord-build.sha256"];
            NSURL *etag = [root URLByAppendingPathComponent:@"etag.txt"];
            NSData *packaged = [@"packaged runtime" dataUsingEncoding:NSUTF8StringEncoding];
            NSData *updated = [@"newer explicit update" dataUsingEncoding:NSUTF8StringEncoding];
            CHECK(CloudCordEnsureRuntimeCache(fm, root, packaged, @"build-a"), @"fresh install seeds cache");
            CHECK([[NSData dataWithContentsOfURL:bundle] isEqualToData:packaged], @"packaged bytes seeded");
            CHECK([updated writeToURL:bundle atomically:YES], @"write newer explicit update");
            CHECK([@"update-etag" writeToURL:etag atomically:YES encoding:NSUTF8StringEncoding error:nil], @"write update etag");
            CHECK(CloudCordEnsureRuntimeCache(fm, root, packaged, @"build-a"), @"same build cache ready");
            CHECK([[NSData dataWithContentsOfURL:bundle] isEqualToData:updated], @"same build preserves newer update");
            CHECK([fm fileExistsAtPath:etag.path], @"retained update keeps its etag");
            CHECK([fm removeItemAtURL:bundle error:nil], @"remove cached runtime only");
            CHECK(CloudCordEnsureRuntimeCache(fm, root, packaged, @"build-a"), @"same marker with missing cache repairs");
            CHECK([[NSData dataWithContentsOfURL:bundle] isEqualToData:packaged], @"missing cache restored");
            CHECK(![fm fileExistsAtPath:etag.path], @"reseed clears stale etag");
            CHECK([[NSData data] writeToURL:bundle atomically:YES], @"write empty cache");
            CHECK(CloudCordEnsureRuntimeCache(fm, root, packaged, @"build-a"), @"empty cache repairs");
            CHECK([[NSData dataWithContentsOfURL:bundle] isEqualToData:packaged], @"empty cache restored");
            CHECK([updated writeToURL:bundle atomically:YES], @"write previous update");
            CHECK(CloudCordEnsureRuntimeCache(fm, root, packaged, @"build-b"), @"new app build reseeds");
            CHECK([[NSData dataWithContentsOfURL:bundle] isEqualToData:packaged], @"new packaged runtime replaces old build");
            CHECK([[NSString stringWithContentsOfURL:marker encoding:NSUTF8StringEncoding error:nil] isEqualToString:@"build-b"], @"successful seed advances marker");
            CHECK(!CloudCordEnsureRuntimeCache(fm, root, [NSData data], @"build-c"), @"empty packaged runtime rejected");
            CHECK([fm removeItemAtURL:bundle error:nil], @"remove bundle before failure case");
            CHECK([fm createDirectoryAtURL:bundle withIntermediateDirectories:NO attributes:nil error:nil], @"block cache path with directory");
            CHECK(!CloudCordEnsureRuntimeCache(fm, root, packaged, @"build-c"), @"failed cache write reported");
            CHECK([[NSString stringWithContentsOfURL:marker encoding:NSUTF8StringEncoding error:nil] isEqualToString:@"build-b"], @"failed seed cannot advance marker");
            NSLog(@"PASS: native runtime cache creation, repair, update preservation and failed-write handling");
        } @finally {
            [fm removeItemAtURL:root error:nil];
        }
    }
    return 0;
}
