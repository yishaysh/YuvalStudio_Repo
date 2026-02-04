import { Appointment } from '../types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

export const googleCalendarService = {
  tokenClient: null as any,

  isAuthenticated: () => {
    return !!sessionStorage.getItem('google_access_token');
  },

  init: (onTokenReceived: () => void) => {
    // Check if google script is loaded
    if (typeof window === 'undefined' || !(window as any).google) return;
    
    // @ts-ignore
    const google = (window as any).google;
    
    if (!CLIENT_ID) {
      console.warn('Google Client ID not found in environment variables (VITE_GOOGLE_CLIENT_ID)');
      return;
    }

    googleCalendarService.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          sessionStorage.setItem('google_access_token', tokenResponse.access_token);
          onTokenReceived();
        }
      },
    });
  },

  login: () => {
    if (!CLIENT_ID) {
      alert('חסר מזהה לקוח של גוגל (VITE_GOOGLE_CLIENT_ID)');
      return;
    }
    if (googleCalendarService.tokenClient) {
      googleCalendarService.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Attempt lazy init
      googleCalendarService.init(() => window.location.reload());
      if (googleCalendarService.tokenClient) {
         googleCalendarService.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
         alert('רכיב ההתחברות של גוגל טרם נטען. אנא רענן את הדף.');
      }
    }
  },

  logout: () => {
    sessionStorage.removeItem('google_access_token');
    // We don't necessarily revoke to avoid forcing consent screen every time, just clear session
  },

  createEvent: async (appt: Appointment, durationMinutes: number = 30) => {
    const token = sessionStorage.getItem('google_access_token');
    if (!token) throw new Error('AUTH_REQUIRED');

    const startTime = new Date(appt.start_time);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const event = {
      summary: `${appt.client_name} - ${appt.service_name || 'טיפול'}`,
      description: `טלפון: ${appt.client_phone}\nהערות: ${appt.notes || 'אין'}\n\nנוצר ע"י הסטודיו של יובל`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem('google_access_token');
        throw new Error('AUTH_EXPIRED');
      }
      const err = await response.json();
      throw new Error(err.error?.message || 'שגיאה ביצירת האירוע');
    }

    return response.json();
  }
};
