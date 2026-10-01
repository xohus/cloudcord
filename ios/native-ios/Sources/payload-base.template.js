globalThis.__CLOUDCORD_LOADER__={loaderName:"CloudCord",loaderVersion:"@PACKAGE_VERSION@",hasThemeSupport:false,storedTheme:null,fontPatch:0};globalThis.__PYON_LOADER__=globalThis.__CLOUDCORD_LOADER__;globalThis.__CLOUDCORD__={name:"CloudCord",runtime:"Kettu",base:"CloudCordTweak",pluginsSource:"cloudcord-official-plugins"};
if(typeof globalThis.__CLOUDCORD_NATIVE_CALL__==="function"){
    globalThis.__CLOUDCORD_BRIDGE_CALL_SYNC__=payload=>JSON.parse(globalThis.__CLOUDCORD_NATIVE_CALL__(JSON.stringify(payload)));
    globalThis.__CLOUDCORD_BRIDGE_CALL_ASYNC__=payload=>Promise.resolve().then(()=>globalThis.__CLOUDCORD_BRIDGE_CALL_SYNC__(payload));
    globalThis.__RAIN_BRIDGE_CALL_SYNC__=globalThis.__CLOUDCORD_BRIDGE_CALL_SYNC__;
    globalThis.__RAIN_BRIDGE_CALL_ASYNC__=globalThis.__CLOUDCORD_BRIDGE_CALL_ASYNC__;
}
