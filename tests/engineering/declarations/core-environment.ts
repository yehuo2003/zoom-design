export {};
// @ts-expect-error Core does not include browser globals.
document.createElement('div');
// @ts-expect-error Core does not include browser globals.
window.location;
// @ts-expect-error Node globals must not leak into Core's production compilation.
process.versions;
