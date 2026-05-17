# Kanji Metadata Enrichment Design

## Goal

Fill `kanji_characters` metadata more completely, prioritizing these nullable columns:

- `meaning_ko`
- `meaning_ja`
- `example_ja`
- `example_ko`
- `sort_order`

The workflow must support human review before upload. Generated data is reviewed in batches of 20 characters, then approved rows are uploaded to Supabase.

## Scope

This work enriches existing rows already present in `public.kanji_characters`.

It does not:

- regenerate base character geometry fields such as `source`, `license`, `view_box_width`, `view_box_height`
- change `kanji_strokes`
- change category/group schema
- attempt full automation of publishing without review

## Data Sources

Existing local sources remain the base input:

- `data/import/kanjidic2.xml`
- `data/import/jlpt-kanji-source.json`
- existing generated metadata
- current Supabase `kanji_characters` rows

Generated enrichment is allowed for:

- Korean meanings
- Japanese meanings
- simple Japanese example sentences
- Korean translations of those example sentences

When existing metadata is ambiguous, the generator should use:

- `metadata.meaningEn`
- `jlpt_level`
- `japanese_school_level`
- `japanese_grade`
- the literal itself

## Output Shape

Create a reviewable local enrichment dataset separate from the current generated metadata file.

Recommended row shape:

```json
{
  "id": "u04e00",
  "literal": "一",
  "meaningKo": "하나, 한 번",
  "meaningJa": "ひとつ、いち",
  "exampleJa": "一つください。",
  "exampleKo": "하나 주세요.",
  "sortOrder": 1,
  "reviewStatus": "pending"
}
```

`sortOrder` should be deterministic and stable. Initial rule:

1. characters with `japanese_grade` first, ascending
2. then remaining characters with `jlpt_level`, ordered `N5 -> N4 -> N3 -> N2 -> N1`
3. ties by literal ascending

## Generation Rules

### Meanings

- `meaning_ko`:
  - short Korean gloss for the character
  - prefer 1 to 3 representative meanings
  - avoid dictionary-dump formatting
- `meaning_ja`:
  - short Japanese gloss
  - natural Japanese explanation, not romaji
  - prefer compact wording over exhaustive coverage

### Examples

- one short and simple sentence per character
- `example_ja` should be beginner-friendly and readable
- `example_ko` should be a natural translation of `example_ja`
- prefer sentences where the target character appears explicitly
- avoid unnatural or overly literary examples
- avoid sentences that require advanced context unless the character itself is advanced and unavoidable

### Review Safety

- if a generated meaning/example is too uncertain, leave that field null rather than inventing a low-confidence value
- keep all generated rows in a review file before any upload
- upload only reviewed rows

## Review Workflow

1. Generate enrichment rows locally.
2. Slice rows into batches of 20.
3. Present one batch to the user.
4. Apply requested corrections in the local review file.
5. Mark approved rows as reviewed.
6. Upload only approved rows to Supabase.

## Implementation Units

### 1. Enrichment generator

Add a script that builds a local review dataset from current metadata and deterministic ordering.

### 2. Batch review helper

Add a way to print or export the next 20 pending rows for human review.

### 3. Approved-row uploader

Add a script that updates only approved rows in `kanji_characters`.

## Error Handling

- If required local source files are missing, fail with a clear error.
- If Supabase credentials are missing, upload step must fail early.
- If an upload partially fails, stop and report the failing rows.

## Verification

Before claiming completion:

- regenerate the review dataset successfully
- confirm batch extraction returns 20 rows
- confirm uploader can target only reviewed rows
- verify produced JSON shape is valid

## Open Decisions Resolved

- meanings: generate aggressively, even when translation is needed
- examples: generate one short easy sentence per character
- review: user reviews 20 rows at a time before upload
