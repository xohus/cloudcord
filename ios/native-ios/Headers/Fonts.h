#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

extern NSDictionary<NSString *, NSString *> *fontMap;
void patchFonts(NSDictionary<NSString *, NSString *> *mainFonts, NSString *fontDefName);
