
import { Appointment } from '../types';

const CLIENT_ID = '759724009388-ioarr6mlm21tm3gbdnfehquakdc1bg06.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

let tokenClient: any;

const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${GSI_SCRIPT}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

export const calendarService = {
  async initClient() {
    await loadGsiScript();
    
    return new Promise<void>((resolve) => {
      // @ts-ignore
      if (window.google && window.google.accounts) {
        // @ts-ignore
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.access_token) {
              const expiry = Date.now() + (response.expires_in * 1000);
              localStorage.setItem('g_access_token', response.access_token);
              localStorage.setItem('g_token_expiry', expiry.toString());
            }
          },
        });
        resolve();
      } else {
        // Fallback or retry if script loaded but google global not ready
        setTimeout(() => this.initClient().then(resolve), 500);
      }
    });
  },

  async getAccessToken(): Promise<string> {
    if (!tokenClient) await this.initClient();

    const storedToken = localStorage.getItem('g_access_token');
    const storedExpiry = localStorage.getItem('g_token_expiry');

    // Return cached token if valid (with 1 min buffer)
    if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry) - 60000) {
      return storedToken;
    }

    // Trigger popup flow
    return new Promise((resolve, reject) => {
      try {
        // Override callback for this request to resolve the promise
        // @ts-ignore
        tokenClient.callback = (resp: any) => {
          if (resp.error) {
            reject(resp);
          } else {
            const expiry = Date.now() + (resp.expires_in * 1000);
            localStorage.setItem('g_access_token', resp.access_token);
            localStorage.setItem('g_token_expiry', expiry.toString());
            resolve(resp.access_token);
          }
        };
        // @ts-ignore
        tokenClient.requestAccessToken({ prompt: '' }); // '' to skip consent if possible, or 'consent'
      } catch (e) {
        reject(e);
      }
    });
  },

  async syncAppointment(appt: Appointment, durationMinutes = 30): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      const startTime = new Date(appt.start_time);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      const event = {
        summary: `${appt.client_name} - ${appt.service_name || 'טיפול'}`,
        description: `Phone: ${appt.client_phone}\nNotes: ${appt.notes || 'None'}\n\nSynced via Yuval Studio App`,
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
        const errorData = await response.json();
        // Handle token expiry explicitly if needed, though GSI usually handles session
        if (response.status === 401) {
            localStorage.removeItem('g_access_token');
            throw new Error('Token expired. Please try again.');
        }
        throw new Error(errorData.error?.message || 'Failed to create event');
      }

      return await response.json();
    } catch (error) {
      console.error("Google Calendar Sync Error:", error);
      throw error;
    }
  }
};
