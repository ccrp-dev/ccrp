---
sidebar_position: 3
---

# CCRP Query Syntax Specification

The CCRP API allows clients to select data based on various dimensions using a
flexible query string syntax. Constraints on different dimensions are combined
with a logical `AND` (via `&`). The filtering logic for a single dimension is
defined by its operator.

## 1. The Default Operator: Equality

If no operator is specified, equality is assumed. This is the simplest and most
common case.

* **Syntax:** `?<dimension>=<value>`
* **Example:** `?band=C07`
* **Meaning:** Select data where the `band` dimension is exactly equal to `C07`.

## 2. Range Operators for Continuous Dimensions

For continuous dimensions like time, coordinates, or price, range selections
are critical.

### Shorthand Slice Notation (Preferred for Ranges)

This syntax is inspired by Python/NumPy slicing and is the most concise way to
express a range. The format is `start:end`, which is inclusive of the start and
exclusive of the end.

* **Syntax:** `?<dimension>=<start>:<end>`
* **Example:** `?y=1000:3000`
* **Meaning:** Select data where `y >= 1000 AND y < 3000`.

### Explicit Inequality Operators

For open-ended ranges or more explicit control, standard inequality operators
are supported using bracket notation `[op]`.

* **Syntax:**
  * `?<dimension>[gte]=<value>` (Greater Than or Equal To)
  * `?<dimension>[gt]=<value>` (Greater Than)
  * `?<dimension>[lte]=<value>` (Less Than or Equal To)
  * `?<dimension>[lt]=<value>` (Less Than)
* **Examples:**
  * `?price[gte]=20.00` (`price >= 20.00`)
  * `?time[gt]=2023-01-01T00:00:00Z` (`time > 2023-01-01T00:00:00Z`)
  * `?error_rate[lt]=0.05` (`error_rate < 0.05`)

## 3. Set Operators for Discrete/Categorical Dimensions

For discrete or categorical dimensions, you often need to select multiple
specific values or exclude certain values.

### Set Inclusion (Logical OR)

To select data where a dimension matches any of a list of values, use
comma-separated values. This implies a logical `OR`.

* **Syntax:** `?<dimension>=<value1>,<value2>,<value3>`
* **Example:** `?status=completed,shipped`
* **Meaning:** Select data where `status` is `completed` OR `shipped`.

### Set Exclusion (Logical NOT IN)

To exclude data where a dimension matches any of a list of values, use the
`[nin]` (not in) operator.

* **Syntax:** `?<dimension>[nin]=<value1>,<value2>`
* **Example:** `?category[nin]=internal,test`
* **Meaning:** Select data where `category` is NOT `internal` AND NOT `test`.

## Combining Operators

Multiple constraints on different dimensions are combined with a logical `AND`.

* **Example:** `?band=C07&y=1000:3000&price[gte]=20.00`
* **Meaning:** Select data where `band` is `C07` AND `y` is between `1000`
  (inclusive) and `3000` (exclusive) AND `price` is greater than or equal to
  `20.00`.
