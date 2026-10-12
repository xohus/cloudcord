const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),{createRequire}=require('node:module');
const clientRequire=createRequire(path.resolve(__dirname,'../../desktop/client/package.json'));
const esbuild=clientRequire('esbuild');
const workflow=fs.readFileSync('.github/workflows/cloudcord.yml','utf8');
const page=workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm,'');
const hooks=new Map(),values=new Map(),cleanups=[];
let nativeLoads=0;
const React={
    createContext:initial=>{const context={initial};context.Provider={context};return context;},
    useContext:context=>values.has(context)?values.get(context):context.initial,
    createElement(type,props,...children){const element={type,props:{...props,children}};return hooks.get(type?.name)?.(type,element)||element;}
};
const context=vm.createContext({React,require:name=>{assert.equal(name,'react');nativeLoads++;return React;},
    onJsxCreate:(name,hook)=>hooks.set(name,hook),renderedUserId:props=>props.user?.id,
    useReducer:()=>[0,()=>{}],useEffect:effect=>{const cleanup=effect();if(cleanup)cleanups.push(cleanup);},
    identityRefreshers:new Set(),requestSharedProfile:()=>{},isCurrentUser:id=>id==='self',preview:{enabled:true},
    getProfileOverride:id=>id?{customFriends:[{id:'friend'}]}:null,
    CustomSocialList:({data})=>React.createElement('social',{data})
});
const source=page.slice(page.indexOf('const socialRenderers ='),page.indexOf('function replaceIdentityText('));
vm.runInContext(esbuild.transformSync(source,{loader:'tsx'}).code,context);
context.connectCustomSocialRenderer();
assert.equal(nativeLoads,0,'native React must not be loaded during startup/registration');
function render(node,result=[]){
    if(Array.isArray(node)){node.forEach(child=>render(child,result));return result;}
    if(!node||typeof node!=='object')return result;
    if(node.type?.context){const key=node.type.context,old=values.get(key),had=values.has(key);values.set(key,node.props.value);render(node.props.children,result);if(had)values.set(key,old);else values.delete(key);return result;}
    if(typeof node.type==='function')return render(node.type(node.props),result);
    result.push(node);render(node.props.children,result);return result;
}
function UserProfileContent(props){return React.createElement('native-content',null,props.user.id);}
function UserProfileBody(props){return React.createElement('native-body',null,React.createElement(UserProfileContent,props));}
function UserProfilePrimaryInfo(props){return React.createElement('native-info',null,props.user.id);}
for(const id of ['one','two','self']){
    const nodes=render(React.createElement(UserProfileBody,{user:{id}}));
    assert.equal(nodes.filter(node=>node.type==='social').length,1,'nested anchors render one custom social section per profile');
    assert.ok(nodes.some(node=>node.type==='native-content'),'original native content remains');
}
assert.equal(render(React.createElement(UserProfilePrimaryInfo,{user:{id:'other'}})).filter(node=>node.type==='social').length,1,'a different layout still works after another anchor rendered');
assert.equal(render(React.createElement(UserProfileBody,{user:{}})).filter(node=>node.type==='social').length,0,'missing user IDs remain untouched');
function Message(props){return React.createElement('message',null,props.user.id);}
assert.equal(render(React.createElement(Message,{user:{id:'one'}})).filter(node=>node.type==='social').length,0,'messages never receive profile sections');
cleanups.forEach(cleanup=>cleanup());assert.equal(context.identityRefreshers.size,0,'subscriptions clean up on unmount');
console.log('Mobile social renderer: lazy startup, nested deduplication, independent layouts, original content and cleanup passed (simulated React renderer)');
