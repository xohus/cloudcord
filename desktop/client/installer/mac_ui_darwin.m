//go:build darwin && !cli

#import <Cocoa/Cocoa.h>
#include <stdlib.h>
#include <string.h>

static void cloudcordActivate(void) {
    [NSApplication sharedApplication];
    [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
    [NSApp activateIgnoringOtherApps:YES];
}

int cloudcordChooseAction(const char *choices, int *selection) {
    @autoreleasepool {
        cloudcordActivate();
        NSAlert *alert = [NSAlert new];
        alert.messageText = @"CloudCord";
        alert.informativeText = @"Quit Discord, choose its installed app, then install CloudCord. Your original Discord files are backed up so you can remove CloudCord later.";
        [alert addButtonWithTitle:@"Install / Reinstall"];
        [alert addButtonWithTitle:@"Uninstall"];
        [alert addButtonWithTitle:@"Close"];
        [alert addButtonWithTitle:@"Installation Guide"];
        NSPopUpButton *picker = [[NSPopUpButton alloc] initWithFrame:NSMakeRect(0, 0, 440, 32) pullsDown:NO];
        [picker addItemsWithTitles:[[NSString stringWithUTF8String:choices] componentsSeparatedByString:@"\n"]];
        alert.accessoryView = picker;
        NSModalResponse response = [alert runModal];
        *selection = (int)picker.indexOfSelectedItem;
        [picker release];
        [alert release];
        if (response == NSAlertFirstButtonReturn) return 0;
        if (response == NSAlertSecondButtonReturn) return 1;
        if (response == NSAlertThirdButtonReturn + 1) return 2;
        return -1;
    }
}

char *cloudcordChooseBundle(void) {
    @autoreleasepool {
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = @"Choose Discord";
        panel.canChooseFiles = YES;
        panel.canChooseDirectories = NO;
        panel.allowsMultipleSelection = NO;
        panel.treatsFilePackagesAsDirectories = NO;
        if ([panel runModal] != NSModalResponseOK) return NULL;
        return strdup(panel.URL.path.UTF8String);
    }
}

void cloudcordShowResult(const char *title, const char *message) {
    @autoreleasepool {
        NSAlert *alert = [NSAlert new];
        alert.messageText = [NSString stringWithUTF8String:title];
        alert.informativeText = [NSString stringWithUTF8String:message];
        [alert addButtonWithTitle:@"OK"];
        [alert runModal];
        [alert release];
    }
}
