// When any precached content changes, bump this version AND public/sw.js together.
// A previously active worker or registration.ready is not evidence of this revision.
export const EXPECTED_STATIC_CACHE = 'pushkara-static-prototype-v22';
export const STATIC_STATUS_MESSAGE = 'PUSHKARA_STATIC_STATUS_V22';

export function verifyStaticController(controller, timeoutMs = 1800) {
  if (
    !controller ||
    typeof controller.postMessage !== 'function' ||
    typeof MessageChannel !== 'function'
  )
    return Promise.resolve(false);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let finished = false;
    const finish = (verified) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      channel.port1.close();
      resolve(verified);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    channel.port1.onmessage = (event) => {
      const result = event.data;
      finish(
        !!result &&
          typeof result === 'object' &&
          result.type === STATIC_STATUS_MESSAGE &&
          result.version === EXPECTED_STATIC_CACHE &&
          result.complete === true,
      );
    };
    channel.port1.onmessageerror = () => finish(false);
    try {
      controller.postMessage({ type: STATIC_STATUS_MESSAGE }, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}
