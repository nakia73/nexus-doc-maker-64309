import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Send, User, Bot, ExternalLink, Download, Loader2 } from 'lucide-react';
import { uploadAndImportFile } from '@/lib/gemini-api';
import { chatWithLLM } from '@/lib/llm-api';
import { ChatMessage, LLMProvider, MODEL_OPTIONS, PROVIDER_NAMES } from '@/types/llm';
import type { FileSearchStore } from '@/types/gemini';

interface SimpleChatInterfaceProps {
  stores?: FileSearchStore[];
}

const SimpleChatInterface = ({ stores }: SimpleChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-exp');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [maxSearchUses, setMaxSearchUses] = useState(5);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const availableModels = MODEL_OPTIONS.filter(m => m.provider === selectedProvider);
  const currentModel = availableModels.find(m => m.id === selectedModel);

  useEffect(() => {
    const saved = localStorage.getItem('simple-chat-messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Failed to restore chat history:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('simple-chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedProvider === 'grok' && useWebSearch) {
      toast({
        title: "Grok Web Search料金について",
        description: "Web検索は1,000回あたり$10の追加料金が発生します。",
        duration: 5000,
      });
    }
  }, [selectedProvider, useWebSearch, toast]);

  useEffect(() => {
    const newModel = availableModels[0]?.id;
    if (newModel) {
      setSelectedModel(newModel);
    }
  }, [selectedProvider]);

  const handleProviderChange = (provider: LLMProvider) => {
    setSelectedProvider(provider);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const apiKey = localStorage.getItem(`${selectedProvider}-api-key`);
    if (!apiKey) {
      toast({
        title: 'エラー',
        description: `${PROVIDER_NAMES[selectedProvider]}のAPIキーが設定されていません`,
        variant: 'destructive',
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await chatWithLLM(
        {
          provider: selectedProvider,
          model: selectedModel,
          apiKey,
          webSearch: {
            enabled: useWebSearch,
            maxUses: selectedProvider === 'claude' ? maxSearchUses : undefined,
          },
        },
        inputValue,
        conversationHistory,
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        citations: response.citations,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'チャット中にエラーが発生しました';
      
      toast({
        title: 'エラー',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('simple-chat-messages');
    toast({
      title: 'チャットをクリア',
      description: 'チャット履歴を削除しました',
    });
  };

  const handleSaveToStore = async () => {
    if (!selectedStore || messages.length === 0) {
      toast({
        title: 'エラー',
        description: 'ストアを選択し、チャット履歴を作成してください',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const markdown = messages.map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        const timestamp = msg.timestamp.toLocaleString('ja-JP');
        return `## ${role} (${timestamp})\n\n${msg.content}\n`;
      }).join('\n---\n\n');

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const file = new File([blob], `chat-history-${Date.now()}.md`, { type: 'text/markdown' });

      await uploadAndImportFile(file, selectedStore);

      toast({
        title: '保存完了',
        description: 'チャット履歴をストアに保存しました',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'エラー',
        description: 'チャット履歴の保存に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>シンプルチャット</CardTitle>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">プロバイダー</Label>
              <Select value={selectedProvider} onValueChange={handleProviderChange}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="grok">Grok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">モデル</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {currentModel?.supportsWebSearch && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={useWebSearch}
                    onCheckedChange={setUseWebSearch}
                    id="web-search"
                  />
                  <Label htmlFor="web-search">Web検索を有効化</Label>
                </div>

                {selectedProvider === 'claude' && useWebSearch && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="max-uses">最大検索回数:</Label>
                    <Select 
                      value={maxSearchUses.toString()} 
                      onValueChange={(v) => setMaxSearchUses(parseInt(v))}
                    >
                      <SelectTrigger id="max-uses" className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3回</SelectItem>
                        <SelectItem value="5">5回</SelectItem>
                        <SelectItem value="10">10回</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {useWebSearch && (
                <div className="text-xs text-muted-foreground">
                  {selectedProvider === 'gemini' && (
                    <p>✓ Google Search統合で最新情報を検索</p>
                  )}
                  {selectedProvider === 'openai' && (
                    <p>✓ OpenAI Web Searchで引用付きの情報を取得</p>
                  )}
                  {selectedProvider === 'claude' && (
                    <p>✓ Claude Web Searchで段階的な調査が可能</p>
                  )}
                  {selectedProvider === 'grok' && (
                    <p>⚠️ 追加料金: 1,000回の検索あたり$10</p>
                  )}
                </div>
              )}
            </div>
          )}

          {stores && stores.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="保存先ストアを選択" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.name} value={store.name}>
                      {store.displayName || store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSaveToStore}
                disabled={!selectedStore || messages.length === 0 || isSaving}
                variant="outline"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    ストアに保存
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`flex flex-col gap-1 max-w-[80%] min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-lg p-3 max-w-full ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</p>
                  </div>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-col gap-1 p-2 bg-muted/50 rounded max-w-full">
                      <p className="text-xs font-medium">参照元:</p>
                      {msg.citations.map((citation, idx) => (
                        <a
                          key={idx}
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-start gap-1 min-w-0"
                        >
                          <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">
                              {citation.title || citation.url}
                            </div>
                            {citation.snippet && (
                              <div className="text-muted-foreground line-clamp-2">
                                {citation.snippet}
                              </div>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {msg.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isStreaming && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg p-3 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="space-y-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${PROVIDER_NAMES[selectedProvider]}に質問する... (Shift+Enterで改行)`}
            className="min-h-[100px] resize-none"
            disabled={isStreaming}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              className="flex-1"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  送信
                </>
              )}
            </Button>
            <Button
              onClick={handleClearChat}
              variant="outline"
              disabled={messages.length === 0 || isStreaming}
            >
              クリア
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleChatInterface;
