import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createFileSearchStore } from "@/lib/gemini-api";
import { handleError, showSuccess, showLoading, dismissToast } from "@/lib/error-handler";

interface StoreCreationProps {
  onStoreCreated: (storeName: string, displayName: string) => void;
  currentStore?: { name: string; displayName: string };
}

export default function StoreCreation({ onStoreCreated, currentStore }: StoreCreationProps) {
  const [storeName, setStoreName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    const toastId = showLoading('ストアを作成中...');

    try {
      const store = await createFileSearchStore(storeName);
      dismissToast(toastId);
      showSuccess('ストアを作成しました', store.displayName);
      onStoreCreated(store.name, store.displayName || storeName);
      setStoreName('');
    } catch (error) {
      dismissToast(toastId);
      handleError(error, 'ストアの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ステップ2: File Searchストア作成</CardTitle>
        <CardDescription>
          ファイルを保存するストアを作成します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="storeName">ストア名</Label>
          <Input
            id="storeName"
            placeholder="my-file-search-store"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            disabled={!!currentStore}
          />
        </div>
        <Button 
          onClick={handleCreate} 
          disabled={!storeName || isCreating || !!currentStore}
        >
          {isCreating ? '作成中...' : '作成'}
        </Button>
        {currentStore && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">作成済みストア:</p>
            <p className="text-sm text-muted-foreground">{currentStore.displayName}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
