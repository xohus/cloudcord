const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),{createRequire}=require('node:module');
const esbuild=createRequire(path.resolve(__dirname,'../../desktop/client/package.json'))('esbuild');
const workflow=fs.readFileSync('.github/workflows/cloudcord.yml','utf8');
const page=workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm,'');
assert.ok(!page.includes('CustomSocialList'),'separate profile social sections removed');
const hooks=new Map(),routes=[];
const runtime={jsx(){},jsxs(){}};
const context=vm.createContext({React:{createElement:(type,props)=>({type,props})},findByProps:()=>runtime,after:(method,object,hook)=>hooks.set(method,hook),isValidElement:node=>!!node?.type,cloneElement:(node,changes)=>({...node,props:{...node.props,...changes}}),NavigationNative:{useNavigation:()=>({push:(...args)=>routes.push(args)})},require:()=>({CustomSocialDetail:function Detail(){}})});
const source=page.slice(page.indexOf('const socialRenderers ='),page.indexOf('function replaceIdentityText('));
vm.runInContext(esbuild.transformSync(source,{loader:'tsx'}).code,context);
context.connectNativeSocialRenderer();
for(const name of ['jsx','jsxs']) {
    const originalPress=()=>{};
    const Native=function(props){return {type:'native-row',props:{...props,children:{type:'native-button',props:{onPress:()=>{throw new Error('native action must be intercepted');}}}}};};
    const ordinary={type:Native,props:{user:{id:'real'},onPress:originalPress}};
    assert.equal(hooks.get(name)([Native],ordinary),ordinary,'ordinary native entries remain untouched');
    const entry={id:'custom',username:'Preview'};
    const custom={type:Native,props:{user:{cloudcordPreview:entry}}};
    const wrapped=hooks.get(name)([Native],custom);
    const rendered=wrapped.type(wrapped.props);
    assert.equal(rendered.type,'native-row','native renderer and layout retained');
    rendered.props.onPress();
    rendered.props.children.props.onPress();
    assert.equal(routes.at(-1)[0],'PUPU_CUSTOM_PAGE');
    const detail=routes.at(-1)[1].render();
    assert.equal(detail.props.entry,entry);
}
console.log('Mobile native social routing: preserves native layout and ordinary entries; custom presses open detail (simulated renderer)');
