# دليل التشغيل — ركز للحلول الذكية
# Operational Manual — Rakez Smart Solutions

**Version:** 1.0 | **Date:** June 2026

---

## Table of Contents

1. [Adding New Units and Verifying QR Codes](#1-adding-new-units-and-verifying-qr-codes)
2. [Managing User Accounts and Assigning Permissions](#2-managing-user-accounts-and-assigning-permissions)
3. [Tracking Requests and Reviewing Guest Ratings](#3-tracking-requests-and-reviewing-guest-ratings)
4. [Updating Logos, Colors, and Labels (Appearance Settings)](#4-updating-logos-colors-and-labels-appearance-settings)
5. [Role Reference](#5-role-reference)
6. [Workflow Quick Reference](#6-workflow-quick-reference)

---

## 1. Adding New Units and Verifying QR Codes

### 1.1 Add a New Property (if needed)

1. Sign in with an **Owner** or **Admin-Manager** account.
2. In the left sidebar, navigate to **Properties**.
3. Click **Add Property**.
4. Fill in:
   - **Name** — e.g., "Tower B"
   - **Type** — choose one of: `hotel`, `compound`, `tower`, `apartment`
   - **Address** and optional **Description**
5. Click **Save**. The property is immediately active.

### 1.2 Add a New Unit (Room)

1. Navigate to **Rooms** in the sidebar.
2. Click **Add Room**.
3. Fill in:
   - **Property** — select from the dropdown
   - **Room Name / Number** — e.g., "Unit 304"
   - **Type** — e.g., Studio, 1BR, 2BR, Suite
   - **Status** — set to `available`
   - **Price per Night** and **Capacity**
4. Click **Save**. The unit is now registered in the system.

### 1.3 Generate and Use the QR Code

Every unit automatically has a unique QR code generated from its ID. To access and distribute it:

1. Navigate to **Rooms** and find the unit.
2. Click on the unit to open its detail page.
3. Click the **QR Code** button (top-right area of the unit detail page).
4. A dialog appears showing:
   - A live preview of the QR code
   - The guest portal URL the QR code points to (format: `https://your-domain.replit.app/guest-portal/unit/{id}`)
5. Choose one of:
   - **Download PNG** — saves the QR code image to your device
   - **Print** — opens a print-ready window with the QR code and unit name
   - **Copy Link** — copies the direct URL to your clipboard
6. Affix the printed QR code inside the unit (door, welcome card, etc.).

**Verification:** Scan the QR code with any smartphone. It should open the Guest Portal for that specific unit, pre-filled with the unit name and property.

---

## 2. Managing User Accounts and Assigning Permissions

### 2.1 Navigate to User Management

1. Sign in with an **Owner** or **Admin-Manager** account.
2. Click **User Management** in the left sidebar.

### 2.2 Add a New User

1. Click **Add User** (top-right of the page).
2. Fill in the form:
   - **Display Name** — user's full name
   - **Username** — unique login identifier (no spaces)
   - **Password** — temporary password (user should change on first login)
   - **Phone Number** — optional, used for forgot-password verification
   - **Role** — choose from the role list (see Section 5 below)
3. Click **Save**. The user can now log in immediately.

### 2.3 Edit an Existing User

1. On the **User Management** page, find the user in the list.
2. Click the **Edit** icon (pencil) next to their name.
3. Update name, phone, or role as needed.
4. Click **Save Changes**.

> **Note:** You cannot change a user's username after creation. To correct a username, deactivate the old account and create a new one.

### 2.4 Deactivate a User

1. On the **User Management** page, click the **Deactivate** button next to the user.
2. Confirm the action. The user can no longer log in.
3. To reactivate, click **Activate** on the same row.

### 2.5 Assign Roles

Roles are assigned during user creation or editing. The system uses a three-tier hierarchy:

| Role | Permissions |
|------|------------|
| **Owner** | Full system access — all pages, all settings, all tenants (super-admin) |
| **Admin-Manager** | All operational pages + User Management + Appearance Settings |
| **Manager / Supervisor** | Field operations, maintenance, task assignment, team performance |
| **Front Desk** | Bookings, Rooms, Guests |
| **Housekeeping** | Rooms, housekeeping tasks |
| **Maintenance** | Maintenance page, maintenance tasks |
| **Security** | Security tasks only |

Changing a user's role takes effect immediately on their next page load (or after they re-login).

---

## 3. Tracking Requests and Reviewing Guest Ratings

### 3.1 How Guest Requests Are Created

1. A tenant/guest scans the QR code in their unit.
2. The Guest Portal opens (no login required).
3. The guest selects a service category (Electrical, Plumbing, Cleaning, etc.), enters a description, and (for compound/tower units) selects a preferred time slot.
4. On submission, the system:
   - Creates a **Work Order** with status `pending`
   - Generates a **Reference Code** (format: `URQ-{id}`) shown to the guest
   - Broadcasts an **in-app notification** to all supervisors and managers on the dashboard (visible in the bell icon 🔔)

### 3.2 Track Requests in the Dashboard

**Option A — Guest Requests page:**
1. Navigate to **Guest Requests** in the sidebar.
2. View all open and historical work orders submitted via QR portal.
3. Filter by property, status, or date.
4. Click a request to open it and update the status (`pending` → `in-progress` → `completed`).

**Option B — Maintenance / Work Orders page:**
1. Navigate to **Maintenance** in the sidebar.
2. All QR-submitted requests appear as work orders alongside manually created ones.
3. Assign a worker, set priority, and update status as work progresses.

### 3.3 Receiving the Push Notification

When a guest submits a request, the notification bell (🔔) in the dashboard header immediately shows a new badge. Click the bell to see:

- **Title:** "New Service Request — {Unit Name}"
- **Message:** Category and description snippet
- **Reference Code** for cross-referencing

Click **Mark as Read** on individual notifications, or **Mark All Read** to clear the badge.

### 3.4 How Guests Rate Completed Requests

Once the field worker updates a work order status to **completed**:

1. The guest returns to the Guest Portal (via the same QR code or their reference code URL).
2. The success screen now shows the request status as **Completed**.
3. A 5-star rating form automatically appears with an optional comment field.
4. The guest selects a star rating (1–5) and optionally enters a comment.
5. Clicks **Submit Rating**.

The rating is stored in the system linked to the unit. Ratings auto-refresh every 30 seconds, so if the guest keeps the portal open, the rating form appears automatically when status changes.

### 3.5 Review Guest Ratings

1. Navigate to **Guest Requests** in the sidebar.
2. Any request with a submitted rating shows a star indicator in the list.
3. Click a request to view the full rating and comment.

---

## 4. Updating Logos, Colors, and Labels (Appearance Settings)

### 4.1 Access Appearance Settings

1. Sign in with an **Owner** or **Admin-Manager** account.
2. Navigate to **Admin Settings** (or **Appearance Settings**) in the sidebar.

### 4.2 Update the Company Name and Logo Text

1. In the **Branding** section:
   - **Company Name** — displayed in reports and the PDF export header
   - **Logo Text** — displayed in the sidebar header (used when no image logo is uploaded)
2. Click **Save**. Changes appear immediately across all pages.

### 4.3 Upload a Logo Image

1. In the **Logo** section, click **Upload Logo**.
2. Select a PNG or SVG image (recommended: square, at least 128×128px).
3. The logo is stored and displayed in the sidebar header.

### 4.4 Change the Primary Color

1. In the **Colors** section, click the **Primary Color** swatch.
2. A color picker opens. Choose your brand color (hex or pick from palette).
3. Click **Apply**. The theme updates in real time — buttons, badges, and active states all update immediately.

### 4.5 Change the Sidebar Color

1. Click the **Sidebar Color** swatch.
2. Choose the background color for the left navigation panel.
3. The sidebar updates immediately.

### 4.6 Update Navigation Labels

1. In the **Navigation Labels** or **Menu** section, you can rename sidebar items (e.g., rename "Rooms" to "Units").
2. Click the edit icon next to each label.
3. Type the new label and press Enter.
4. Labels update immediately for all users.

> **Tip:** All appearance changes are stored in the database and persist across browser sessions and devices. There is no need to edit any code.

---

## 5. Role Reference

| Role ID | Display Name | Badge Color | Can Access |
|---------|-------------|-------------|-----------|
| `owner` | Owner | Gray | Everything |
| `admin-manager` | Admin-Manager | Indigo | All operational pages + User Mgmt + Settings |
| `manager` | Supervisor | Blue | Dashboard, Guest Requests, Maintenance, Tasks, Analytics |
| `supervisor` | Supervisor | Blue | Same as Manager |
| `front-desk` | Front Desk | Purple | Dashboard, Bookings, Rooms, Guests |
| `housekeeping` | Housekeeping | Green | Rooms, Tasks (housekeeping only) |
| `maintenance` | Maintenance | Orange | Maintenance, Tasks (maintenance only) |
| `security` | Security | Red | Tasks (security only) |

---

## 6. Workflow Quick Reference

### Complete a Service Request (End-to-End)

```
Guest scans QR
    ↓
Guest Portal opens (no login)
    ↓
Guest submits request (selects category + description)
    ↓
Work Order created (status: pending) + Notification fired to dashboard
    ↓
Supervisor/Manager sees bell notification → opens Guest Requests
    ↓
Assigns worker + sets status to "in-progress"
    ↓
Worker completes task → sets status to "completed"
    ↓
Guest refreshes portal → Rating form appears automatically (5 stars)
    ↓
Guest submits rating → stored in system
```

### Add a New Unit (Quick Steps)

```
Sidebar → Rooms → Add Room → Fill form → Save
    ↓
Open unit detail → QR Code button → Download / Print
    ↓
Affix QR code inside unit
```

### Add a New User (Quick Steps)

```
Sidebar → User Management → Add User
    ↓
Enter name, username, password, role → Save
    ↓
User can log in immediately
```

### Update Appearance (Quick Steps)

```
Sidebar → Admin Settings → Appearance
    ↓
Change logo text / upload image / pick colors → Apply
    ↓
Changes are live instantly — no code changes needed
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| QR code leads to "Unit Not Found" | Unit ID in URL doesn't match any room | Re-download QR from the unit detail page |
| Bell shows no notification after guest submits | Request went to wrong tenant | Check that unitId in the URL matches the property |
| Rating form doesn't appear | Work order status not yet "completed" | Supervisor must update status to completed first |
| User can't log in | Account deactivated, or wrong tenant slug | Re-activate in User Management; confirm login URL |
| Appearance changes not visible | Browser cache | Hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) |
| Colors reset on logout | Settings not saved | Click Save/Apply before navigating away |

---

*Prepared by the Rakez Smart Solutions technical team. For support, contact your system administrator.*
