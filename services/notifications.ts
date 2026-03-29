import { StudioSettings } from '../types';

export interface NotificationPayload {
  clientName: string;
  clientPhone: string;
  serviceName?: string;
  startTime: string;
  notes?: string;
}

const formatMessage = (payload: NotificationPayload): string => {
  const date = new Date(payload.startTime);
  const dateStr = date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    `📌 *תור חדש נקבע!*\n` +
    `👤 *לקוחה:* ${payload.clientName}\n` +
    `📞 *טלפון:* ${payload.clientPhone}\n` +
    `💎 *שירות:* ${payload.serviceName || 'לא צוין'}\n` +
    `📅 *תאריך:* ${dateStr}\n` +
    `⏰ *שעה:* ${timeStr}` +
    (payload.notes ? `\n📝 *הערות:* ${payload.notes}` : '')
  );
};

/**
 * Send a notification to a Telegram bot.
 */
const sendTelegram = async (botToken: string, chatId: string, text: string): Promise<boolean> => {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
    const json = await res.json();
    if (!json.ok) {
      console.error('Telegram error:', json);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error sending Telegram notification:', err);
    return false;
  }
};

/**
 * Send a notification via EmailJS.
 */
const sendEmail = async (
  serviceId: string,
  templateId: string,
  publicKey: string,
  toEmail: string,
  payload: NotificationPayload
): Promise<boolean> => {
  try {
    const date = new Date(payload.startTime);
    const dateStr = date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: toEmail,
          client_name: payload.clientName,
          client_phone: payload.clientPhone,
          service_name: payload.serviceName || 'לא צוין',
          appointment_date: `${dateStr} בשעה ${timeStr}`,
          notes: payload.notes || ''
        }
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Error sending Email notification:', err);
    return false;
  }
};

/**
 * Main notification dispatcher — called after a new appointment is created.
 */
export const notifyAdmin = async (
  settings: StudioSettings,
  payload: NotificationPayload
): Promise<void> => {
  const promises: Promise<boolean>[] = [];

  // Telegram
  if (
    settings.enable_telegram_notifications &&
    settings.telegram_bot_token &&
    settings.telegram_chat_id
  ) {
    const message = formatMessage(payload);
    promises.push(sendTelegram(settings.telegram_bot_token, settings.telegram_chat_id, message));
  }

  // EmailJS
  if (
    settings.enable_email_notifications &&
    settings.emailjs_service_id &&
    settings.emailjs_template_id &&
    settings.emailjs_public_key &&
    settings.notification_email
  ) {
    promises.push(
      sendEmail(
        settings.emailjs_service_id,
        settings.emailjs_template_id,
        settings.emailjs_public_key,
        settings.notification_email,
        payload
      )
    );
  }

  // Google Calendar — sync is handled per-appointment via calendarService.
  // enable_calendar_sync is a flag used by the booking confirmation to trigger auto-sync.
  // In Booking.tsx we check this flag and call calendarService.syncAppointment.

  if (promises.length > 0) {
    const results = await Promise.all(promises);
    results.forEach((ok, i) => {
      if (!ok) console.warn(`Notification #${i} failed.`);
    });
  }
};
