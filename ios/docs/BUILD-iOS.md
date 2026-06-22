# CloudCord iOS Build Notes

## Native loader

Go to:

`native-ios/`

Install Theos, then build normally:

`make package`

## Runtime

Go to:

`runtime/`

Install dependencies and build:

`bun install`
`bun run build`

The runtime output should be hosted or loaded through the CloudCord custom bundle URL.

## Local dev URL

Default custom bundle URL:

`http://localhost:4040/CloudCord.js`

## Assets

CloudCord assets are in:

`assets/logo-full.png`
`assets/favicon.png`
`native-ios/CloudCordAssets/`
`runtime/src/assets/icons/`
