# Original RainTweak injector

RainTweak.dylib.b64 is the unmodified loader from the user-supplied RainTweak.ipa.
Discord: 344.1. Loader: RainTweak 1.2.0.
SHA-256: e43cad3e64c2d518b1744a214d1ecb8fe89342e064976c5eed8e6b6f1d82b825

Licensed under OSL-3.0; see ../native-ios/RAIN-LICENSE.
Upstream source: https://codeberg.org/raincord/RainTweak
The available source revision is c2fa89a6c23eacad923cf46fcb70d45957aa37e0;
it is not asserted to be the exact source revision of this supplied binary.
No upstream endorsement is implied.

CloudCordBootstrap only prepares Rain's runtime/config files and loads the
original library. It contains no React Native, JSI, UIKit, font, or theme hooks.
CloudCord identity and filesystem compatibility live in the JavaScript runtime.
Rain's injector, bridge, themes and fonts are unchanged. IPA signing can change
signature bytes; packaging verifies the complete original binary before signing.
