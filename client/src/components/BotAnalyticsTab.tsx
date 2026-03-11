import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, TrendingUp, Search, Users, Clock, Bot, ChevronRight, BarChart3 } from 'lucide-react';

const INTENT_LABELS: Record<string, string> = {
  search_menu: 'Menu Search',
  store_info: 'Store Info',
  delivery_info: 'Delivery Info',
  greeting: 'Greeting',
  hours: 'Business Hours',
  loyalty: 'Loyalty Programme',
  workshop: 'Workshops',
  event: 'Events',
  complaint: 'Complaint',
  order_help: 'Order Help',
  pricing: 'Pricing',
  blog: 'Blog',
  general: 'General',
};

const INTENT_COLORS: Record<string, string> = {
  search_menu: 'bg-blue-100 text-blue-800',
  store_info: 'bg-green-100 text-green-800',
  delivery_info: 'bg-orange-100 text-orange-800',
  greeting: 'bg-gray-100 text-gray-800',
  hours: 'bg-purple-100 text-purple-800',
  loyalty: 'bg-yellow-100 text-yellow-800',
  workshop: 'bg-pink-100 text-pink-800',
  event: 'bg-indigo-100 text-indigo-800',
  complaint: 'bg-red-100 text-red-800',
  order_help: 'bg-teal-100 text-teal-800',
  pricing: 'bg-emerald-100 text-emerald-800',
  blog: 'bg-cyan-100 text-cyan-800',
  general: 'bg-slate-100 text-slate-800',
};

export function BotAnalyticsTab() {
  const [period, setPeriod] = useState('7');
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);

  const { data: stats, isLoading } = trpc.chatAnalytics.getStats.useQuery(
    { days: parseInt(period) },
    { refetchInterval: 30000 }
  );

  const { data: convDetail } = trpc.chatAnalytics.getConversation.useQuery(
    { conversationId: selectedConvId! },
    { enabled: !!selectedConvId }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalConversations = stats?.totalConversations || 0;
  const totalMessages = stats?.totalMessages || 0;
  const avgMessagesPerConv = totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : '0';
  const topIntents = stats?.topIntents || [];
  const topSearches = stats?.topSearches || [];
  const dailyUsage = stats?.dailyUsage || [];
  const recentConversations = stats?.recentConversations || [];

  // Simple bar chart using CSS
  const maxDailyCount = Math.max(...dailyUsage.map((d: any) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" /> Maami Bot Analytics
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track what your customers are asking about
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">{totalConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Messages/Conv</p>
                <p className="text-2xl font-bold">{avgMessagesPerConv}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Search className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Menu Searches</p>
                <p className="text-2xl font-bold">{topSearches.reduce((sum: number, s: any) => sum + s.count, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Chart + Top Intents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" /> Daily Usage
            </CardTitle>
            <CardDescription>Messages per day</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyUsage.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No bot conversations yet in this period</p>
                <p className="text-sm mt-1">Data will appear once customers start chatting</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dailyUsage.map((day: any) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max((day.count / maxDailyCount) * 100, 8)}%` }}
                      >
                        <span className="text-xs font-medium text-primary-foreground">{day.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Intents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" /> What Customers Ask About
            </CardTitle>
            <CardDescription>Top topics from bot conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {topIntents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No intent data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topIntents.slice(0, 8).map((intent: any, i: number) => {
                  const totalIntentMsgs = topIntents.reduce((sum: number, t: any) => sum + t.count, 0);
                  const pct = totalIntentMsgs > 0 ? ((intent.count / totalIntentMsgs) * 100).toFixed(0) : 0;
                  return (
                    <div key={intent.intent} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-6 text-muted-foreground">{i + 1}.</span>
                      <Badge variant="secondary" className={`${INTENT_COLORS[intent.intent] || 'bg-gray-100 text-gray-800'} shrink-0`}>
                        {INTENT_LABELS[intent.intent] || intent.intent}
                      </Badge>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-primary/20 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{intent.count}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Menu Searches + Recent Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Menu Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" /> Top Menu Searches
            </CardTitle>
            <CardDescription>What customers search for in the menu</CardDescription>
          </CardHeader>
          <CardContent>
            {topSearches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No menu searches yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topSearches.slice(0, 10).map((search: any, i: number) => (
                  <div key={search.query} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}.</span>
                      <span className="text-sm font-medium">"{search.query}"</span>
                    </div>
                    <Badge variant="outline">{search.count} searches</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" /> Recent Conversations
            </CardTitle>
            <CardDescription>Click to view full conversation</CardDescription>
          </CardHeader>
          <CardContent>
            {recentConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentConversations.slice(0, 10).map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors border"
                  >
                    <div className="p-1.5 bg-primary/10 rounded-full shrink-0">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {conv.userName || 'Anonymous'}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {conv.messageCount} msgs
                        </Badge>
                        {conv.channel === 'voice' && (
                          <Badge variant="secondary" className="text-xs shrink-0">Voice</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.preview}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(conv.startedAt).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversation Detail Dialog */}
      <Dialog open={!!selectedConvId} onOpenChange={(open) => !open && setSelectedConvId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation with {convDetail?.conversation?.userName || 'Anonymous'}
            </DialogTitle>
          </DialogHeader>
          {convDetail?.messages && (
            <div className="space-y-3 mt-4">
              {convDetail.messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs opacity-70">
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      {msg.role === 'user' && msg.intents && (
                        <div className="flex gap-1 flex-wrap">
                          {(Array.isArray(msg.intents) ? msg.intents : [msg.intents]).map((intent: string) => (
                            <Badge key={intent} variant="secondary" className={`text-xs ${INTENT_COLORS[intent] || ''}`}>
                              {INTENT_LABELS[intent] || intent}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {msg.role === 'assistant' && msg.productsShown > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {msg.productsShown} products shown
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
