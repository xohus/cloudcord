#import <Foundation/Foundation.h>

#import "Fonts.h"
#import "Themes.h"

#if CLOUDCORD_SAFE_UI
void patchFonts(NSDictionary<NSString *, NSString *> *mainFonts, NSString *fontDefName)
{
    (void) mainFonts;
    (void) fontDefName;
    // Discord 344 compatibility mode intentionally leaves UIFont untouched.
}

void initializeThemeColors(NSDictionary *semanticColors, NSDictionary *rawColors)
{
    (void) semanticColors;
    (void) rawColors;
    // Discord 344 compatibility mode intentionally leaves native colors untouched.
}
#endif
