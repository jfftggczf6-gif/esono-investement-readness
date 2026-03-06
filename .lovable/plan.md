

## Problem

In `MODULE_CONFIG` (EntrepreneurDashboard.tsx lines 28-29), the labels are swapped:
- `inputs` module → labeled "Plan Financier Intermédiaire" (wrong — should be "Inputs Financiers")  
- `framework` module → labeled "Plan Financier Final" (wrong — should be "Plan Financier Intermédiaire")

The `framework` module generates `framework_data` deliverable (the rich financial analysis), which IS the "Plan Financier Intermédiaire". The `inputs` module just collects raw financial data.

Meanwhile, `plan_ovo` (Plan Financier Final) is missing from `MODULE_CONFIG` entirely — it has no module card in the bottom bar but exists as a deliverable.

## Plan

**File: `src/components/dashboard/EntrepreneurDashboard.tsx`**

1. **Fix MODULE_CONFIG labels** (lines 28-29):
   - `inputs` → title/shortTitle: "Inputs Financiers" (step 4)
   - `framework` → title/shortTitle: "Plan Financier Intermédiaire" (step 5)
   - Add `plan_ovo` module with title "Plan Financier Final", icon `ListChecks`, color `bg-amber-100 text-amber-600`, step 6
   - Bump `business_plan` to step 7, `odd` to step 8

2. **Add `plan_ovo` to `delivTypeMap`** (line 286) — already present, just verify.

3. **Add `plan_ovo` to `fnMap`** (line 144) — already present, just verify.

4. **Ensure `ListChecks` icon is imported** — already imported on line 11.

This aligns the bottom module bar with the deliverable naming convention and puts the framework deliverable under the correct "Plan Financier Intermédiaire" module card.

