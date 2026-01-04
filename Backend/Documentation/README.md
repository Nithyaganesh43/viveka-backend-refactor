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
