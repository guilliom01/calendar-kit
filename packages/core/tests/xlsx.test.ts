import { describe, expect, it } from 'vitest';
import { crc32 } from 'node:zlib';
import { CalendarDate } from '@internationalized/date';
import { toXLSX, type CalendarEvent } from '../src/index.js';
import { allDay, timeZone, timed } from './fixtures.js';

/** Files of a stored (uncompressed) zip, checking each CRC on the way. */
function unzip(bytes: Uint8Array) {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const files = new Map<string, string>();
	let offset = 0;
	while (view.getUint32(offset, true) === 0x04034b50) {
		const crc = view.getUint32(offset + 14, true);
		const size = view.getUint32(offset + 18, true);
		const nameLength = view.getUint16(offset + 26, true);
		const extraLength = view.getUint16(offset + 28, true);
		const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
		const start = offset + 30 + nameLength + extraLength;
		const data = bytes.subarray(start, start + size);
		expect(crc32(data) >>> 0, name).toBe(crc);
		files.set(name, new TextDecoder().decode(data));
		offset = start + size;
	}
	// Then the central directory, which spreadsheet apps read first.
	expect(view.getUint32(offset, true)).toBe(0x02014b50);
	return files;
}

const events: CalendarEvent[] = [
	{ ...timed('a', '2026-11-18T15:00', '2026-11-18T18:00'), title: 'Svelte & <Kit> inglés' },
	{
		...allDay('b', new CalendarDate(2026, 11, 18), new CalendarDate(2026, 11, 21)),
		resourceIds: ['ana', 'luis']
	}
];

describe('toXLSX', () => {
	it('is a zip with the parts of a workbook', () => {
		const files = unzip(toXLSX(events, { timeZone }));
		expect([...files.keys()]).toEqual([
			'[Content_Types].xml',
			'_rels/.rels',
			'xl/workbook.xml',
			'xl/_rels/workbook.xml.rels',
			'xl/styles.xml',
			'xl/worksheets/sheet1.xml'
		]);
	});

	it('writes text escaped, times as real dates and all-day events with their last day', () => {
		const sheet = unzip(toXLSX(events, { timeZone, sheetName: 'Eventos' })).get(
			'xl/worksheets/sheet1.xml'
		)!;
		expect(sheet).toContain('<t>Svelte &amp; &lt;Kit&gt; inglés</t>');
		// 2026-11-18 15:00 is day 46344 since 1899-12-30, plus 15/24.
		expect(sheet).toContain('<v>46344.625</v>');
		// All-day: 18 to 20 November inclusive, as dates.
		expect(sheet).toContain('<v>46344</v>');
		expect(sheet).toContain('<v>46346</v>');
		expect(sheet).toContain('<c r="E3" t="b"><v>1</v></c>');
		expect(sheet).toContain('<t>ana; luis</t>');
	});

	it('names the sheet', () => {
		const workbook = unzip(toXLSX(events, { timeZone, sheetName: 'Eventos & más' })).get(
			'xl/workbook.xml'
		)!;
		expect(workbook).toContain('name="Eventos &amp; más"');
	});
});

describe('toXLSX extra columns', () => {
	it('adds location and description', () => {
		const files = unzip(
			toXLSX(
				[
					{
						...timed('x', '2026-11-18T09:00', '2026-11-18T10:00'),
						location: 'Sala A',
						description: 'Notas'
					}
				],
				{
					timeZone
				}
			)
		);
		const sheet = files.get('xl/worksheets/sheet1.xml')!;
		expect(sheet).toContain('<t>location</t>');
		expect(sheet).toContain('<c r="I2" t="inlineStr"><is><t>Sala A</t></is></c>');
		expect(sheet).toContain('<c r="J2" t="inlineStr"><is><t>Notas</t></is></c>');
	});
});
