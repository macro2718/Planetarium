import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../core/settings.js';
import {
    getButtonSettingDescriptors,
    SETTING_DESCRIPTORS,
    toggleRegisteredSetting
} from '../core/settingRegistry.js';

test('registered setting and button identifiers are unique', () => {
    const keys = SETTING_DESCRIPTORS.map(({ key }) => key);
    const buttons = getButtonSettingDescriptors().map(({ buttonId }) => buttonId);
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(new Set(buttons).size, buttons.length);
});

test('default settings are sourced from the registry', () => {
    const settings = createDefaultSettings();
    SETTING_DESCRIPTORS.forEach(({ key, defaultValue }) => {
        assert.equal(settings[key], defaultValue);
    });
});

test('toggling a registered setting updates state and applies the effect', () => {
    const settings = createDefaultSettings();
    const ctx = {
        settings,
        starsGroup: { visible: settings.showBackgroundStars }
    };

    const result = toggleRegisteredSetting(ctx, 'showBackgroundStars');
    assert.equal(result, false);
    assert.equal(settings.showBackgroundStars, false);
    assert.equal(ctx.starsGroup.visible, false);
});
