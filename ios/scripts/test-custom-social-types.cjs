const path = require('node:path');
const fs = require('node:fs');
const {execFileSync}=require('node:child_process');
const ts = require('../runtime/node_modules/typescript');
const root = path.resolve(__dirname, '../runtime');
const file = path.join(root, 'src/core/ui/settings/components/CustomSocial.tsx');
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const options = {...parsed.options, noEmit:true, emitDeclarationOnly:false, paths:{...parsed.options.paths, '@lib/api/profileAppearance':[path.resolve(__dirname, '../../desktop/client/src/utils/profileAppearance.ts')]}};
const generatedFile=path.join(root,'src/core/ui/settings/pages/FakeProfile/index.tsx');
const workflow=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/cloudcord.yml'),'utf8');
const extract=value=>value.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1]?.split('\n          TSX')[0]?.replace(/^          /gm,'');
const generated=extract(workflow);
if(!generated)throw new Error('Generated mobile profile editor was not found');
function check(source){
    const host=ts.createCompilerHost(options);
    const originalRead=host.readFile.bind(host),originalExists=host.fileExists.bind(host);
    host.readFile=name=>path.resolve(name)===generatedFile?source:originalRead(name);
    host.fileExists=name=>path.resolve(name)===generatedFile||originalExists(name);
    return ts.getPreEmitDiagnostics(ts.createProgram([file,generatedFile],options,host));
}
const all=check(generated);
// Existing upstream diagnostics are not attributed to this new component.
const diagnostics = all.filter(item => item.file && path.resolve(item.file.fileName) === file);
const isGenerated=item=>item.file&&path.resolve(item.file.fileName)===generatedFile;
const key=item=>`${item.code}:${ts.flattenDiagnosticMessageText(item.messageText,' ')}:${item.file.text.split(/\r?\n/)[item.file.getLineAndCharacterOfPosition(item.start||0).line].trim()}`;
// Keep the pre-feature baseline stable after this feature is committed, rather than
// accidentally comparing a regression against itself through HEAD.
const baselineRef=process.env.CLOUDCORD_SOCIAL_TYPE_BASELINE||'fc33c79265be83e1adfd0ab9bbc5067398236cce';
if(!/^[a-f0-9]{7,40}$/.test(baselineRef))throw new Error('Type baseline must be a Git commit SHA');
const baseline=extract(execFileSync('git',['show',`${baselineRef}:.github/workflows/cloudcord.yml`],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8',maxBuffer:2*1024*1024}));
if(!baseline)throw new Error('Baseline generated editor missing');
const inherited=new Map();
for(const item of check(baseline).filter(isGenerated))inherited.set(key(item),(inherited.get(key(item))||0)+1);
let inheritedCount=0;
for(const item of all.filter(isGenerated)){
    const count=inherited.get(key(item))||0;
    if(count){inherited.set(key(item),count-1);inheritedCount++;}else diagnostics.push(item);
}
console.log(`Generated editor comparison: ${inheritedCount} unchanged upstream/local-overlay diagnostics; new diagnostics must be zero.`);
if (diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCurrentDirectory:()=>root, getCanonicalFileName:name=>name, getNewLine:()=> '\n'}));
    process.exitCode=1;
} else console.log('Mobile custom social component native props and generated-editor type regression checks passed (not a full runtime/device test)');
