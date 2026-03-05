export {};

declare global {
  interface MidtransSnap {
    pay: (token: string) => void;
  }

  interface Window {
    snap?: MidtransSnap;
  }
}
