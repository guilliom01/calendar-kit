import type { CalendarEvent, Resource } from "../events/types.js";

export interface ResourceRow<R extends Resource = Resource> {
  resource: R;
  /** Nesting level, 0 for top-level resources. */
  depth: number;
  hasChildren: boolean;
}

/**
 * Resources as rows, each parent followed by its children (in input order), skipping the
 * children of `collapsed` parents. Resources whose parent is missing are treated as top-level.
 */
export function flattenResources<R extends Resource>(
  resources: readonly R[],
  collapsed: ReadonlySet<string> = new Set(),
): ResourceRow<R>[] {
  const ids = new Set(resources.map((resource) => resource.id));
  const children = new Map<string | undefined, R[]>();
  for (const resource of resources) {
    const parent = resource.parentId && ids.has(resource.parentId) ? resource.parentId : undefined;
    children.set(parent, [...(children.get(parent) ?? []), resource]);
  }

  const rows: ResourceRow<R>[] = [];
  const visit = (parent: string | undefined, depth: number) => {
    for (const resource of children.get(parent) ?? []) {
      const hasChildren = children.has(resource.id);
      rows.push({ resource, depth, hasChildren });
      if (hasChildren && !collapsed.has(resource.id)) visit(resource.id, depth + 1);
    }
  };
  visit(undefined, 0);
  return rows;
}

/** Events assigned to `resourceId`. */
export function eventsForResource<T extends CalendarEvent>(
  events: readonly T[],
  resourceId: string,
) {
  return events.filter((event) => event.resourceIds?.includes(resourceId));
}
