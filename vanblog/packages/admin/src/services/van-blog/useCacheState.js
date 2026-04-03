import { useState } from 'react';
export const useCacheState = (init, key) => {
  const k = `bianblog-admin-${key}`;
  const [currValue, setCuttValue] = useState(JSON.parse(localStorage.getItem(k)) || init);
  return [
    currValue,
    (newValue) => {
      localStorage.setItem(k, JSON.stringify(newValue));
      setCuttValue(newValue);
    },
  ];
};
