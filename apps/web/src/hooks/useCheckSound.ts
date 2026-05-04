import { useRef, useEffect } from 'react';
import { playSound } from '../utils/sounds';

export function useCheckSound(isInCheckNow: boolean): void {
  const prevRef = useRef(false);
  useEffect(() => {
    if (isInCheckNow && !prevRef.current) {
      playSound('check');
    }
    prevRef.current = isInCheckNow;
  }, [isInCheckNow]);
}
