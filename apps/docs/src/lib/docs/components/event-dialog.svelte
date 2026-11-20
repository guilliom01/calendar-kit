<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
</script>

<h2>Usage</h2>
<p>
  <code>EventDialog</code> creates, edits and deletes events (title, all-day, dates, repeat,
  resources, progress, color). <code>RecurrenceScopeDialog</code> asks whether a change to a
  recurring event applies to one, the following, or all occurrences. Without them, nothing opens:
  use the hooks to show your own UI.

  <code>ChangeConfirmDialog</code> asks before a drag or resize is saved (turn it off with
  <code>confirmChanges: false</code>). Each dialog registers itself when mounted: without
  <code>ChangeConfirmDialog</code>, changes save directly; without
  <code>RecurrenceScopeDialog</code>
  (or <code>resolveScope</code>), changes to a recurring event apply to that occurrence only. Its
  Repeat list offers shortcuts for the start date (every week on Tuesday, every month on the 3rd
  Tuesday…) and <strong>Custom…</strong>, which shows the full <code>recurrence-editor</code>
  (installed with the dialog). The <code>recurrence</code> snippet replaces the list with an editor of
  your own.
</p>
<h2>API reference</h2>
<PropsTable
  caption="EventDialog props"
  rows={[
    {
      name: "colors",
      type: "(string | undefined)[]",
      description: "Colors offered; undefined is the theme color.",
    },
    {
      name: "resources",
      type: "Resource[]",
      description: "Resources the event can be assigned to. Hidden when empty.",
    },
    {
      name: "recurrence",
      type: "Snippet<[{ value, setValue, start }]>",
      description: 'Replaces the "Repeat" select.',
    },
  ]}
/>
