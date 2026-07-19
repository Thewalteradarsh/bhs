import { useState, useEffect } from 'react';

export default function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update the value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // If the value changes BEFORE the delay completes, clear the timer and restart
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
