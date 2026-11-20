// Props rows several views share.
export const classOnly = [
  { name: "class", type: "string", description: "Extra classes for the root element." },
];
export const eventContentRow = {
  name: "eventContent",
  type: "Snippet<[CalendarEvent]>",
  description: "Replaces what is drawn inside each event; the element itself stays.",
};
export const eventRow = (args: string) => ({
  name: "event",
  type: `Snippet<[{ event, props, resizeProps, dragging${args} }]>`,
  description:
    "Replaces the whole event element. Spread props on yours to keep clicks, dragging, keyboard and ARIA; render resizeProps.start and .end inside it to keep resizing.",
});
export const dayHeaderRow = {
  name: "dayHeader",
  type: "Snippet<[{ day, isToday, props }]>",
  description: "Replaces the day header button. Spread props to keep opening the day.",
};
