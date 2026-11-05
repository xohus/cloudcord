// Runtime recovery must remain available when the JavaScript runtime cannot start.
#import <Foundation/Foundation.h>
#import <CommonCrypto/CommonDigest.h>

static inline NSString *CloudCordRuntimeHash(NSData *data) {
    if (!data) return nil;
    unsigned char digest[CC_SHA256_DIGEST_LENGTH];
    CC_SHA256(data.bytes, (CC_LONG)data.length, digest);
    NSMutableString *result = [NSMutableString string];
    for (NSUInteger i = 0; i < sizeof(digest); i++) [result appendFormat:@"%02x", digest[i]];
    return result;
}

static inline BOOL CloudCordValidRuntimeManifest(id manifest) {
    if (![manifest isKindOfClass:NSDictionary.class]) return NO;
    if (![manifest[@"schema"] isEqual:@1]) return NO;
    NSString *urlString = manifest[@"url"], *hash = manifest[@"sha256"];
    NSNumber *size = manifest[@"size"];
    if (![urlString isKindOfClass:NSString.class] || ![hash isKindOfClass:NSString.class]
        || ![size isKindOfClass:NSNumber.class] || hash.length != 64
        || size.unsignedLongLongValue < 512 || size.unsignedLongLongValue > 8 * 1024 * 1024) return NO;
    NSURLComponents *url = [NSURLComponents componentsWithString:urlString];
    NSCharacterSet *nonHex = [[NSCharacterSet characterSetWithCharactersInString:@"0123456789abcdefABCDEF"] invertedSet];
    return [url.scheme isEqualToString:@"https"] && [url.host isEqualToString:@"getcloudcord.com"]
        && [url.path isEqualToString:@"/api/proxy/raw/dist/cc.js"] && !url.user && !url.password && !url.port
        && [hash rangeOfCharacterFromSet:nonHex].location == NSNotFound;
}

static inline BOOL CloudCordVerifiedRuntime(NSData *data, NSDictionary *manifest) {
    return CloudCordValidRuntimeManifest(manifest) && data.length == [manifest[@"size"] unsignedLongLongValue]
        && [CloudCordRuntimeHash(data) isEqualToString:[manifest[@"sha256"] lowercaseString]];
}

static inline void CloudCordRefreshRuntime(NSURL *rain) {
    NSURL *bundle = [rain URLByAppendingPathComponent:@"bundle.js"];
    NSString *initialHash = CloudCordRuntimeHash([NSData dataWithContentsOfURL:bundle]);
    NSURLSessionConfiguration *config = NSURLSessionConfiguration.ephemeralSessionConfiguration;
    config.timeoutIntervalForRequest = 15;
    config.timeoutIntervalForResource = 30;
    NSURLSession *session = [NSURLSession sessionWithConfiguration:config];
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:
        [NSURL URLWithString:@"https://getcloudcord.com/api/proxy/raw/dist/runtime-manifest.json"]];
    [request setValue:@"1" forHTTPHeaderField:@"X-CC-Client"];
    [[session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        id manifest = !error && [response isKindOfClass:NSHTTPURLResponse.class] && [(NSHTTPURLResponse *)response statusCode] == 200 && data.length
            ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
        if (!CloudCordValidRuntimeManifest(manifest) || [initialHash isEqualToString:[manifest[@"sha256"] lowercaseString]]) {
            [session finishTasksAndInvalidate];
            return;
        }
        NSMutableURLRequest *download = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:manifest[@"url"]]];
        [download setValue:@"1" forHTTPHeaderField:@"X-CC-Client"];
        [[session dataTaskWithRequest:download completionHandler:^(NSData *runtime, NSURLResponse *reply, NSError *failure) {
            // Preserve an update made by the user or Rain while this request was in flight.
            NSString *currentHash = CloudCordRuntimeHash([NSData dataWithContentsOfURL:bundle]);
            if (!failure && [reply isKindOfClass:NSHTTPURLResponse.class] && [(NSHTTPURLResponse *)reply statusCode] == 200
                && CloudCordVerifiedRuntime(runtime, manifest) && [currentHash isEqualToString:initialHash]) {
                if ([runtime writeToURL:bundle atomically:YES]) {
                    [NSFileManager.defaultManager removeItemAtURL:[rain URLByAppendingPathComponent:@"etag.txt"] error:nil];
                    NSLog(@"[CloudCord] Verified runtime recovery downloaded for next launch");
                }
            }
            [session finishTasksAndInvalidate];
        }] resume];
    }] resume];
}
