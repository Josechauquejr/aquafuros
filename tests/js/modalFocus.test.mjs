import { test } from "node:test";
import assert from "node:assert/strict";
import { modalTabTarget } from "../../resources/js/lib/modalFocus.js";

const elements = () => {
    const dialog = { contains: (element) => element === dialog || element?.inside === true };
    const first = { inside: true, name: "first" };
    const middle = { inside: true, name: "middle" };
    const last = { inside: true, name: "last" };
    return { dialog, first, middle, last };
};

test("Tab and Shift+Tab wrap at the modal boundaries", () => {
    const { dialog, first, last } = elements();

    assert.equal(modalTabTarget({ dialog, active: last, first, last, backwards: false }), first);
    assert.equal(modalTabTarget({ dialog, active: first, first, last, backwards: true }), last);
    assert.equal(modalTabTarget({ dialog, active: dialog, first, last, backwards: false }), first);
    assert.equal(modalTabTarget({ dialog, active: dialog, first, last, backwards: true }), last);
});

test("focus moved outside the modal is returned to its nearest boundary", () => {
    const { dialog, first, last } = elements();
    const outside = { inside: false };

    assert.equal(modalTabTarget({ dialog, active: outside, first, last, backwards: false }), first);
    assert.equal(modalTabTarget({ dialog, active: outside, first, last, backwards: true }), last);
});

test("Tab inside the modal keeps the browser's natural order", () => {
    const { dialog, first, middle, last } = elements();

    assert.equal(modalTabTarget({ dialog, active: middle, first, last, backwards: false }), null);
    assert.equal(modalTabTarget({ dialog, active: middle, first, last, backwards: true }), null);
});

test("a modal without interactive children keeps focus on its dialog", () => {
    const { dialog } = elements();

    assert.equal(modalTabTarget({ dialog, active: dialog, first: null, last: null, backwards: false }), dialog);
});
