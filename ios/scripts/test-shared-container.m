#import "../rain-original/SharedContainer.h"

static NSUInteger fallbackCalls;
static NSURL *nativeResult;
static NSURL *nativeResolver(id manager, SEL selector, NSString *group) {
    return nativeResult;
}
static NSURL *rainResolver(id manager, SEL selector, NSString *group) {
    fallbackCalls++;
    return [NSURL fileURLWithPath:@"/private/legacy/AppGroup"];
}

int main(void) {
    @autoreleasepool {
        cloudcordNativeGroupResolver = nativeResolver;
        cloudcordRainGroupResolver = rainResolver;
        SEL selector = @selector(containerURLForSecurityApplicationGroupIdentifier:);
        nativeResult = [NSURL fileURLWithPath:@"/shared/provisioned/group"];
        NSURL *resolved = cloudcordResolveSharedContainer(NSFileManager.defaultManager, selector, @"group.test");
        if (![resolved isEqual:nativeResult] || fallbackCalls != 0) return 1;
        nativeResult = nil;
        resolved = cloudcordResolveSharedContainer(NSFileManager.defaultManager, selector, @"group.test");
        if (![resolved.path isEqualToString:@"/private/legacy/AppGroup"] || fallbackCalls != 1) return 2;
        cloudcordRainGroupResolver = NULL;
        if (cloudcordResolveSharedContainer(NSFileManager.defaultManager, selector, @"group.test") != nil) return 3;
        NSLog(@"Shared-container resolver tests passed (not a signed-device broadcast test)");
    }
    return 0;
}
