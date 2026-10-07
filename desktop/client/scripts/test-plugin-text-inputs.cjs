const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const esbuild = require('esbuild');
function mount(name, setting) {
    let count = 0;
    const states = [], saved = [];
    const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
    const context = vm.createContext({ Error, React, Switch: 'switch', Select: 'select', Slider: 'slider', TextInput: 'input', TextArea: 'textarea', SettingsSection: 'section',
        OptionType: { NUMBER: 1, BIGINT: 2 }, isSettingDisabled: () => false, resolveError: value => value === true ? null : String(value),
        useState: initial => { const index = count++; states[index] = initial; return [initial, value => { states[index] = value; }]; } });
    const source = fs.readFileSync(`src/components/settings/tabs/plugins/components/${name}.tsx`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export function ', 'function ');
    vm.runInContext(esbuild.transformSync(source, { loader: 'tsx', jsxFactory: 'React.createElement' }).code, context);
    const tree = context[name]({ setting, pluginSettings: {}, definedSettings: {}, id: 'test', onChange: value => saved.push(value) });
    return { input: tree.props.children[0], states, saved };
}
const number = mount('NumberSetting', { type: 1 });
for (const draft of ['-', '', '1.5', '-2.25', '9007199254740992', '1e999']) assert.doesNotThrow(() => number.input.props.onChange(draft));
assert.deepEqual(number.saved, [1.5, -2.25]);
const bigint = mount('NumberSetting', { type: 2 });
bigint.input.props.onChange('1.5');
assert.equal(bigint.saved.length, 0);
bigint.input.props.onChange('90071992547409930');
assert.equal(bigint.saved[0], 90071992547409930n);
const text = mount('TextSetting', { isValid() { throw new Error('Invalid draft'); } });
assert.equal(text.input.props.value, '');
assert.doesNotThrow(() => text.input.props.onChange('typing works'));
assert.equal(text.states[0], 'typing works');
assert.equal(text.states[1], 'Invalid draft');
assert.equal(text.saved.length, 0);
for (const [name, prop, value] of [['BooleanSetting', 'onChange', true], ['SelectSetting', 'select', 'value'], ['SliderSetting', 'onValueChange', 5]]) {
    const setting = mount(name, { markers: [0, 10], options: [{ value: 'value' }], isValid() { throw new Error('Invalid draft'); } });
    assert.doesNotThrow(() => setting.input.props[prop](value));
    assert.equal(setting.saved.length, 0);
    assert.equal(setting.states.at(-1), 'Invalid draft');
}
console.log('PASS: actual plugin input handlers preserve drafts, reject invalid values and contain validator errors');
