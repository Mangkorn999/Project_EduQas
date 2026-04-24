# Scoring & Ranking

Implements SRS2.0 FR-CRIT (criteria + weights), FR-DASH (dashboard
analytics), and FR-RANK (rankings). Formulas, snapshots, thresholds.

## 1. Criteria, Weights, Snapshots `[P1]`

- Each form has a set of `EvaluationCriteria` (preset + custom).
- Each criterion has a `weight` (numeric, the scale is arbitrary; only
  relative magnitudes matter).
- When a form transitions from `draft` to `open`, the system snapshots
  its criteria into form-scoped rows (FR-CRIT-08). Subsequent template
  edits do not affect the snapshot (FR-TMPL-10).
- Snapshot storage: `evaluation_criteria` rows with `form_id` set
  (see `db-schema.md` §6.1).

## 2. Question → Criterion Mapping `[P1]`

- Each `form_questions` row has an optional `criterion_id`.
- Questions contribute to scoring only if:
  - `criterion_id` is set, AND
  - the question type is numeric-capable: `rating`, `scale_5`,
    `scale_10`, `number`, or `boolean` (treated as 0 / 1), AND
  - the answer is non-null.
- `long_text` and `short_text` with the "Feedback" semantic are
  explicitly excluded (FR-CRIT-06).

## 3. Score Formulas

### 3.1 Criterion score per response `[P1]`

For one user's response and one criterion:

```
scoreCriterionResponse = average(
  normalize(question_i.answer) for question_i in form_questions
  where question_i.criterion_id = C
    and question_i.type is numeric-capable
    and answer is non-null
)
```

Normalization: map each question's scale to `[0, 1]`. For example,
`scale_5` → `value / 5`, `scale_10` → `value / 10`, `rating` (1-5) →
`(value - 1) / 4`, `boolean` → `value ? 1 : 0`.

### 3.2 Form score per response `[P1]`

Weighted average across criteria:

```
scoreFormResponse =
    sum(weight_c * scoreCriterionResponse_c) /
    sum(weight_c)   for all criteria c with at least one scorable answer
```

### 3.3 Form score per website `[P1]`

Average of form-response scores that passed the response threshold:

```
scoreForm = average(scoreFormResponse for all submitted, non-deleted responses)
```

### 3.4 Website score `[P1]` baseline, `[P2]` round-aware

- Phase 1: `scoreWebsite = scoreForm` for the most recent closed form
  on that `website_target_id` in the selected round (or the most
  recent overall if no round filter).
- Phase 2: `scoreWebsite(round)` enables cross-round comparison and
  the trend chart (FR-DASH-06).

### 3.5 Dimension scores `[P1]`

Grouped by criterion. For each preset dimension (Design, Usability,
Content, Performance, Mobile, Feedback), show the average
`scoreCriterionResponse` across responses. Feedback dimension is
text-only and shows representative comments only.

All scores are displayed on a 0–100 scale (multiply by 100) and
rounded to 1 decimal in UI.

## 4. Response Rate `[P1]`

```
responseRate(form) = countSubmitted / countExpected
```

Where `countExpected` is the count of users matching:

- faculty scope: users in `owner_faculty_id` with role in
  `form_target_roles`.
- university scope: all active PSU users (with opt-out flag if/when
  added; out of scope for Phase 1).

`responseRate` displayed as a percentage in dashboard (FR-DASH-03).

## 5. Minimum Response Threshold `[P1]` policy config, `[P2]` applied to ranking

- Store in a `system_config` row: `ranking_min_responses` (default 5).
- Websites below the threshold are:
  - Shown on the dashboard with a "below threshold" badge.
  - Excluded from ranking outputs (FR-RANK-08) or marked as
    "insufficient data."

## 6. Ranking Queries `[P2]`

All ranking queries accept filters: `roundId`, `facultyId`,
`category`, `academicYear`. SQL outlines (simplified):

- **Top 10** — `ORDER BY scoreWebsite DESC LIMIT 10` (FR-RANK-01).
- **Bottom 5** — `ORDER BY scoreWebsite ASC LIMIT 5` (FR-RANK-02).
- **Most Improved** — compare `scoreWebsite(current_round) -
  scoreWebsite(previous_round)`, keep positive deltas, order by delta
  desc (FR-RANK-03).
- **Percentile** —
  `percent_rank() OVER (PARTITION BY scope ORDER BY scoreWebsite)`.

Cross-faculty ranking only available to `super_admin` and `executive`
(FR-RANK-05, FR-RANK-06).

## 7. Faculty × Dimension Heatmap `[P2]`

Grid of rows = faculties, columns = dimensions (Design, Usability,
Content, Performance, Mobile). Cell value = average
`scoreCriterionResponse` for that faculty's websites filtered by the
active round / year.

- Color scale is divergent around the median (NFR-ACCESS-05 contrast).
- Always rendered with a `<table>` alternative (NFR-ACCESS-07).

## 8. Trend `[P2]`

Per website (or per faculty aggregate), plot `scoreWebsite` per closed
round in chronological order. Minimum two rounds before the trend
appears (FR-DASH-06).

## 9. Caching & Materialization

Scoring queries are read-heavy. Strategy:

- Phase 1: compute on the fly inside `/api/v1/dashboard/*` endpoints.
  DB indices on `responses(form_id)` and `response_answers(response_id,
  question_id)` keep this fast at Phase 1 scale.
- Phase 2: introduce a materialized view `mv_website_scores` refreshed
  nightly (and on-close of a round). Ranking endpoints read from it.

## 10. Edge Cases

| Case | Behavior |
|---|---|
| Form has no numeric criteria | Score = null; show "no score" in UI |
| All answers null for a criterion | Criterion excluded from weighted average that request |
| Weight sum = 0 | Score = null; surface warning on form publish |
| Response has `submittedAt` null | Excluded from scoring (treated as in-progress) |
| Form soft-deleted | Excluded from dashboard but kept in responses for history |
| Website soft-deleted | Keep historic scores visible in round archive; hidden from live dashboard |
| Conflicting rounds (same website, same round) | Sum inside the round; dedup by form id |

## 11. Manual Tags `[P2]`

FR-DASH-12 allows admin-curated "strengths" and "improvement areas."
Data model and UI deferred to the Phase 2 design pass; table sketch
only:

```
CREATE TABLE website_score_notes (
  id UUID PK,
  website_target_id UUID NOT NULL REFERENCES website_targets(id),
  round_id UUID REFERENCES evaluation_rounds(id),
  kind TEXT NOT NULL CHECK (kind IN ('strength','improvement')),
  note TEXT NOT NULL,
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
