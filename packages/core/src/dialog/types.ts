/** A user action requesting that a controlled Dialog close. */
export type DialogCloseReason = 'escape' | 'outside' | 'close-button';

/** A request, not proof that the owner changed its open prop. */
export interface DialogCloseDetails {
  readonly open: false;
  readonly previousOpen: true;
  readonly reason: DialogCloseReason;
}
