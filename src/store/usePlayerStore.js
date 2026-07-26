import { create } from 'zustand';
import { createPlayerSlice, getTopArtists } from './slices/createPlayerSlice';
import { createLibrarySlice } from './slices/createLibrarySlice';

export { getTopArtists };

const usePlayerStore = create((set, get) => ({
  ...createPlayerSlice(set, get),
  ...createLibrarySlice(set, get),
}));

export default usePlayerStore;
