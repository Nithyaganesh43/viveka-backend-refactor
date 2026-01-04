This project is a mobile-first offline-capable billing and invoice management system designed for small to medium businesses such as automobile, electrical, and general trading enterprises. The application enables business owners to manage clients, items, invoices, payments, and pending dues using a simple, structured workflow while ensuring data reliability in low or no internet conditions.

The system follows an **offline-first architecture**, where all business operations—client creation, invoice generation, payment recording, and report viewing—work fully without internet connectivity. Data is stored locally on the device and queued for synchronization. When connectivity is available, the application securely syncs all changes to the central server, ensuring consistency and durability without interrupting business operations.

The backend is designed as the **single source of truth** and is responsible for authentication, device enforcement, synchronization, data validation, and reporting. User registration and login are handled via phone number OTP verification, eliminating password management. To maintain business security, the backend enforces a strict **one-user–one-device policy**, where only one active device session is allowed at any time, and new logins automatically invalidate previous sessions.

The backend exposes stateless REST APIs to manage users, devices, clients, items, invoices, payments, and reports. A dedicated sync mechanism handles bulk offline updates, conflict resolution, and incremental data pulls using timestamps. Business-critical entities such as invoices are protected with immutability rules after generation, ensuring financial correctness. Reporting and pending payment calculations are derived server-side to maintain accuracy across devices.

Overall, the backend is engineered for **reliability, data integrity, and scalability**, supporting real-world business constraints such as intermittent connectivity, single-device usage, and audit-safe billing operations. It provides a robust foundation that allows the application to function seamlessly in both offline and online environments while remaining extensible for future multi-branch or cloud analytics enhancements.

Phase 1 Abstract – Product & Backend Scope

This project is a **B2B billing product developed by isaii**, targeted exclusively at **business owners (clients)**. End customers (users) never interact with or see the application. The application is used only by the business owner or their authorized operator inside the shop.

In Phase 1, the system focuses on **fast in-shop billing, strict device control, and customer purchase history**, keeping the workflow minimal and reliable.

The client registers using **phone number–based OTP verification**, which is used **only once during account creation**. After successful verification, the client sets a password and provides their name and basic business details. All subsequent logins are password-based. The backend enforces a **one-account–one-device policy**, where logging in from a new device automatically logs out the previous device, ensuring account security and preventing misuse.

The client can **create and manage item groups (categories)** and perform full CRUD operations on both groups and items. This allows businesses like automobile or electrical shops to organize inventory logically for quick billing.

When a customer visits the shop, the client enters the **customer’s phone number** and adds purchased items to a cart from the preconfigured item list. The application calculates the total amount in real time. The client enters the paid amount:

* If **paid amount equals total**, the backend allows invoice generation.
* If **paid amount is less than total**, the invoice is **not generated** and the transaction is stored as an incomplete sale (no financial document issued).

Once generated, the invoice becomes immutable to preserve billing correctness.

The backend maintains **customer purchase history mapped strictly to the customer’s phone number**, allowing the client to view past purchases, billing frequency, and amounts for repeat customers. Customers do not require registration, login, or consent in Phase 1; the phone number acts only as an identifier for history tracking.

Overall, Phase 1 backend responsibilities include **authentication, device enforcement, item and group management, cart validation, invoice control, and customer history tracking**, forming a solid foundation for future phases like credit handling, pending payments, analytics, and multi-device roles.
