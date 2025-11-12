import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateApiKey, testApiConnection } from "@/lib/gemini-api";
import { handleError, showSuccess, showLoading, dismissToast } from "@/lib/error-handler";

interface ApiKeySetupProps {
  onApiKeySet: () => void;
}

export default function ApiKeySetup({ onApiKeySet }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini-api-key') || '');
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    try {
      validateApiKey(apiKey);
      localStorage.setItem('gemini-api-key', apiKey);
      showSuccess('APIキーを保存しました');
      onApiKeySet();
    } catch (error) {
      handleError(error, 'APIキーの保存に失敗しました');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    const toastId = showLoading('接続をテスト中...');
    
    try {
      validateApiKey(apiKey);
      await testApiConnection(apiKey);
      dismissToast(toastId);
      showSuccess('接続テスト成功', 'APIキーは正常に動作しています');
    } catch (error) {
      dismissToast(toastId);
      handleError(error, '接続テストに失敗しました');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ステップ1: APIキー設定</CardTitle>
        <CardDescription>
          Gemini APIキーを入力してください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="AIza..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!apiKey}>
            保存
          </Button>
          <Button 
            onClick={handleTest} 
            variant="outline" 
            disabled={!apiKey || isTesting}
          >
            {isTesting ? '接続中...' : '接続テスト'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
