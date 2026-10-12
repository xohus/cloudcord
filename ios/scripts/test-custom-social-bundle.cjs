// Bundle the generated mobile editor and its real dependency graph without editing runtime sources.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),runtime=path.join(root,'ios/runtime');
const upstream=process.env.CLOUDCORD_KETTU_SOURCE;
const esbuild=require('../runtime/node_modules/esbuild');
const swc=require('../runtime/node_modules/@swc/core');
const globalModule=require('../runtime/node_modules/esbuild-plugin-globals');
const globals=globalModule.default||globalModule;
const workflow=fs.readFileSync(path.join(root,'.github/workflows/cloudcord.yml'),'utf8');
const virtual=new Map();
const canonical=value=>path.resolve(value).toLowerCase();
for(const match of workflow.matchAll(/cp "\.\.\/ios\/runtime\/([^"]+)" "([^"]+)"/g)){
    if(/\.(?:tsx?|jsx?|json)$/.test(match[1]))virtual.set(canonical(path.join(runtime,match[2])),fs.readFileSync(path.join(runtime,match[1]),'utf8'));
}
for(const match of workflow.matchAll(/          cat > (\S+) <<'TSX'\r?\n([\s\S]*?)\r?\n          TSX/g))virtual.set(canonical(path.join(runtime,match[1])),match[2].replace(/^          /gm,''));
virtual.set(canonical(path.join(runtime,'src/lib/api/profileAppearance.ts')),fs.readFileSync(path.join(root,'desktop/client/src/utils/profileAppearance.ts'),'utf8'));
virtual.set(canonical(path.join(runtime,'src/assets/cloudcord-decorations.json')),fs.readFileSync(path.join(root,'ios/assets/cloudcord-decorations.json'),'utf8'));
if(upstream){
    // The workflow adds this startup import/call in its Python patch stage,
    // after the heredoc pages and copied files are prepared.
    let startup=fs.readFileSync(path.join(upstream,'src/index.ts'),'utf8');
    const startupImport=workflow.match(/startup_import = '([^']+)'/)?.[1]?.replace(/\\n/g,'\n');
    assert.ok(startupImport&&startupImport.includes('initializeFakeProfile'),'real workflow startup import must exist');
    assert.ok(startup.includes('        initSettings(),'),'upstream startup marker must still match the workflow');
    assert.ok(workflow.includes('"        initSettings(),\\n        initializeFakeProfile(),"'),'real workflow startup call must exist');
    startup=startupImport+startup.replace('        initSettings(),','        initSettings(),\n        initializeFakeProfile(),');
    virtual.set(canonical(path.join(runtime,'src/index.ts')),startup);
}
const entry=path.join(runtime,'src/core/ui/settings/pages/FakeProfile/index.tsx');
assert.ok(virtual.has(canonical(entry)),'generated editor is required');
const shimNames=[...fs.readFileSync(path.join(runtime,'shims/depsModule.ts'),'utf8').matchAll(/^\s*"([^"]+)":/gm)].map(match=>match[1]);
const seen=new Set();
const sourcePlugin={name:'workflow-sources-and-hermes-transform',setup(build){
    build.onResolve({filter:/.*/},args=>{
        let target;
        if(path.isAbsolute(args.path))target=args.path;
        else if(args.path.startsWith('.')&&args.resolveDir)target=path.resolve(args.resolveDir,args.path);
        else if(args.path.startsWith('@core/'))target=path.join(runtime,'src/core',args.path.slice(6));
        else if(args.path.startsWith('@lib/'))target=path.join(runtime,'src/lib',args.path.slice(5));
        else if(args.path.startsWith('@assets/'))target=path.join(runtime,'src/assets',args.path.slice(8));
        else if(args.path==='@metro'||args.path.startsWith('@metro/'))target=path.join(runtime,'src/metro',args.path.slice(7));
        else if(args.path==='@lib')target=path.join(runtime,'src/lib');
        else if(args.path.startsWith('@ui/'))target=path.join(runtime,'src/lib/ui',args.path.slice(4));
        else if(args.path==='@types')target=path.join(runtime,'src/lib/utils/types.ts');
        else if(args.path.startsWith('@swc/helpers/'))return {path:require.resolve(args.path,{paths:[runtime]})};
        if(upstream&&target&&canonical(target).startsWith(canonical(upstream)+path.sep))target=path.join(runtime,path.relative(upstream,target));
        if(target)for(const suffix of ['', '.ts','.tsx','.js','.json','/index.ts','/index.tsx'])if(virtual.has(canonical(target+suffix)))return {path:path.resolve(target+suffix)};
        // CI starts from clean upstream and overlays only selected runtime files.
        // Resolve a missing base file from that real source, never a stub/external.
        if(upstream&&target&&canonical(target).startsWith(canonical(runtime)+path.sep)){
            const base=path.join(upstream,path.relative(runtime,target));
            for(const suffix of ['', '.ts','.tsx','.js','.json','/index.ts','/index.tsx'])if(fs.existsSync(base+suffix)&&fs.statSync(base+suffix).isFile())return {path:path.resolve(base+suffix)};
        }
        if(target)for(const suffix of ['', '.ts','.tsx','.js','.json','/index.ts','/index.tsx'])if(fs.existsSync(target+suffix)&&fs.statSync(target+suffix).isFile())return {path:path.resolve(target+suffix)};
    });
    build.onLoad({filter:/\.[cm]?[jt]sx?$|cloudcord-decorations\.json$/},args=>{
        const generated=virtual.get(canonical(args.path));
        if(args.path.endsWith('.json'))return generated===undefined?undefined:{contents:generated,loader:'json',resolveDir:path.dirname(args.path)};
        seen.add(canonical(args.path));
        const code=generated===undefined?fs.readFileSync(args.path,'utf8'):generated;
        const transformed=swc.transformSync(code,{filename:args.path,jsc:{externalHelpers:true,parser:{syntax:/\.tsx?$/.test(args.path)?'typescript':'ecmascript',tsx:args.path.endsWith('.tsx'),jsx:args.path.endsWith('.jsx')},transform:{constModules:{globals:{'bunny-build-info':{version:'"v0.1"'}}},react:{runtime:'automatic'}}},env:{targets:'fully supports es6',include:['transform-block-scoping','transform-classes','transform-async-to-generator','transform-async-generator-functions'],exclude:['transform-parameters','transform-template-literals','transform-exponentiation-operator','transform-named-capturing-groups-regex','transform-nullish-coalescing-operator','transform-object-rest-spread','transform-optional-chaining','transform-logical-assignment-operators']}});
        return {contents:transformed.code,loader:'js',resolveDir:path.dirname(args.path)};
    });
}};
(async()=>{
    for(const entryPoint of [entry,path.join(runtime,'src/entry.ts')]) for(const minify of [false,true]){
        seen.clear();
        const result=await esbuild.build({absWorkingDir:runtime,nodePaths:[path.join(runtime,'node_modules')],entryPoints:[entryPoint],bundle:true,write:false,outfile:'dist/custom-social-check.js',format:'iife',jsx:'automatic',minify,supported:{'const-and-let':false},define:{window:'globalThis',__DEV__:'false'},loader:{'.png':'dataurl'},inject:['./shims/asyncIteratorSymbol.js','./shims/promiseAllSettled.js'],alias:{'!cloudcord-deps-shim!':'./shims/depsModule.ts',spitroast:'./node_modules/spitroast','react/jsx-runtime':'./shims/jsxRuntime'},plugins:[sourcePlugin,globals(Object.fromEntries(shimNames.map(name=>[name,`require("!cloudcord-deps-shim!")[${JSON.stringify(name)}]`])))]});
        assert.ok(seen.has(canonical(path.join(runtime,'src/core/ui/settings/components/CustomSocial.tsx'))),'new mobile editor must actually be bundled');
        assert.ok(seen.has(canonical(path.join(runtime,'src/lib/api/profileAppearance.ts'))),'new shared schema must actually be bundled');
        console.log(`Generated mobile ${entryPoint===entry?'editor':'entrypoint'} dependency bundle (${minify?'minified':'readable'}): ${result.outputFiles[0].contents.length} bytes; Hermes transforms passed.`);
    }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
