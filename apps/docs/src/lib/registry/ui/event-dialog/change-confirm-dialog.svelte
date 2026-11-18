<script lang="ts">
  import { Button } from "#lib/registry/ui/button/index.js";
  import * as Dialog from "#lib/registry/ui/dialog/index.js";
  import { fillLabel, getCalendar } from "#lib/registry/lib/calendar-state.svelte.js";

  const calendar = getCalendar();
  const labels = $derived(calendar.labels);
  const request = $derived(calendar.changeRequest);

  // While mounted, drags and resizes wait for a confirmation here.
  $effect(() => calendar.registerConfirmDialog());

  const isMove = $derived(request?.kind !== "resize");
  const description = $derived(
    request
      ? fillLabel(isMove ? labels.confirmMoveDescription : labels.confirmResizeDescription, {
          title: request.event.title || labels.untitled,
          when: calendar.describe(request.event),
        })
      : "",
  );
</script>

<Dialog.Root
  open={request !== null}
  onOpenChange={(open) => {
    if (!open) void calendar.confirmChange(false);
  }}
>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>{isMove ? labels.confirmMoveTitle : labels.confirmResizeTitle}</Dialog.Title>
      <Dialog.Description>{description}</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button variant="outline" onclick={() => calendar.confirmChange(false)}
        >{labels.cancel}</Button
      >
      <Button onclick={() => calendar.confirmChange(true)}>
        {isMove ? labels.move : labels.change}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
