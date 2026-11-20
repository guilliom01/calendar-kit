<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { ChangeConfirmDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { GanttView } from "#lib/registry/ui/gantt-view/index.js";
  import { labels } from "./labels.js";

  const timeZone = "America/Lima";
  const day = today(timeZone);
  const task = (
    id: string,
    title: string,
    from: number,
    to: number,
    progress: number,
    dependsOn: string[] = [],
  ) => ({
    id,
    title,
    start: day.add({ days: from }),
    end: day.add({ days: to }),
    progress,
    dependsOn,
  });

  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone,
    labels,
    view: "gantt",
    // Tasks are events with `progress` (0 to 1) or `dependsOn` (ids drawn as arrows).
    events: [
      task("analysis", "Análisis", -3, 0, 1),
      task("design", "Diseño", 0, 3, 0.6, ["analysis"]),
      task("build", "Desarrollo", 3, 8, 0.2, ["design"]),
      task("testing", "Pruebas", 8, 11, 0, ["build"]),
    ],
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <!-- Drag a bar to move a task, drag its ends to change its length. -->
  <FullCalendar.View name="gantt"><GanttView class="flex-1" /></FullCalendar.View>
  <ChangeConfirmDialog />
</FullCalendar.Root>
