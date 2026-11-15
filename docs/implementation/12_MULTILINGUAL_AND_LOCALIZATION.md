# 12. Multilingual and Localization

## 12.1 Planned languages

English, Hindi and Manipuri. Plan the architecture for all three; do not claim full translation until each relevant interface/content set is reviewed.

## 12.2 UI localization

Use stable message keys, locale-aware formatting, translation review and fallback rules. Avoid embedding user-visible copy in business logic. Keep labels, validation, navigation, accessibility text, empty/error states and emails/notifications within localization scope where implemented.

## 12.3 Content language

Store source language and translation status. Preserve official source text/reference. A translated explanation is not itself an official source. Do not imply an official notice exists in a language when it does not.

## 12.4 Search

Evaluate transliteration, spelling variants, mixed-language queries and regional terminology. Preserve canonical entity identifiers regardless of display language. Do not create duplicate catalogue records for translated names.

## 12.5 AI language handling

Detect or ask preferred response language where appropriate. Evaluate language-specific query understanding and retrieval. Preserve citations to original documents. Mark translated/summarised content as an explanation. Use human review for high-impact terminology and eligibility wording.

## 12.6 Quality

Test native-speaker review, terminology consistency, line wrapping, fonts, screen-reader output, mixed-script search and fallback behaviour. Track untranslated content instead of silently presenting an incorrect translation.
