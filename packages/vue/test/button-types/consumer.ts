import { ZButton } from '@zoom-design/vue';
import { ZButton as SubpathButton } from '@zoom-design/vue/button';
import type { ButtonProps, ButtonExpose, ButtonEmits, ButtonVariant, ButtonSize, ButtonNativeType } from '@zoom-design/vue';
import type { ButtonProps as SubpathProps } from '@zoom-design/vue/button';

type Root = InstanceType<typeof ZButton>;
type Subpath = InstanceType<typeof SubpathButton>;
const props: Root['$props'] = { variant: 'outline', size: 'sm', type: 'submit', disabled: false, loading: false, block: true, name: 'action', value: 0, form: 'f', formaction: '/submit', formmethod: 'post', formenctype: 'multipart/form-data', formtarget: '_self', formnovalidate: true, autofocus: false, tabindex: 0, 'aria-label': 'Save', 'aria-describedby': 'description', 'data-id': 1, onClick: (event: MouseEvent) => event.preventDefault() };
const subpath: Subpath['$props'] = props;
const own: ButtonProps = subpath;
const same: SubpathProps = own;
declare const instance: Root;
const exposed: ButtonExpose = instance;
exposed.focus({ preventScroll: true }); exposed.blur();
instance.$emit('click', new MouseEvent('click'));
const event: ButtonEmits['click'] = [new MouseEvent('click')];
const enums: [ButtonVariant, ButtonSize, ButtonNativeType] = ['solid', 'md', 'button'];
void [props, subpath, own, same, event, enums];
