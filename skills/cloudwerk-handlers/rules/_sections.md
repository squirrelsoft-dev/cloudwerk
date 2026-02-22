# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Handler Patterns (handler)

**Impact:** CRITICAL
**Description:** Route handlers are the core of API development in Cloudwerk. Understanding the handler signature, response helpers, and binding access patterns is essential for building any API endpoint.

## 2. Middleware Patterns (middleware)

**Impact:** HIGH
**Description:** Middleware intercepts requests before handlers. Knowing the correct signature, data sharing patterns, and differences from Hono middleware prevents common integration issues.

## 3. Component Patterns (component)

**Impact:** HIGH
**Description:** Page and layout components have specific prop interfaces and conventions. Client components require special directives. Understanding renderer differences (hono-jsx vs react) prevents styling and behavior bugs.
