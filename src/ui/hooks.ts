import { useEffect, useRef } from "preact/hooks";

/** True until the component goes away. Check it after every await, so a finished screen does nothing more. */
export function useAlive(): { current: boolean } {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => void (alive.current = false);
  }, []);
  return alive;
}
