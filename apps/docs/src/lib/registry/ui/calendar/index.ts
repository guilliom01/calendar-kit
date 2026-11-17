import Loading from './calendar-loading.svelte';
import Nav from './calendar-nav.svelte';
import NewEvent from './calendar-new-event.svelte';
import Root from './calendar-root.svelte';
import TimeZoneSelect from './calendar-time-zone-select.svelte';
import Title from './calendar-title.svelte';
import Toolbar from './calendar-toolbar.svelte';
import UndoRedo from './calendar-undo-redo.svelte';
import View from './calendar-view.svelte';
import ViewSwitcher from './calendar-view-switcher.svelte';

export {
	Root,
	View,
	Toolbar,
	Nav,
	Title,
	ViewSwitcher,
	NewEvent,
	UndoRedo,
	TimeZoneSelect,
	Loading,
	//
	Root as Calendar,
	View as CalendarView,
	Toolbar as CalendarToolbar,
	Nav as CalendarNav,
	Title as CalendarTitle,
	ViewSwitcher as CalendarViewSwitcher,
	NewEvent as CalendarNewEvent,
	UndoRedo as CalendarUndoRedo,
	TimeZoneSelect as CalendarTimeZoneSelect,
	Loading as CalendarLoading
};

export {
	CalendarState,
	defaultLabels,
	fillLabel,
	getCalendar,
	type CalendarLabels,
	type CalendarStateOptions,
	type EventChange,
	type ScopeRequest,
	type Selection,
	type ViewDefinition
} from '#lib/registry/lib/calendar-state.svelte.js';
