# Filter Todos by Status

## Overview
Users need to quickly focus on what matters — either just the tasks they haven't started yet,
or just the ones they've already finished — without manually scanning the full list.

## Acceptance Criteria

- When the user filters by "Active", only incomplete todos should be shown and the item count should reflect that.
- When the user filters by "Completed", only done todos should be shown.
- Switching back to "All" should restore the full unfiltered list with the correct count.

## Notes
- Filters are applied via the tab links (All / Active / Completed) at the bottom of the list.
- The item count badge always shows the number of *active* (incomplete) todos regardless of filter.
- Filtering does not delete or modify any todos — it only changes the view.
