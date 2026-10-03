#import <CoreText/CoreText.h>
#import <CommonCrypto/CommonDigest.h>
#import "Fonts.h"
#import "Utils.h"
#import "Logger.h"
NSDictionary<NSString *, NSString *> *fontMap;

%group CloudCordFontOverrides
%hook UIFont
+ (UIFont *)fontWithName:(NSString *)name size:(CGFloat)size {
    NSString *replacement;
    @synchronized(UIFont.class) { replacement = fontMap[name]; }
    // Do not hook fontWithDescriptor: returning through another hooked font
    // constructor can recurse when systemFont maps to a mapped family.
    if (replacement) return [UIFont fontWithDescriptor:[UIFontDescriptor fontDescriptorWithName:replacement size:size] size:size];
    return %orig;
}
+ (UIFont *)systemFontOfSize:(CGFloat)size {
    NSString *replacement;
    @synchronized(UIFont.class) { replacement = fontMap[@"systemFont"]; }
    if (replacement) return [UIFont fontWithDescriptor:[UIFontDescriptor fontDescriptorWithName:replacement size:size] size:size];
    return %orig;
}
%end
%end

static void registerFontData(NSData *data, NSString *key) {
    if (!data.length || data.length > 16 * 1024 * 1024) return;
    CGDataProviderRef provider = CGDataProviderCreateWithCFData((__bridge CFDataRef)data);
    if (!provider) return;
    CGFontRef font = CGFontCreateWithDataProvider(provider);
    if (font) {
        CFErrorRef error = NULL;
        BOOL registered = CTFontManagerRegisterGraphicsFont(font, &error);
        // Already registered fonts remain usable.
        if (registered || (error && CFErrorGetCode(error) == kCTFontManagerErrorAlreadyRegistered)) {
            CFStringRef name = CGFontCopyPostScriptName(font);
            if (name) {
                @synchronized(UIFont.class) {
                    NSMutableDictionary *next = [fontMap mutableCopy] ?: [NSMutableDictionary dictionary];
                    next[key] = (__bridge NSString *)name;
                    fontMap = [next copy];
                }
                CFRelease(name);
                static dispatch_once_t hooks;
                dispatch_once(&hooks, ^{ %init(CloudCordFontOverrides); });
            }
        }
        if (error) CFRelease(error);
        CFRelease(font);
    }
    CGDataProviderRelease(provider);
}
void patchFonts(NSDictionary<NSString *, NSString *> *mainFonts, NSString *fontDefName) {
    if (![mainFonts isKindOfClass:NSDictionary.class]) return;
    NSURL *directory = [getPyoncordDirectory() URLByAppendingPathComponent:@"downloads/fonts" isDirectory:YES];
    [NSFileManager.defaultManager createDirectoryAtURL:directory withIntermediateDirectories:YES attributes:nil error:nil];
    for (id key in mainFonts) {
        id value = mainFonts[key];
        if (![key isKindOfClass:NSString.class] || ![value isKindOfClass:NSString.class]) continue;
        NSURL *url = [NSURL URLWithString:value];
        if (![url.scheme.lowercaseString isEqualToString:@"https"] || !url.host.length) continue;
        NSData *urlData = [value dataUsingEncoding:NSUTF8StringEncoding];
        unsigned char digest[CC_SHA256_DIGEST_LENGTH];
        CC_SHA256(urlData.bytes, (CC_LONG)urlData.length, digest);
        NSMutableString *filename = [NSMutableString string];
        for (NSUInteger i = 0; i < sizeof(digest); i++) [filename appendFormat:@"%02x", digest[i]];
        NSURL *cache = [directory URLByAppendingPathComponent:filename];
        // Kettu already downloads fonts to definition/family.ext. Reuse that
        // exact cache instead of downloading a second copy during launch.
        NSData *cached = nil;
        if ([fontDefName isKindOfClass:NSString.class] && [fontDefName isEqualToString:fontDefName.lastPathComponent] && ![fontDefName isEqualToString:@".."] && [key isEqualToString:[key lastPathComponent]] && ![key isEqualToString:@".."]) {
            NSString *extension = [value hasSuffix:@".otf"] ? @"otf" : @"ttf";
            NSURL *legacyCache = [[directory URLByAppendingPathComponent:fontDefName isDirectory:YES] URLByAppendingPathComponent:[NSString stringWithFormat:@"%@.%@", key, extension]];
            NSNumber *size = [NSFileManager.defaultManager attributesOfItemAtPath:legacyCache.path error:nil][NSFileSize];
            if (size.unsignedLongLongValue <= 16 * 1024 * 1024) cached = [NSData dataWithContentsOfURL:legacyCache];
        }
        if (!cached.length) cached = [NSData dataWithContentsOfURL:cache];
        if (cached.length) { registerFontData(cached, key); continue; }
        // Never synchronously wait for the internet during app launch.
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
        request.timeoutInterval = 15;
        [[NSURLSession.sharedSession dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            if (error || ![response isKindOfClass:NSHTTPURLResponse.class] ||
                ((NSHTTPURLResponse *)response).statusCode != 200 || !data.length || data.length > 16 * 1024 * 1024) return;
            [data writeToURL:cache atomically:YES];
            dispatch_async(dispatch_get_main_queue(), ^{ registerFontData(data, key); });
        }] resume];
    }
}
%ctor { @autoreleasepool { fontMap = @{}; } }
