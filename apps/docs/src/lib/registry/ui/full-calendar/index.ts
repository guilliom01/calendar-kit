import Loading from "./full-calendar-loading.svelte";
import Nav from "./full-calendar-nav.svelte";
import NewEvent from "./full-calendar-new-event.svelte";
import Root from "./full-calendar-root.svelte";
import TimeZoneSelect from "./full-calendar-time-zone-select.svelte";
import Title from "./full-calendar-title.svelte";
import Toolbar from "./full-calendar-toolbar.svelte";
import UndoRedo from "./full-calendar-undo-redo.svelte";
import View from "./full-calendar-view.svelte";
import ViewSwitcher from "./full-calendar-view-switcher.svelte";

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
  Root as FullCalendar,
  View as FullCalendarView,
  Toolbar as FullCalendarToolbar,
  Nav as FullCalendarNav,
  Title as FullCalendarTitle,
  ViewSwitcher as FullCalendarViewSwitcher,
  NewEvent as FullCalendarNewEvent,
  UndoRedo as FullCalendarUndoRedo,
  TimeZoneSelect as FullCalendarTimeZoneSelect,
  Loading as FullCalendarLoading,
};

export {
  CalendarState,
  defaultLabels,
  fillLabel,
  getCalendar,
  type Answer,
  type CalendarLabels,
  type CalendarStateOptions,
  type EventChange,
  type ScopeRequest,
  type Selection,
  type ViewDefinition,
} from "#lib/registry/lib/calendar-state.svelte.js";
