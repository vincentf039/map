declare global {
  interface Window {
    wpApiSettings: {
      root: string;
      nonce: string;
    };
  }

  type RawNotice = {
    id: number;
    date_created: string; // Apr 08, 2026
    city: string;
  };

  type Notice = {
    notice_week: number;
    services: number;
  };
}

export {};
