#import <Foundation/Foundation.h>
#import "../native-ios/Sources/SubstrateCompat.m"
#include <assert.h>

@interface HookParent : NSObject
- (int)value;
@end
@implementation HookParent
- (int)value { return 7; }
@end
@interface HookChild : HookParent
@end
@implementation HookChild
@end
@interface HookSibling : HookParent
@end
@implementation HookSibling
@end

static int replacement(id object, SEL selector) { return 9; }
static int replacementAgain(id object, SEL selector) { return 11; }
int main(void)
{
    @autoreleasepool {
        IMP original = NULL;
        MSHookMessageEx(HookChild.class, @selector(value), (IMP)replacement, &original);
        assert(original != NULL);
        assert(((int (*)(id, SEL))original)([HookChild new], @selector(value)) == 7);
        assert([[HookChild new] value] == 9);
        assert([[HookParent new] value] == 7);
        assert([[HookSibling new] value] == 7);
        MSHookMessageEx(HookChild.class, @selector(value), (IMP)replacementAgain, &original);
        assert(((int (*)(id, SEL))original)([HookChild new], @selector(value)) == 9);
        assert([[HookChild new] value] == 11);
        assert([[HookSibling new] value] == 7);
        MSHookMessageEx(HookChild.class, @selector(nonexistent), (IMP)replacement, &original);
        assert(original == NULL);
        NSLog(@"hook isolation regression passed");
    }
    return 0;
}
