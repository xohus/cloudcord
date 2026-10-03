#import <Foundation/Foundation.h>
#include <assert.h>
static NSURL *testDirectory;
NSURL *getPyoncordDirectory(void) { return testDirectory; }
#import "../native-ios/Sources/LoaderConfig.m"
int main(void) {
    @autoreleasepool {
        testDirectory = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:NSUUID.UUID.UUIDString]];
        [NSFileManager.defaultManager createDirectoryAtURL:testDirectory withIntermediateDirectories:YES attributes:nil error:nil];
        NSURL *file = [testDirectory URLByAppendingPathComponent:@"loader.json"];
        for (NSString *json in @[@"", @"[", @"[]", @"null", @"{\"customLoadUrl\":true}", @"{\"customLoadUrl\":{\"enabled\":[],\"url\":42}}", @"{\"customLoadUrl\":{\"enabled\":true,\"url\":\"file:///bad\"}}"]){
            [json writeToURL:file atomically:YES encoding:NSUTF8StringEncoding error:nil];
            LoaderConfig *config = [LoaderConfig new];
            [config loadConfig];
            assert(!config.customLoadUrlEnabled);
            assert(![LoaderConfig getLoaderConfig].customLoadUrlEnabled);
        }
        [@"{\"customLoadUrl\":{\"enabled\":true,\"url\":\"https://example.com/runtime.js\"}}" writeToURL:file atomically:YES encoding:NSUTF8StringEncoding error:nil];
        assert([LoaderConfig getLoaderConfig].customLoadUrlEnabled);
        [NSFileManager.defaultManager removeItemAtURL:testDirectory error:nil];
        NSLog(@"loader config regression passed");
    }
    return 0;
}
