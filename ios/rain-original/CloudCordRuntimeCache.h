// File-only cache recovery shared by the iOS adapter and its native tests.
#import <Foundation/Foundation.h>

static inline BOOL CloudCordEnsureRuntimeCache(NSFileManager *fm, NSURL *rain, NSData *packaged, NSString *buildHash) {
    if (!packaged.length || !buildHash.length) return NO;
    NSURL *bundle = [rain URLByAppendingPathComponent:@"bundle.js"];
    NSURL *marker = [rain URLByAppendingPathComponent:@"cloudcord-build.sha256"];
    NSString *previousBuild = [NSString stringWithContentsOfURL:marker encoding:NSUTF8StringEncoding error:nil];
    NSDictionary *attributes = [fm attributesOfItemAtPath:bundle.path error:nil];
    BOOL cacheReady = [attributes[NSFileType] isEqualToString:NSFileTypeRegular]
        && [attributes[NSFileSize] unsignedLongLongValue] > 0
        && [fm isReadableFileAtPath:bundle.path];
    // A newer explicit runtime update has different bytes from the packaged one.
    // Keep it when this app build is unchanged; repair only an unusable cache.
    if ([buildHash isEqualToString:previousBuild] && cacheReady) return YES;
    if (![packaged writeToURL:bundle atomically:YES]) return NO;
    if (![buildHash writeToURL:marker atomically:YES encoding:NSUTF8StringEncoding error:nil]) return NO;
    [fm removeItemAtURL:[rain URLByAppendingPathComponent:@"etag.txt"] error:nil];
    return YES;
}
