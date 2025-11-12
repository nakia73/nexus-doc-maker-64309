import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryWithFileSearch } from "@/lib/gemini-api";
import { handleError, showLoading, dismissToast } from "@/lib/error-handler";

interface QueryTestProps {
  storeName?: string;
}

export default function QueryTest({ storeName }: QueryTestProps) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  const handleQuery = async () => {
    if (!question || !storeName) return;

    setIsQuerying(true);
    setResponse('');
    const toastId = showLoading('回答を生成中...');

    try {
      const result = await queryWithFileSearch(question, storeName);
      dismissToast(toastId);
      setResponse(result);
    } catch (error) {
      dismissToast(toastId);
      handleError(error, 'クエリの実行に失敗しました');
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ステップ4: クエリテスト</CardTitle>
        <CardDescription>
          アップロードしたファイルに対して質問します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question">質問</Label>
          <Textarea
            id="question"
            placeholder="このドキュメントについて教えてください"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={!storeName || isQuerying}
            rows={3}
          />
        </div>
        <Button 
          onClick={handleQuery} 
          disabled={!question || !storeName || isQuerying}
        >
          {isQuerying ? '送信中...' : '送信'}
        </Button>
        {!storeName && (
          <p className="text-sm text-destructive">
            先にストアを作成してください
          </p>
        )}
        {response && (
          <div className="mt-4 space-y-2">
            <Label>レスポンス:</Label>
            <div className="p-4 bg-muted rounded-md border">
              <p className="text-sm whitespace-pre-wrap">{response}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
