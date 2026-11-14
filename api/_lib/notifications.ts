import { escapeHtml } from '../../shared/validation';
import { formatILS } from '../../shared/money';
import type { Appointment, JewelryOrder, StudioSettings } from '../../types';
import type { NotificationDeliveryResult } from './types';

export interface NotificationDispatcher {
  sendAppointmentNotifications(appt: Appointment, settings: StudioSettings): Promise<NotificationDeliveryResult>;
  sendOrderNotifications(order: JewelryOrder, settings: StudioSettings): Promise<NotificationDeliveryResult>;
}

async function sendTelegram(botToken: string, chatId: string, text: string): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
  if (!res.ok) return false;
  const json = (await res.json().catch(() => null)) as any;
  return Boolean(json?.ok);
}

async function sendEmailJs(
  serviceId: string,
  templateId: string,
  publicKey: string,
  templateParams: Record<string, string>
): Promise<boolean> {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: templateParams,
    }),
  });
  return res.ok;
}

function resolveTelegramCreds(settings: StudioSettings) {
  const d = (settings.studio_details || {}) as Record<string, any>;
  const s = settings as Record<string, any>;
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || s.telegram_bot_token || d.telegram_bot_token || '').trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || s.telegram_chat_id || d.telegram_chat_id || '').trim();
  const flag = s.enable_telegram_notifications ?? d.enable_telegram_notifications;
  const enabled = Boolean((flag ?? (Boolean(process.env.TELEGRAM_BOT_TOKEN) && Boolean(process.env.TELEGRAM_CHAT_ID))) && botToken && chatId);
  return { enabled, botToken, chatId };
}

function resolveEmailCreds(settings: StudioSettings) {
  const d = (settings.studio_details || {}) as Record<string, any>;
  const s = settings as Record<string, any>;
  const serviceId = String(process.env.EMAILJS_SERVICE_ID || s.emailjs_service_id || d.emailjs_service_id || '').trim();
  const templateId = String(process.env.EMAILJS_TEMPLATE_ID || s.emailjs_template_id || d.emailjs_template_id || '').trim();
  const publicKey = String(process.env.EMAILJS_PUBLIC_KEY || s.emailjs_public_key || d.emailjs_public_key || '').trim();
  const toEmail = String(process.env.NOTIFICATION_EMAIL || s.notification_email || d.notification_email || d.email || '').trim();
  const flag = s.enable_email_notifications ?? d.enable_email_notifications;
  const enabled = Boolean((flag ?? (Boolean(process.env.EMAILJS_SERVICE_ID) && Boolean(process.env.EMAILJS_TEMPLATE_ID))) && serviceId && templateId && publicKey && toEmail);
  return { enabled, serviceId, templateId, publicKey, toEmail };
}

export const defaultNotificationDispatcher: NotificationDispatcher = {
  async sendAppointmentNotifications(appt, settings): Promise<NotificationDeliveryResult> {
    const tg = resolveTelegramCreds(settings);
    const em = resolveEmailCreds(settings);
    const result: NotificationDeliveryResult = {
      telegram: tg.enabled ? 'failed' : 'skipped',
      email: em.enabled ? 'failed' : 'skipped',
    };
    const errors: string[] = [];

    const dateObj = new Date(appt.start_time);
    const formattedDate = Number.isFinite(dateObj.getTime())
      ? `${dateObj.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })} בשעה ${dateObj.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}`
      : appt.start_time;

    if (tg.enabled) {
      const text = [
        '🗓️ <b>תור חדש נקבע ב-Yuval Studio</b>',
        `👤 <b>שם:</b> ${escapeHtml(appt.client_name)}`,
        `📞 <b>טלפון:</b> ${escapeHtml(appt.client_phone)}`,
        `✨ <b>טיפול:</b> ${escapeHtml(appt.service_name || 'כללי')}`,
        `📅 <b>מועד:</b> ${escapeHtml(formattedDate)}`,
        `💰 <b>מחיר:</b> ${escapeHtml(formatILS(appt.final_price ?? appt.price ?? 0))}`,
        appt.is_under_16 ? `🔞 <b>קטין/ה מתחת לגיל 16 — פרטי הורה אומתו</b>` : '',
      ]
        .filter(Boolean)
        .join('\n');
      try {
        const ok = await sendTelegram(tg.botToken, tg.chatId, text);
        result.telegram = ok ? 'sent' : 'failed';
        if (!ok) errors.push('Telegram API returned error');
      } catch (e: any) {
        result.telegram = 'failed';
        errors.push(e?.message || 'Telegram error');
      }
    }

    if (em.enabled) {
      try {
        const ok = await sendEmailJs(em.serviceId, em.templateId, em.publicKey, {
          to_email: em.toEmail,
          client_name: appt.client_name,
          client_phone: appt.client_phone || '',
          service_name: appt.service_name || 'כללי',
          appointment_date: formattedDate,
          final_price: formatILS(appt.final_price ?? appt.price ?? 0),
          notes: appt.notes || '',
        });
        result.email = ok ? 'sent' : 'failed';
        if (!ok) errors.push('EmailJS returned error');
      } catch (e: any) {
        result.email = 'failed';
        errors.push(e?.message || 'EmailJS error');
      }
    }

    if (errors.length > 0) result.error = errors.join('; ');
    return result;
  },

  async sendOrderNotifications(order, settings): Promise<NotificationDeliveryResult> {
    const tg = resolveTelegramCreds(settings);
    const result: NotificationDeliveryResult = {
      telegram: tg.enabled ? 'failed' : 'skipped',
      email: 'skipped',
    };

    if (tg.enabled) {
      const itemsText = (order.items || [])
        .map(i => `• ${escapeHtml(i.name)} ×${i.quantity} (${escapeHtml(formatILS(i.price * i.quantity))})`)
        .join('\n');
      const deliveryText =
        order.delivery_method === 'pickup'
          ? 'איסוף עצמי מהסטודיו'
          : `משלוח עד הבית: ${escapeHtml(order.shipping_address || '')}`;
      const text = [
        '💎 <b>הזמנת תכשיט חדשה (תיאום רכישה)</b>',
        `🔖 <b>מספר הזמנה:</b> ${escapeHtml(order.order_number)}`,
        `👤 <b>שם:</b> ${escapeHtml(order.client_name)}`,
        `📞 <b>טלפון:</b> ${escapeHtml(order.client_phone)}`,
        `🚚 <b>שיטה:</b> ${deliveryText}`,
        itemsText,
        `💰 <b>סה"כ לתשלום בתיאום:</b> ${escapeHtml(formatILS(order.total_price))}`,
      ].join('\n');

      try {
        const ok = await sendTelegram(tg.botToken, tg.chatId, text);
        result.telegram = ok ? 'sent' : 'failed';
        if (!ok) result.error = 'Telegram API returned error';
      } catch (e: any) {
        result.telegram = 'failed';
        result.error = e?.message || 'Telegram error';
      }
    }

    return result;
  },
};
