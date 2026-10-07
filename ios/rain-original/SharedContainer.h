#import <Foundation/Foundation.h>
#import <objc/runtime.h>

// Rain's original binary remains intact. Its legacy private-folder fallback
// must not replace an available OS-provisioned app-group container: the
// BroadcastUpload process needs the same real container as the host app.
typedef NSURL *(*CloudCordGroupResolver)(id, SEL, NSString *);
static CloudCordGroupResolver cloudcordNativeGroupResolver;
static CloudCordGroupResolver cloudcordRainGroupResolver;

static NSURL *cloudcordResolveSharedContainer(id manager, SEL selector, NSString *group) {
    NSURL *native = cloudcordNativeGroupResolver
        ? cloudcordNativeGroupResolver(manager, selector, group) : nil;
    if (native) return native;
    return cloudcordRainGroupResolver
        ? cloudcordRainGroupResolver(manager, selector, group) : nil;
}

static void cloudcordPreserveSharedContainers(IMP nativeResolver) {
    if (!nativeResolver) return;
    Method method = class_getInstanceMethod(NSFileManager.class,
        @selector(containerURLForSecurityApplicationGroupIdentifier:));
    if (!method) return;
    IMP rainResolver = method_getImplementation(method);
    if (rainResolver == nativeResolver || rainResolver == (IMP)cloudcordResolveSharedContainer) return;
    cloudcordNativeGroupResolver = (CloudCordGroupResolver)nativeResolver;
    cloudcordRainGroupResolver = (CloudCordGroupResolver)rainResolver;
    method_setImplementation(method, (IMP)cloudcordResolveSharedContainer);
}
