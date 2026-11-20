<script lang="ts">
  import { today, toZoned } from "@internationalized/date";
  import type { Resource } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { TimelineView } from "#lib/registry/ui/timeline-view/index.js";
  import { labels } from "./labels.js";

  // Rooms and people. `parentId` groups them; groups collapse in the timeline.
  const resources: Resource[] = [
    { id: "rooms", title: "Salas" },
    { id: "room-a", title: "Sala A", parentId: "rooms", color: "oklch(0.6 0.15 250)" },
    { id: "room-b", title: "Sala B", parentId: "rooms", color: "oklch(0.6 0.2 300)" },
    { id: "team", title: "Equipo" },
    { id: "ana", title: "Ana", parentId: "team", color: "oklch(0.65 0.15 150)" },
    { id: "luis", title: "Luis", parentId: "team", color: "oklch(0.7 0.15 70)" },
  ];

  const timeZone = "America/Lima";
  const day = today(timeZone);
  const at = (hour: number) => toZoned(day, timeZone).set({ hour });

  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone,
    labels,
    view: "resources",
    events: [
      // An event belongs to every resource in `resourceIds`.
      {
        id: "review",
        title: "Revisión",
        start: at(9),
        end: at(11),
        resourceIds: ["room-a", "ana"],
      },
      {
        id: "demo",
        title: "Demo al cliente",
        start: at(11),
        end: at(12),
        resourceIds: ["room-b", "luis"],
      },
      { id: "focus", title: "Tiempo de foco", start: at(14), end: at(16), resourceIds: ["ana"] },
    ],
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <FullCalendar.ViewSwitcher class="ms-auto" />
  </FullCalendar.Toolbar>
  <!-- One column per resource for the day; drag an event to another column to reassign it. -->
  <FullCalendar.View name="resources">
    <TimeGrid class="flex-1" {resources} scrollToHour={8} />
  </FullCalendar.View>
  <!-- Resources as rows across the week. -->
  <FullCalendar.View name="timeline">
    <TimelineView class="flex-1" {resources} />
  </FullCalendar.View>
</FullCalendar.Root>
