import { LocalNotifications } from '@capacitor/local-notifications';

// A pomodoro's whole point is that you stop looking at it. Once the app is off
// screen Android throttles then freezes the WebView, and may kill the process
// outright, so the JS interval cannot be what tells you the session ended. The
// deadline is handed to the OS instead, and taken back when the app returns.

const SESSION_ID = 1;
const CHANNEL_ID = 'tempo-sessions';

// What just finished, not what comes next — the notification arrives at the end
// of the session it was scheduled for.
const COPY = {
  focus: { title: 'Lap complete', body: 'Focus session done — take the break.' },
  short: { title: 'Break over', body: 'Back to it.' },
  long: { title: 'Long break over', body: 'New set. Back to it.' },
};

let channelReady = false;
let permissionGranted = null; // null until asked

/** True once the OS has agreed to show notifications; false if it refused. */
export async function ensurePermission() {
  if (permissionGranted !== null) return permissionGranted;
  try {
    let status = await LocalNotifications.checkPermissions();
    if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
      status = await LocalNotifications.requestPermissions();
    }
    permissionGranted = status.display === 'granted';
  } catch {
    // No plugin (plain web build) or the call is unsupported here.
    permissionGranted = false;
  }
  return permissionGranted;
}

async function ensureChannel() {
  if (channelReady) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Session end',
      description: 'Fires when a focus session or break runs out.',
      // 4 = HIGH: makes a sound and shows a heads-up banner, which is the
      // whole point — a silent tray entry would be missed.
      importance: 4,
      visibility: 1,
      vibration: true,
    });
    channelReady = true;
  } catch {
    /* createChannel is Android-only; elsewhere the default channel applies */
  }
}

/**
 * Hand the running session's deadline to the OS.
 * @param {{mode: 'focus'|'short'|'long', endAt: number, task?: string|null}} run
 */
export async function scheduleSessionEnd({ mode, endAt, task }) {
  if (!(endAt > Date.now())) return;
  if (!(await ensurePermission())) return;
  await ensureChannel();
  const copy = COPY[mode] || COPY.focus;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: SESSION_ID,
          channelId: CHANNEL_ID,
          title: copy.title,
          body: mode === 'focus' && task ? task + ' — done. Take the break.' : copy.body,
          // Without this Doze can hold the alarm back, and a pomodoro that
          // arrives late is worse than useless.
          schedule: { at: new Date(endAt), allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* scheduling unavailable; the in-app chime still covers the foreground */
  }
}

/** Drop any pending session notification — the app is back, or the run stopped. */
export async function cancelSessionEnd() {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: SESSION_ID }] });
  } catch {
    /* nothing scheduled, or no plugin here */
  }
}
