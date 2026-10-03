#import <objc/runtime.h>

// Preserve inherited implementations without modifying the superclass.
void MSHookMessageEx(Class targetClass, SEL selector, IMP replacement, IMP *original)
{
    if (original) *original = NULL;
    if (!targetClass || !selector || !replacement) return;
    Method method = class_getInstanceMethod(targetClass, selector);
    if (!method) return;
    IMP previous = method_getImplementation(method);
    const char *types = method_getTypeEncoding(method);
    if (original) *original = previous;
    // Adding a class-local override handles inherited methods. Existing local
    // methods instead need replacement; neither path mutates the parent.
    if (!class_addMethod(targetClass, selector, replacement, types))
        class_replaceMethod(targetClass, selector, replacement, types);
}
