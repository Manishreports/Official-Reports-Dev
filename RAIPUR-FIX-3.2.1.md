# Raipur Fix 3.2.1

- Raipur paste format is now: Plant, Location, Material No., Description, Qty.
- Old saved Raipur rows without Location automatically use MAIN for backward compatibility.
- Raipur Dispatch = Yes: Raipur ignored.
- Raipur Dispatch = No: Raipur included in Core Pending using entered SPlt and pasted Location.
- Raipur rows are shown first in Core Pending preview so 5/10/50 preview limits do not hide them.
- Total Stock Plan matching now receives the correct Raipur Location because Total Stock uses Plant + Location + Material No. as its key.
- No HO Stock, Supply, Dashboard, or other report calculation logic was changed.
