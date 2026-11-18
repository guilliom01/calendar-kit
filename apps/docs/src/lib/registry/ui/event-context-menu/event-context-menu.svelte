<script lang="ts" module>
  import type { CalendarEvent } from "@guilli/calendar-core";

  /** What the menu can do with its event. Actions the user may not do are missing. */
  export interface EventMenuActions {
    /** Opens the event, through `onEventClick` (the event dialog by default). */
    open: () => void;
    duplicate?: () => void;
    remove?: () => void;
    /** Moves the event to another of the state's `calendars`. */
    moveTo?: (calendarId: string) => void;
  }

  export interface EventMenuArgs {
    event: CalendarEvent;
    actions: EventMenuActions;
  }
</script>

<script lang="ts">
  import type { Snippet } from "svelte";
  import * as ContextMenu from "#lib/registry/ui/context-menu/index.js";
  import { getCalendar } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";

  interface Props {
    class?: string;
    /** The views. Right-clicking an event inside them opens the menu. */
    children: Snippet;
    /** Replaces the whole menu content. Render `ContextMenu.Item`s and call `actions`. */
    menu?: Snippet<[EventMenuArgs]>;
    /** Extra items, shown after the built-in ones and before Delete. */
    extra?: Snippet<[EventMenuArgs]>;
  }

  let { class: className, children, menu, extra }: Props = $props();

  const calendar = getCalendar();
  let open = $state(false);
  let target: EventMenuArgs | null = $state.raw(null);

  function actionsFor(event: CalendarEvent, nativeEvent: Event): EventMenuActions {
    return {
      open: () => calendar.clickEvent(event, nativeEvent),
      duplicate: calendar.editable ? () => void calendar.duplicate(event) : undefined,
      remove: calendar.canEdit(event, "delete") ? () => void calendar.remove(event.id) : undefined,
      moveTo:
        calendar.calendars.length && calendar.canEdit(event, "edit")
          ? (calendarId) => void calendar.update({ ...event, calendarId })
          : undefined,
    };
  }

  /**
   * Runs before the views: outside an event the menu stays closed and the browser menu shows.
   * The views run `onEventContextMenu` next; when it returns false the menu stays closed too.
   */
  function pick(nativeEvent: MouseEvent) {
    const id = (nativeEvent.target as Element).closest<HTMLElement>("[data-event-id]")?.dataset
      .eventId;
    const event = calendar.visibleEvents.find((candidate) => candidate.id === id);
    if (!event) {
      nativeEvent.stopPropagation();
      return;
    }
    target = { event, actions: actionsFor(event, nativeEvent) };
  }
</script>

<div class={cn("flex min-h-0 flex-1 flex-col", className)} oncontextmenucapture={pick}>
  <ContextMenu.Root bind:open>
    <ContextMenu.Trigger class="flex min-h-0 flex-1 flex-col select-auto">
      {@render children()}
    </ContextMenu.Trigger>
    <ContextMenu.Content class="w-52">
      {#if target}
        {@const { event, actions } = target}
        {#if menu}
          {@render menu(target)}
        {:else}
          <ContextMenu.Item onSelect={actions.open}>{calendar.labels.open}</ContextMenu.Item>
          {#if actions.duplicate}
            <ContextMenu.Item onSelect={actions.duplicate}>
              {calendar.labels.duplicate}
            </ContextMenu.Item>
          {/if}
          {#if actions.moveTo}
            {@const moveTo = actions.moveTo}
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger>{calendar.labels.moveToCalendar}</ContextMenu.SubTrigger>
              <ContextMenu.SubContent>
                {#each calendar.calendars as source (source.id)}
                  <ContextMenu.Item
                    disabled={source.id === event.calendarId}
                    onSelect={() => moveTo(source.id)}
                  >
                    <span
                      class="size-2.5 rounded-full bg-(--calendar-color)"
                      style:--calendar-color={source.color ?? "var(--primary)"}
                    ></span>
                    {source.title}
                  </ContextMenu.Item>
                {/each}
              </ContextMenu.SubContent>
            </ContextMenu.Sub>
          {/if}
          {@render extra?.(target)}
          {#if actions.remove}
            <ContextMenu.Separator />
            <ContextMenu.Item variant="destructive" onSelect={actions.remove}>
              {calendar.labels.delete}
            </ContextMenu.Item>
          {/if}
        {/if}
      {/if}
    </ContextMenu.Content>
  </ContextMenu.Root>
</div>
