const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(component, optionType = 0) {
    const states = [];
    let cursor = 0;
    const react = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) };
    const modules = {
        '@api/PluginManager': { isSettingDisabled: () => false },
        '@utils/types': { OptionType: { BIGINT: 9 } },
        '@webpack/common': { React: react, TextInput: 'input', TextArea: 'textarea', useState: initial => {
            const index = cursor++;
            if (!(index in states)) states[index] = initial;
            return [states[index], value => { states[index] = value; }];
        } },
        './Common': { SettingsSection: 'section', resolveError: value => value === true ? null : String(value) }
    };
    const source = fs.readFileSync(path.join(__dirname, '../src/components/settings/tabs/plugins/components', component + '.tsx'), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(output, { exports, require: name => { assert(name in modules, name); return modules[name]; } });
    const saved = [];
    const props = { id: 'value', setting: { type: optionType, description: 'Test', componentProps: { onChange: () => { throw Error('Must not override the controlled handler'); }, value: 'Wrong' } }, pluginSettings: {}, definedSettings: {}, onChange: value => saved.push(value) };
    return { saved, props, render: () => { cursor = 0; return exports[component](props).children[0]; } };
}

const text = load('TextSetting');
assert.equal(text.render().props.value, '');
assert(!('maxLength' in text.render().props));
text.render().props.onChange('hello');
assert.equal(text.render().props.value, 'hello');
text.render().props.onChange({ currentTarget: { value: 'event input' } });
assert.equal(text.saved.at(-1), 'event input');
text.props.setting.multiline = true;
assert.equal(text.render().type, 'textarea');
text.render().props.onChange({ currentTarget: { value: 'two\nlines' } });
assert.equal(text.saved.at(-1), 'two\nlines');

const number = load('NumberSetting');
number.render().props.onChange({ currentTarget: { value: '42' } });
assert.equal(number.saved.at(-1), 42);
number.render().props.onChange('-');
assert.equal(number.render().props.value, '-');
assert.equal(number.saved.at(-1), 42);
number.render().props.onChange('-12');
assert.equal(number.saved.at(-1), -12);
console.log('Actual text/number setting handlers accept string and event input, preserve drafts, and protect controlled props.');
