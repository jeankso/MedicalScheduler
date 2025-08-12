import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Bell, X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  targetRole?: string;
  isActive: boolean;
  createdAt: string;
}

export default function NotificationBanner() {
  const { user, isAuthenticated } = useAuth();
  const [dismissedNotifications, setDismissedNotifications] = useState<number[]>([]);

  // Fetch active notifications for the user's role
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications/active', user?.role],
    enabled: isAuthenticated && !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Filter notifications based on user role and dismissal status
  const relevantNotifications = notifications?.filter((notification: Notification) => {
    // Check if notification is for this user's role or for all users
    const isForUserRole = !notification.targetRole || notification.targetRole === user?.role;
    const isNotDismissed = !dismissedNotifications.includes(notification.id);
    return notification.isActive && isForUserRole && isNotDismissed;
  }) || [];

  const dismissNotification = (notificationId: number) => {
    setDismissedNotifications(prev => [...prev, notificationId]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  if (!isAuthenticated || !user || relevantNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {relevantNotifications.map((notification: Notification) => (
        <Card key={notification.id} className={`${getNotificationColors(notification.type)} border-l-4`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getNotificationIcon(notification.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{notification.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {notification.type === 'error' ? 'Erro' : 
                       notification.type === 'warning' ? 'Aviso' : 
                       notification.type === 'success' ? 'Sucesso' : 'Info'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(notification.id)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}