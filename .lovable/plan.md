

## Problem

Your enterprise is registered as **"eco build"** in the database, but your uploaded documents are about **MORINGA GOLD TOGO**. All AI modules use the enterprise name from the database record, so they generate content for "Eco Build" instead of "Moringa Gold Togo".

The Plan Financier Final (plan_ovo) correctly shows "MORINGA GOLD TOGO" because it happened to extract the name from document content, but the other modules (Business Plan, ODD, etc.) rely on the enterprise name field.

There is currently no way to edit the enterprise name after creation.

## Solution

### 1. Add enterprise edit capability in `EntrepreneurDashboard.tsx`
- Add an "Edit" button next to the enterprise name in the header
- Open a dialog allowing the user to modify: name, sector, country, city, legal form, description
- Save changes via `supabase.from('enterprises').update(...)`

### 2. Update the enterprise name
Once the edit feature is built, you can rename "eco build" to "MORINGA GOLD TOGO" and regenerate the modules that need updating.

### 3. (Optional) Make AI modules smarter about name detection
In the shared `verifyAndGetContext` helper, we could add logic to detect the company name from uploaded documents when it differs from the enterprise record. However, fixing the source data (enterprise name) is the cleaner approach.

### Files to modify
- **`src/components/dashboard/EntrepreneurDashboard.tsx`** — Add edit enterprise dialog with name/sector/country/city/legal form fields and update logic

