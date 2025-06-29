import { useContext } from 'react';
import { useAppState as useAppStateContext } from '../context/AppStateContext.jsx';

export function useAppState() {
  return useAppStateContext();
}