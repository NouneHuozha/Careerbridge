# 8. Data Ingestion and Refresh Jobs

## 8.1 Purpose

Implement a controlled source-to-publication pipeline. Scraping or importing is not the same as verification or publication.

## 8.2 Components

Source registry; source adapters; scheduler; fetch worker; raw document/response store where permitted; parser/normalizer; validator; duplicate/change detector; candidate-change store; review workflow; publisher; index refresh; job monitor.

## 8.3 Adapter contract

Each adapter declares source identity, permitted method, request policy, parser version, supported record types, expected fields, freshness expectation and failure categories. Do not create a generic scraper that ignores source-specific terms or structure.

## 8.4 Job contract

Each job has stable ID, source ID, scheduled/manual trigger, start/end, status, attempt count, parser version, fetched document reference, counts, safe error summary and retry parent. Jobs must be idempotent and bounded.

## 8.5 Pipeline

Fetch → persist retrieval metadata → parse → normalize → validate → compare → candidate update → review → publish → dependent index refresh → audit. A failed stage must be visible and recoverable.

## 8.6 Scheduling

Use per-source/category schedules based on urgency and source behaviour. Apply jitter, rate limits, backoff and concurrency caps. Do not run all sources at once or repeatedly hammer failed sources. Near-deadline daily checks are a target where source rules and resources permit, not a universal guarantee.

## 8.7 Safe updates

Never interpret empty parse, 404, timeout or parser breakage as a deletion. Deletion/archive requires explicit evidence and review. Preserve last-known-good data. Store raw source version/hash where permitted for comparison.

## 8.8 Review thresholds

Material eligibility, fee, deadline, course availability, recognition and scholarship benefit changes require review. Automate only after evidence and confidence policy is documented and tested.

## 8.9 Reprocessing

Allow safe reparse with a new parser version. Keep previous candidate results and publication history. Reprocessing must not duplicate records or silently change published facts.

## 8.10 Monitoring

Track source success rate, staleness, parser errors, candidate counts, review backlog, publication latency and index refresh failures. Alert on repeated failure or high-risk stale data.
