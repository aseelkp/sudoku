import { expect, it } from 'vitest';
import { parseClientMessage } from './protocol';

it('accepts well-formed messages and normalizes them', () => {
  expect(parseClientMessage('{"t":"join","code":" abc234 ","name":"  Ana   Lee "}')).toEqual({
    t: 'join',
    code: 'ABC234',
    name: 'Ana Lee',
  });
  expect(parseClientMessage('{"t":"move","cell":80,"digit":9}')).toEqual({ t: 'move', cell: 80, digit: 9 });
});

it.each([
  'not json',
  'null',
  '{"t":"move","cell":81,"digit":1}',
  '{"t":"move","cell":0,"digit":0}',
  '{"t":"move","cell":1.5,"digit":1}',
  '{"t":"create","mode":"race","difficulty":"impossible","name":"x"}',
  '{"t":"create","mode":"race","difficulty":"easy","name":"   "}',
  '{"t":"hack"}',
])('rejects %s', (raw) => {
  expect(parseClientMessage(raw)).toBeNull();
});
