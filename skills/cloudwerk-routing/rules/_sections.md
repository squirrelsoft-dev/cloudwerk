# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Route Files (files)

**Impact:** CRITICAL
**Description:** Cloudwerk uses special filenames in the `app/` directory to define routes. Understanding which file type to use and their conventions is essential for building any Cloudwerk application.

## 2. Dynamic Parameters (params)

**Impact:** HIGH
**Description:** Dynamic route segments, catch-all routes, and route groups control URL matching and layout organization. Using the correct syntax ensures proper parameter extraction and route resolution.

## 3. Data Loading (data)

**Impact:** HIGH
**Description:** Loaders, actions, and the context API provide server-side data fetching and mutation handling. Correct usage ensures data flows properly between server and components.
