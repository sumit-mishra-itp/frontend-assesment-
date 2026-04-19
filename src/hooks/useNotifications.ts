import { useCallback, useRef, useState } from 'react';
import type { NotificationItem, NotificationLevel } from '../types';

interface NotificationInput {
  message: string;
  level: NotificationLevel;
  source: string;
}

const DEDUP_WINDOW_MS = 3_000;
const AUTO_DISMISS_MS = 6_000;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [liveMessage, setLiveMessage] = useState<string>('');
  const dedupMap = useRef<Map<string, number>>(new Map());

  const dismissNotification = useCallback((id: string) => {
    setNotifications((currentQueue) => {
      return currentQueue.filter((notification) => notification.id !== id);
    });
  }, []);

  const enqueueNotification = useCallback(
    ({ message, level, source }: NotificationInput): boolean => {
      const dedupKey = `${level}:${source}:${message}`;
      const currentTime = Date.now();
      const previousTimestamp = dedupMap.current.get(dedupKey);

      if (previousTimestamp && currentTime - previousTimestamp < DEDUP_WINDOW_MS) {
        return false;
      }

      dedupMap.current.set(dedupKey, currentTime);

      const notification: NotificationItem = {
        id: `${currentTime}-${Math.trunc(Math.random() * 100_000)}`,
        message,
        level,
        source,
        createdAt: currentTime,
      };

      setNotifications((currentQueue) => {
        return [...currentQueue, notification].slice(-10);
      });
      setLiveMessage(message);

      window.setTimeout(() => {
        dismissNotification(notification.id);
      }, AUTO_DISMISS_MS);

      return true;
    },
    [dismissNotification],
  );

  return {
    notifications,
    liveMessage,
    enqueueNotification,
    dismissNotification,
  };
};
