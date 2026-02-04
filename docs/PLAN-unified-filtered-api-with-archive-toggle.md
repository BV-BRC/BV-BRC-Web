# Unified Implementation Plan: Filtered APIs with Archive Toggle

## Summary

Implement three related features in a single PR:

1. **Shared filter-building infrastructure**
2. **Archive support for `enumerate_tasks_filtered`** with toggle
3. **New `query_app_summary_filtered` API** with toggle

The `include_archived` toggle allows clients to opt-in to archived task queries, maintaining backward compatibility and giving clients control over query scope/performance.

---

## API Changes (AppService.spec)

**Update SimpleTaskFilter structure:**

```
typedef structure {
    string start_time;
    string end_time;
    app_id app;
    string search;
    string status;
    bool include_archived;   /* NEW: when true, include ArchivedTask table */
} SimpleTaskFilter;
```

**Add new method:**

```
funcdef query_app_summary_filtered(SimpleTaskFilter simple_filter)
    returns (mapping<app_id app, int count> status);
```

---

## Implementation Phases

### Phase 1: Shared Infrastructure (SchedulerDB.pm)

**1.1 Add `_build_filter_conditions` helper**

```perl
sub _build_filter_conditions {
    my($self, $user_id, $simple_filter, $opts) = @_;
    # $opts->{exclude_app} = 1  → skip app filter (for app summary)
    # Returns ($where_clause, @params)
}
```

**1.2 Add `_should_include_archived` helper**

```perl
sub _should_include_archived {
    my($self, $simple_filter) = @_;
    return $simple_filter->{include_archived} ? 1 : 0;
}
```

### Phase 2: Update enumerate_tasks_filtered

**2.1 Add `get_filtered_archive_count`** - Redis-cached count (only called when include_archived=true)

**2.2 Update `enumerate_tasks_filtered`** - Conditional logic:
- If `include_archived=false` (default): query only Task table (current behavior)
- If `include_archived=true`: query both tables with pagination spanning

### Phase 3: Add query_app_summary_filtered

**3.1 Add `query_app_summary_filtered` in SchedulerDB.pm**
- If `include_archived=false`: query only Task table
- If `include_archived=true`: UNION ALL both tables

**3.2 Add wrapper in AppServiceImpl.pm** with Redis caching

### Phase 4: Regenerate clients

Run `make compile-typespec` to update generated clients.

---

## Files to Modify

| File | Changes |
|------|---------|
| `AppService.spec` | Add `include_archived` to SimpleTaskFilter, add `query_app_summary_filtered` |
| `lib/Bio/KBase/AppService/SchedulerDB.pm` | Add `_build_filter_conditions`, `_should_include_archived`, `get_filtered_archive_count`, update `enumerate_tasks_filtered`, add `query_app_summary_filtered` |
| `lib/Bio/KBase/AppService/AppServiceImpl.pm` | Add `query_app_summary_filtered` wrapper |

---

## Behavior Matrix

| include_archived | enumerate_tasks_filtered | query_app_summary_filtered |
|------------------|--------------------------|---------------------------|
| false (default) | Task only | Task only |
| true | Task + ArchivedTask | Task + ArchivedTask |

---

## Caching Strategy

| Scenario | Cache Key Includes | TTL |
|----------|-------------------|-----|
| Archive count (include_archived=true) | `archive_count:{filter_hash}` | 5 min |
| App summary (include_archived=false) | `app_summary:{filter_hash}:active` | 60 sec |
| App summary (include_archived=true) | `app_summary:{filter_hash}:all` | 60 sec |

---

## Testing Checklist

- [ ] `include_archived=false` returns only Task table data (backward compatible)
- [ ] `include_archived=true` returns data from both tables
- [ ] Pagination works correctly when spanning tables
- [ ] Filter conditions work identically on both tables
- [ ] Redis cache keys differentiate archived vs non-archived queries
- [ ] Default behavior (no include_archived specified) = false
- [ ] Combined filters + archive toggle work correctly

---

## Code References

### Current Implementation Locations

Based on the two source plans:

- `enumerate_tasks_filtered`: SchedulerDB.pm ~line 821+
- `query_app_summary`: SchedulerDB.pm ~lines 519-531
- `query_task_summary`: Uses UNION ALL pattern (reference for archive queries)
- API wrappers: AppServiceImpl.pm ~line 1223+ (enumerate), ~line 916 (app_summary)
- Spec: AppService.spec lines 104-112 (SimpleTaskFilter)

### Redis Caching Pattern

Already in use for `query_task_summary` and `query_app_summary`. Use `_redis_get_or_compute` method.
