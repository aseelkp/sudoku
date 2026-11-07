import { expect, it } from 'vitest';
import { parseClientMessage } from './protocol';

it('accepts well-formed messages and normalizes them', () => {
  expect(parseClientMessage('{"t":"join","code":" abc234 ","name":"  Ana   Lee "}')).toEqual({
    t: 'join',
    code: 'ABC234',
    name: 'Ana Lee',
  });
  expect(parseClientMessage('{"t":"move","cell":80,"digit":9}')).toEqual({ t: 'move', cell: 80, digit: 9 });
  expect(parseClientMessage('{"t":"note","cell":3,"digit":4}')).toEqual({ t: 'note', cell: 3, digit: 4 });
  expect(parseClientMessage('{"t":"cursor","cell":null}')).toEqual({ t: 'cursor', cell: null });
  expect(parseClientMessage('{"t":"create","mode":"coop","difficulty":"hard","name":"Bo"}')).toMatchObject({
    mode: 'coop',
  });
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
  '{"t":"note","cell":3,"digit":10}',
  '{"t":"cursor","cell":"a1"}',
  '{"t":"create","mode":"battle","difficulty":"easy","name":"x"}',
])('rejects %s', (raw) => {
  expect(parseClientMessage(raw)).toBeNull();
});
