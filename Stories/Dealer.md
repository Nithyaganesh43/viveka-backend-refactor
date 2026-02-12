

# Dealer Module – Core Concept & System Rules

## Purpose

The Dealer Module models **procurement from suppliers** and **dealer liabilities** in a clean, auditable, and scalable way.

Dealers are **not users of the system**.
They are **external suppliers** from whom the client purchases stock.

This module is the **single source of truth** for:

* Stock inflow
* Dealer purchase orders
* Dealer payable tracking
* Payment settlement history

---

## Core Design Principles

1. **Single Source of Truth**

   * Items exist once.
   * Stock exists once.
   * Financial totals are derived, never manually adjusted.

2. **Dealers Supply Items, They Do Not Own Stock**

   * Dealers never “have stock” in the system.
   * Stock belongs to the client only.
   * Dealers only increase stock through delivered orders.

3. **Orders Drive Stock**

   * Stock changes **only** when an order is marked delivered.
   * No delivery = no stock movement.

4. **Payments Drive Payable**

   * Dealer payable is calculated strictly from:

     ```
     payable = totalDeliveredOrderAmount − totalPayments
     ```
   * No manual balance edits.

---

## Core Entities and Their Responsibility

### Dealer

Represents a supplier.

* Belongs to exactly one client
* Can be active or inactive (soft delete)
* Has no authentication or system access
* Exists only for procurement and accounting

Dealers are permanent records; historical data is never lost.

---

### Item Group

Used only for classification and reporting.

* An item group contains many items
* An item belongs to exactly one item group

No dealer logic exists here.

---

### Item

Items represent **products the client sells or stocks**.

Rules:

* An item belongs to **one item group**
* An item can be supplied by **one or more dealers**
* This relationship is stored as:

  ```
  dealerIds: []
  ```

Why this matters:

* The same product may be bought from multiple dealers
* There must never be duplicate item records per dealer
* Stock must remain consistent regardless of supplier

Stock fields:

* `stock` → current quantity
* `lowStockQuantity` → alert threshold

These fields belong to the item, not the dealer.

---

## Dealer ↔ Item Relationship

Dealer-item mapping is **many-to-many**.

* A dealer can supply many items
* An item can be supplied by many dealers

This mapping:

* Does not create copies
* Does not affect stock
* Is only used to validate ordering and visibility

Dealer item lists are always **derived**, never stored.

---

## Dealer Order Lifecycle

Dealer orders represent **purchase intent**.

### 1. Order Creation (Pending)

* Dealer is selected
* Items and quantities are chosen
* Only quantity is stored
* No price is stored
* Stock is not affected

Status: `pending`

This mirrors real procurement: quantity agreed first, billing later.

---

### 2. Order Delivery (Critical Transition)

When an order is marked as delivered:

* Order status becomes `delivered`
* Item stock is incremented
* Dealer bill total (`totalAmount`) is recorded
* Optional payment due date is set
* Dealer payable increases

This is the **only moment** when:

* Stock increases
* Financial liability is created

No other operation may change stock.

---

### 3. Order Cancellation

* Only allowed when status is `pending`
* Cancelled orders:

  * Do not affect stock
  * Do not affect payable
  * Remain in history

This preserves audit integrity.

---

## Dealer Payments

Payments represent money paid **to the dealer**.

Rules:

* Payments always reduce payable
* Payments can optionally be linked to an order
* Multiple payments per order are allowed
* One payment can exist without an order (advance or settlement)

Payments never change stock.

---

## Order Payment Status (Derived)

Order payment state is **computed**, not stored.

Possible states:

* `no-bill` → delivered but bill not entered
* `pending` → bill entered, no payments
* `partial` → some payment made
* `paid` → fully settled

This logic enables:

* Accurate aging reports
* Pending payment tracking
* Clean accounting views

---

## Dealer Financial Model

Dealer financials are never stored as raw numbers.

They are always calculated from history.

* **Total Ordered** → sum of delivered order totals
* **Total Paid** → sum of payments
* **Payable** → total ordered − total paid

This guarantees:

* No drift
* No mismatch
* Full auditability

---

## Transactions & Audit Trail

Every financial event is immutable.

Transactions include:

* Delivered orders
* Payments

They are exposed as:

* Dealer-specific timeline
* Client-wide consolidated ledger

Nothing is overwritten.
Everything is traceable.

---

## Stock Integrity Rules (Non-Negotiable)

* Stock increases only on delivery
* Stock never depends on dealer
* Stock is global per item
* Multiple dealers delivering the same item affect the same stock

Breaking these rules breaks inventory consistency.

---

## Why This Design Works

* Mirrors real-world procurement exactly
* Prevents duplicate items and stock corruption
* Scales to multiple suppliers per product
* Keeps accounting accurate and auditable
* Separates operational flow from financial truth

---

## Summary

The Dealer Module is a **procurement and liability engine**, not a dealer-facing system.

* Items are global
* Dealers supply items
* Orders create stock and liability
* Payments settle liability
* Everything is derived from immutable history

If any future change violates these rules, it is **architecturally incorrect**.

---
 