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
        NSString *body = [NSString stringWithUTF8String:message];
        if (body.length > 600) {
            alert.informativeText = @"Read the guide below. Scroll to see all steps.";
            NSScrollView *scroll = [[NSScrollView alloc] initWithFrame:NSMakeRect(0, 0, 520, 320)];
            scroll.hasVerticalScroller = YES;
            scroll.autohidesScrollers = YES;
            scroll.borderType = NSBezelBorder;
            NSTextView *text = [[NSTextView alloc] initWithFrame:scroll.contentView.bounds];
            text.editable = NO;
            text.selectable = YES;
            text.font = [NSFont systemFontOfSize:13];
            text.textColor = [NSColor textColor];
            text.backgroundColor = [NSColor textBackgroundColor];
            text.textContainerInset = NSMakeSize(12, 12);
            text.verticallyResizable = YES;
            text.horizontallyResizable = NO;
            text.autoresizingMask = NSViewWidthSizable;
            text.textContainer.widthTracksTextView = YES;
            text.textContainer.containerSize = NSMakeSize(scroll.contentSize.width, CGFLOAT_MAX);
            text.string = body;
            scroll.documentView = text;
            alert.accessoryView = scroll;
            [text release];
            [scroll release];
        } else {
            alert.informativeText = body;
        }
        [alert addButtonWithTitle:@"OK"];
        [alert runModal];
        [alert release];
    }
}
