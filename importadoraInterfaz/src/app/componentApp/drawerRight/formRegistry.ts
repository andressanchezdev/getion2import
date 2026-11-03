// formRegistry · qué formulario o detalle se abre en el panel derecho para cada acción
// conecta con: drawerRegistry (modo «form»), FormDrawerBody (lo pinta) y navigation (DrawerFormKind, openDrawerForm); las entradas viven en entries/ agrupadas por área (personas, inventario y operación)
import type { DrawerForm, DrawerFormKind } from '@/features/navigation'
import { INVENTORY_ENTRIES } from './entries/inventory.entries'
import { OPERATIONS_ENTRIES } from './entries/operations.entries'
import { PEOPLE_ENTRIES } from './entries/people.entries'
import type { FormEntry } from './entries/formEntry.types'

// ojo: el tipo Record obliga a que cada DrawerFormKind tenga su entrada; si se agrega una acción nueva y falta aquí, no compila
const ENTRIES = { ...PEOPLE_ENTRIES, ...INVENTORY_ENTRIES, ...OPERATIONS_ENTRIES } as Record<DrawerFormKind, FormEntry>

export const getFormEntry = (form: DrawerForm): FormEntry => ENTRIES[form.kind]
