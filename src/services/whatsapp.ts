import type { Checkpoint, CheckpointEvent } from '../types/checkpoint';
import type { Trip } from '../types/trip';
import type { UnitSystem } from '../types/settings';
import { formatDistance, formatSpeed } from '../utils/formatting';
import { formatDurationWords } from '../utils/time';

export interface TemplateVariables {
  checkpoint: string;
  tripTime: string;
  distance: string;
  averageSpeed: string;
  date: string;
  time: string;
}

const VARIABLE_PATTERN = /\{(checkpoint|tripTime|distance|averageSpeed|date|time)\}/g;

/** Substitutes {checkpoint}, {tripTime}, {distance}, {averageSpeed}, {date}, {time} in a template string. */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(VARIABLE_PATTERN, (_match, key: keyof TemplateVariables) => variables[key]);
}

export function buildTemplateVariables(
  checkpoint: Checkpoint,
  event: CheckpointEvent,
  trip: Trip,
  units: UnitSystem
): TemplateVariables {
  const reachedAt = new Date(event.reachedAt);
  return {
    checkpoint: checkpoint.name,
    tripTime: formatDurationWords(event.elapsedSinceTripStartMs),
    distance: formatDistance(trip.distanceMeters, units),
    averageSpeed: formatSpeed(trip.averageSpeedMps ?? 0, units),
    date: reachedAt.toLocaleDateString(),
    time: reachedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

/**
 * Abstraction over "send a message when a checkpoint is reached", so a
 * future official WhatsApp Business API (or any other channel) integration
 * can be dropped in without touching checkpoint-detection logic anywhere
 * else in the app.
 */
export interface WhatsAppService {
  sendCheckpointMessage(checkpoint: Checkpoint, event: CheckpointEvent, trip: Trip, units: UnitSystem): Promise<void>;
}

/**
 * MVP implementation. A browser PWA cannot silently send a WhatsApp message
 * on the user's behalf — there is no such API, and any tool claiming
 * otherwise is not actually doing it in the background. Instead, this opens
 * a wa.me deep link with the recipient and message pre-filled; the user
 * still has to tap "send" inside WhatsApp. That confirmation step is a
 * WhatsApp/browser security boundary, not a bug in this app.
 */
export class DeepLinkWhatsAppService implements WhatsAppService {
  async sendCheckpointMessage(
    checkpoint: Checkpoint,
    event: CheckpointEvent,
    trip: Trip,
    units: UnitSystem
  ): Promise<void> {
    if (!checkpoint.whatsappEnabled || !checkpoint.whatsappPhone || !checkpoint.whatsappMessage) return;

    const variables = buildTemplateVariables(checkpoint, event, trip, units);
    const message = renderTemplate(checkpoint.whatsappMessage, variables);
    const url = buildWhatsAppDeepLink(checkpoint.whatsappPhone, message);

    // Opens WhatsApp (native app via the wa.me redirect on mobile, or
    // WhatsApp Web on desktop). This requires the browser to allow opening
    // a new tab/window from this context — call this from as close to the
    // checkpoint-detection event as possible to keep it inside the user's
    // implicit trust of an already-running trip, though it is not a true
    // user gesture and some browsers may still block the popup.
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function buildWhatsAppDeepLink(phoneDigitsOnly: string, message: string): string {
  const sanitizedPhone = phoneDigitsOnly.replace(/\D/g, '');
  return `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
}
