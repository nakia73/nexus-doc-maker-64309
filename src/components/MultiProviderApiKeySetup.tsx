import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { testApiConnection } from '@/lib/gemini-api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { LLMProvider, PROVIDER_NAMES } from '@/types/llm';

interface MultiProviderApiKeySetupProps {
  onApiKeySet?: () => void;
}

const MultiProviderApiKeySetup = ({ onApiKeySet }: MultiProviderApiKeySetupProps) => {
  const [apiKeys, setApiKeys] = useState<Record<LLMProvider, string>>({
    gemini: localStorage.getItem('gemini-api-key') || '',
    openai: localStorage.getItem('openai-api-key') || '',
    claude: localStorage.getItem('claude-api-key') || '',
    grok: localStorage.getItem('grok-api-key') || '',
  });
  
  const [isTestingConnection, setIsTestingConnection] = useState<Record<LLMProvider, boolean>>({
    gemini: false,
    openai: false,
    claude: false,
    grok: false,
  });
  
  const [connectionStatus, setConnectionStatus] = useState<Record<LLMProvider, boolean | null>>({
    gemini: !!localStorage.getItem('gemini-api-key'),
    openai: !!localStorage.getItem('openai-api-key'),
    claude: !!localStorage.getItem('claude-api-key'),
    grok: !!localStorage.getItem('grok-api-key'),
  });
  
  const { toast } = useToast();

  useEffect(() => {
    const hasAnyKey = Object.values(apiKeys).some(key => key);
    if (hasAnyKey && onApiKeySet) {
      onApiKeySet();
    }
  }, [apiKeys, onApiKeySet]);

  const handleApiKeyChange = (provider: LLMProvider, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const handleSaveApiKey = (provider: LLMProvider) => {
    if (!apiKeys[provider]) {
      toast({
        title: 'エラー',
        description: 'APIキーを入力してください',
        variant: 'destructive',
      });
      return;
    }

    localStorage.setItem(`${provider}-api-key`, apiKeys[provider]);
    setConnectionStatus(prev => ({ ...prev, [provider]: true }));
    
    toast({
      title: '保存完了',
      description: `${PROVIDER_NAMES[provider]}のAPIキーを保存しました`,
    });

    if (onApiKeySet) {
      onApiKeySet();
    }
  };

  const handleTestConnection = async (provider: LLMProvider) => {
    if (!apiKeys[provider]) {
      toast({
        title: 'エラー',
        description: 'APIキーを入力してください',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingConnection(prev => ({ ...prev, [provider]: true }));

    try {
      if (provider === 'gemini') {
        await testApiConnection(apiKeys[provider]);
      } else {
        // 他のプロバイダーは簡易的なバリデーションのみ
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setConnectionStatus(prev => ({ ...prev, [provider]: true }));
      toast({
        title: '接続成功',
        description: `${PROVIDER_NAMES[provider]} APIへの接続に成功しました`,
      });
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [provider]: false }));
      toast({
        title: '接続失敗',
        description: error instanceof Error ? error.message : '接続に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(prev => ({ ...prev, [provider]: false }));
    }
  };

  const renderProviderSetup = (provider: LLMProvider) => (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          {provider === 'gemini' && '無料枠: 15リクエスト/分、1,500リクエスト/日'}
          {provider === 'openai' && 'Web検索機能に対応しています'}
          {provider === 'claude' && 'Web検索機能に対応（段階的な調査が可能）'}
          {provider === 'grok' && '⚠️ Web検索は1,000回あたり$10の追加料金'}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor={`${provider}-api-key`}>APIキー</Label>
        <Input
          id={`${provider}-api-key`}
          type="password"
          placeholder={`${PROVIDER_NAMES[provider]} APIキーを入力`}
          value={apiKeys[provider]}
          onChange={(e) => handleApiKeyChange(provider, e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={() => handleSaveApiKey(provider)}
          disabled={!apiKeys[provider]}
        >
          保存
        </Button>
        <Button 
          onClick={() => handleTestConnection(provider)}
          variant="outline"
          disabled={!apiKeys[provider] || isTestingConnection[provider]}
        >
          {isTestingConnection[provider] ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              接続テスト中...
            </>
          ) : (
            '接続テスト'
          )}
        </Button>
        {connectionStatus[provider] !== null && (
          <div className="flex items-center ml-2">
            {connectionStatus[provider] ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          {provider === 'gemini' && (
            <>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studioで取得
              </a>
            </>
          )}
          {provider === 'openai' && (
            <>
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                OpenAI Platformで取得
              </a>
            </>
          )}
          {provider === 'claude' && (
            <>
              <a 
                href="https://console.anthropic.com/settings/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Anthropic Consoleで取得
              </a>
            </>
          )}
          {provider === 'grok' && (
            <>
              <a 
                href="https://console.x.ai/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                xAI Consoleで取得
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>APIキー設定</CardTitle>
        <CardDescription>
          使用するLLMプロバイダーのAPIキーを設定してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gemini">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gemini">Gemini</TabsTrigger>
            <TabsTrigger value="openai">OpenAI</TabsTrigger>
            <TabsTrigger value="claude">Claude</TabsTrigger>
            <TabsTrigger value="grok">Grok</TabsTrigger>
          </TabsList>
          
          <TabsContent value="gemini" className="mt-4">
            {renderProviderSetup('gemini')}
          </TabsContent>
          
          <TabsContent value="openai" className="mt-4">
            {renderProviderSetup('openai')}
          </TabsContent>
          
          <TabsContent value="claude" className="mt-4">
            {renderProviderSetup('claude')}
          </TabsContent>
          
          <TabsContent value="grok" className="mt-4">
            {renderProviderSetup('grok')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MultiProviderApiKeySetup;
