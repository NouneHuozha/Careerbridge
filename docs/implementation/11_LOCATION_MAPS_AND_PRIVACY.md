# 11. Location, Maps and Privacy

## 11.1 Target

Use Google Maps Platform for supported institution/campus maps, distance, travel-time and route guidance. Confirm exact APIs/products, key restrictions, billing and terms before integration.

## 11.2 Location data

Store institution/campus address, state, district, latitude/longitude, coordinate source, verification state and last-checked date. Prefer official institution data or verified geocoding. Keep institution and campus coordinates distinct.

## 11.3 Student location

General institution discovery does not require exact home address. If a student asks for nearby options or routes, request only the precision needed (for example, town/district or explicit location permission). Explain why location is used. Avoid retaining precise location unless necessary and approved.

## 11.4 Map features

Map pins represent verified campus locations. Route/distance/travel-time values must come from a successful provider response and include relevant mode/context. Do not invent travel time, transport availability or road conditions. If provider data is unavailable, show the location/address and explain that route data could not be retrieved.

## 11.5 Security and cost

Restrict browser API keys by allowed referrers and APIs. Keep server keys secret. Apply quotas, budget alerts and abuse protection. Do not expose unrestricted keys in repository docs.

## 11.6 Acceptance

Test correct campus pin, missing/uncertain coordinates, multi-campus institution, API failure, quota exhaustion, permission denial, no exact student location, route mode and responsive map accessibility.
