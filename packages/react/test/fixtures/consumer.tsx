import type { ComponentProps } from 'react';
import { BuildProbe } from '../../../../.artifacts/fixtures/react/types/BuildProbe.js';

type Props = ComponentProps<typeof BuildProbe>;
const props: Props = { label: 'Declaration consumer', onCount: count => count.toFixed() };
export const consumer = <BuildProbe {...props} />;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const labelIsString: Equal<Props['label'], string> = true;
const countIsNumber: Equal<Parameters<NonNullable<Props['onCount']>>[0], number> = true;
const propsAreNotAny: IsAny<Props> = false;
void [labelIsString, countIsNumber, propsAreNotAny];
