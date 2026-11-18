import { toTimeZone } from '@internationalized/date';
import { isAllDay } from '../events/queries.js';
import type { CalendarEvent } from '../events/types.js';
import { zip } from './zip.js';

export interface XlsxExportOptions {
	/** Times are written as local times in this zone. */
	timeZone: string;
	/** Name of the sheet (at most 31 characters). Default "Events". */
	sheetName?: string;
}

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';

/** XML text: escaped, and without the control characters XML does not allow. */
const xml = (text: string) =>
	text
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

const DAY_MS = 86_400_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** Excel's date number: days since 1899-12-30, the time of day as a fraction. */
function serial(date: { year: number; month: number; day: number }, hour = 0, minute = 0) {
	return (Date.UTC(date.year, date.month - 1, date.day, hour, minute) - EXCEL_EPOCH) / DAY_MS;
}

// Style indexes in styles.xml.
const BOLD = 1;
const DATE_TIME = 2;
const DATE = 3;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${MAIN}"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

type Cell = { text: string } | { number: number; style: number } | { boolean: boolean };

function cellXml(cell: Cell, ref: string, style?: number) {
	const s = style ? ` s="${style}"` : '';
	if ('text' in cell)
		return cell.text ? `<c r="${ref}" t="inlineStr"${s}><is><t>${xml(cell.text)}</t></is></c>` : '';
	if ('boolean' in cell) return `<c r="${ref}" t="b"><v>${cell.boolean ? 1 : 0}</v></c>`;
	return `<c r="${ref}" s="${cell.style}"><v>${cell.number}</v></c>`;
}

/**
 * Events as an Excel workbook (.xlsx), with no dependency: the same columns as `toCSV`, but
 * start and end are real dates Excel can sort and filter, and all_day is a boolean.
 */
export function toXLSX(
	events: readonly CalendarEvent[],
	{ timeZone, sheetName = 'Events' }: XlsxExportOptions
): Uint8Array<ArrayBuffer> {
	const header = ['id', 'title', 'start', 'end', 'all_day', 'rrule', 'resources', 'color'];
	const when = (value: CalendarEvent['start']): Cell => {
		if (!('hour' in value)) return { number: serial(value), style: DATE };
		const local = toTimeZone(value, timeZone);
		return { number: serial(local, local.hour, local.minute), style: DATE_TIME };
	};
	const rows: Cell[][] = events.map((event) => {
		const allDay = isAllDay(event);
		return [
			{ text: event.id },
			{ text: event.title },
			when(event.start),
			when(allDay ? event.end.subtract({ days: 1 }) : event.end),
			{ boolean: allDay },
			{ text: event.rrule ?? '' },
			{ text: (event.resourceIds ?? []).join('; ') },
			{ text: event.color ?? '' }
		];
	});

	const column = (index: number) => String.fromCharCode(65 + index);
	const sheetRows = [
		`<row r="1">${header.map((text, index) => cellXml({ text }, `${column(index)}1`, BOLD)).join('')}</row>`,
		...rows.map(
			(cells, index) =>
				`<row r="${index + 2}">${cells.map((cell, at) => cellXml(cell, `${column(at)}${index + 2}`)).join('')}</row>`
		)
	];
	const widths = [14, 32, 18, 18, 8, 24, 20, 12]
		.map(
			(width, index) =>
				`<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
		)
		.join('');
	const name = sheetName.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Events';

	return zip([
		[
			'[Content_Types].xml',
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
		],
		[
			'_rels/.rels',
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PACKAGE_RELS}"><Relationship Id="rId1" Type="${RELS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`
		],
		[
			'xl/workbook.xml',
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${MAIN}" xmlns:r="${RELS}"><sheets><sheet name="${xml(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`
		],
		[
			'xl/_rels/workbook.xml.rels',
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PACKAGE_RELS}"><Relationship Id="rId1" Type="${RELS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${RELS}/styles" Target="styles.xml"/></Relationships>`
		],
		['xl/styles.xml', STYLES],
		[
			'xl/worksheets/sheet1.xml',
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${MAIN}"><cols>${widths}</cols><sheetData>${sheetRows.join('')}</sheetData></worksheet>`
		]
	]);
}
