/** Private tooling fixture; does nothing until explicitly called. */
export function registerEngineeringClick(target: EventTarget, onClick: () => void): () => void {
  target.addEventListener('click', onClick);
  return () => { target.removeEventListener('click', onClick); };
}
