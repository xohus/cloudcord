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
        // Exercise the real method-installation path as well as direct calls.
        Method method = class_getInstanceMethod(NSFileManager.class, selector);
        IMP original = method_getImplementation(method);
        method_setImplementation(method, (IMP)rainResolver);
        cloudcordPreserveSharedContainers((IMP)nativeResolver);
        nativeResult = [NSURL fileURLWithPath:@"/shared/provisioned/group"];
        resolved = [NSFileManager.defaultManager containerURLForSecurityApplicationGroupIdentifier:@"group.test"];
        BOOL nativeOK = [resolved isEqual:nativeResult];
        nativeResult = nil;
        resolved = [NSFileManager.defaultManager containerURLForSecurityApplicationGroupIdentifier:@"group.test"];
        BOOL fallbackOK = [resolved.path isEqualToString:@"/private/legacy/AppGroup"];
        method_setImplementation(method, original);
        if (!nativeOK || !fallbackOK) return 4;
        NSLog(@"Shared-container resolver tests passed (not a signed-device broadcast test)");
    }
    return 0;
}
