import { create } from 'zustand'

type UnsavedChangesStore = {
  isDirty: boolean
  setDirty: (dirty: boolean) => void
}

export const useUnsavedChanges = create<UnsavedChangesStore>((set) => ({
  isDirty: false,
  setDirty: (dirty: boolean) => set({ isDirty: dirty }),
}))
