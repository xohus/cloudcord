#import "LoaderConfig.h"
#import "Logger.h"
extern NSURL *getPyoncordDirectory(void);

static NSDictionary *readLoaderConfig(NSURL *url)
{
    NSData *data = [NSData dataWithContentsOfURL:url];
    if (!data.length) return nil;
    id parsed = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    return [parsed isKindOfClass:NSDictionary.class] ? parsed : nil;
}

static void applyLoaderConfig(LoaderConfig *config, NSDictionary *json)
{
    id custom = json[@"customLoadUrl"];
    if (![custom isKindOfClass:NSDictionary.class]) return;
    id enabled = custom[@"enabled"];
    id value = custom[@"url"];
    if (![value isKindOfClass:NSString.class]) return;
    NSURL *url = [NSURL URLWithString:value];
    if (!url || ![@[@"https", @"http"] containsObject:url.scheme.lowercaseString] || !url.host.length) return;
    config.customLoadUrl = url;
    config.customLoadUrlEnabled = [enabled isKindOfClass:NSNumber.class] && [enabled boolValue];
}

@implementation LoaderConfig

- (instancetype)init {
    self = [super init];
    if (self) {
        self.customLoadUrlEnabled = NO;
        self.customLoadUrl        = [NSURL URLWithString:@"http://localhost:4040/CloudCord.js"];
    }
    return self;
}

- (BOOL)loadConfig {
    NSURL *loaderConfigUrl = [getPyoncordDirectory() URLByAppendingPathComponent:@"loader.json"];
    BunnyLog(@"Attempting to load config from: %@", loaderConfigUrl.path);

    if ([[NSFileManager defaultManager] fileExistsAtPath:loaderConfigUrl.path]) {
        NSDictionary *json = readLoaderConfig(loaderConfigUrl);

        if (json) {
            applyLoaderConfig(self, json);

            BunnyLog(@"Loader config loaded - Custom URL %@: %@",
                     self.customLoadUrlEnabled ? @"enabled" : @"disabled",
                     self.customLoadUrl.absoluteString);
            return YES;
        }
    }

    BunnyLog(@"Using default loader config: %@", self.customLoadUrl.absoluteString);
    return NO;
}

+ (instancetype)defaultConfig {
    LoaderConfig *config        = [[LoaderConfig alloc] init];
    config.customLoadUrlEnabled = NO;
    config.customLoadUrl        = [NSURL URLWithString:@"http://localhost:4040/CloudCord.js"];
    return config;
}

+ (instancetype)getLoaderConfig {
    BunnyLog(@"Getting loader config");

    NSURL *loaderConfigUrl = [getPyoncordDirectory() URLByAppendingPathComponent:@"loader.json"];

    if ([[NSFileManager defaultManager] fileExistsAtPath:loaderConfigUrl.path]) {
        NSDictionary *json = readLoaderConfig(loaderConfigUrl);

        if (json) {
            LoaderConfig *config        = [[LoaderConfig alloc] init];
            applyLoaderConfig(config, json);
            return config;
        }
    }

    BunnyLog(@"Couldn't get loader config");
    return [LoaderConfig defaultConfig];
}

- (BOOL)saveConfig {
    NSURL *loaderConfigUrl = [getPyoncordDirectory() URLByAppendingPathComponent:@"loader.json"];
    NSDictionary *json     = @{
        @"customLoadUrl" :
            @{@"enabled" : @(self.customLoadUrlEnabled), @"url" : self.customLoadUrl.absoluteString}
    };

    NSData *data = [NSJSONSerialization dataWithJSONObject:json options:0 error:nil];
    return [data writeToURL:loaderConfigUrl atomically:YES];
}

@end
