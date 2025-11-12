import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Plus, FolderOpen } from "lucide-react";
import { createFileSearchStore, listFileSearchStores } from "@/lib/gemini-api";
import { handleError, showSuccess, showLoading, dismissToast } from "@/lib/error-handler";
import type { FileSearchStore } from "@/types/gemini";

interface StoreManagementProps {
  onStoreSelected: (storeName: string, displayName: string) => void;
  currentStore?: { name: string; displayName: string };
}

export default function StoreManagement({ onStoreSelected, currentStore }: StoreManagementProps) {
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // コンポーネントマウント時にストア一覧を取得
  useEffect(() => {
    console.log('[StoreManagement] コンポーネントマウント - ストア一覧を読み込みます');
    loadStores();
  }, []);

  const loadStores = async () => {
    console.log('[StoreManagement.loadStores] ストア一覧の読み込みを開始');
    setIsLoading(true);
    
    try {
      console.log('[StoreManagement.loadStores] listFileSearchStores()を呼び出し');
      const storeList = await listFileSearchStores();
      
      console.log('[StoreManagement.loadStores] 取得したストア一覧:', storeList);
      setStores(storeList);
      
      // ストアがない場合は作成フォームを自動的に表示
      if (storeList.length === 0) {
        console.log('[StoreManagement.loadStores] ストアが存在しないため、作成フォームを表示');
        setShowCreateForm(true);
      } else {
        console.log('[StoreManagement.loadStores] ストアが存在します - 件数:', storeList.length);
      }
      
      showSuccess('ストア一覧を読み込みました', `${storeList.length}件のストアを取得`);
    } catch (error) {
      console.error('[StoreManagement.loadStores] ストア一覧の読み込みに失敗:', error);
      handleError(error, 'ストア一覧の取得に失敗しました');
      
      // エラーが発生した場合も作成フォームを表示
      console.log('[StoreManagement.loadStores] エラーのため作成フォームを表示');
      setShowCreateForm(true);
    } finally {
      setIsLoading(false);
      console.log('[StoreManagement.loadStores] ストア一覧の読み込み完了');
    }
  };

  const handleCreate = async () => {
    console.log('[StoreManagement.handleCreate] 新しいストアの作成を開始 - ストア名:', newStoreName);
    
    if (!newStoreName || newStoreName.trim() === '') {
      console.error('[StoreManagement.handleCreate] エラー: ストア名が空です');
      handleError(
        new Error('ストア名を入力してください'),
        'ストア名を入力してください'
      );
      return;
    }
    
    setIsCreating(true);
    const toastId = showLoading('ストアを作成中...');

    try {
      console.log('[StoreManagement.handleCreate] createFileSearchStore()を呼び出し');
      const store = await createFileSearchStore(newStoreName);
      
      console.log('[StoreManagement.handleCreate] ストア作成成功:', store);
      
      dismissToast(toastId);
      showSuccess('ストアを作成しました', store.displayName);
      
      // 作成したストアを選択
      console.log('[StoreManagement.handleCreate] 作成したストアを選択');
      onStoreSelected(store.name, store.displayName || newStoreName);
      
      // フォームをリセット
      setNewStoreName('');
      setShowCreateForm(false);
      
      // ストア一覧を再読み込み
      console.log('[StoreManagement.handleCreate] ストア一覧を再読み込み');
      await loadStores();
    } catch (error) {
      console.error('[StoreManagement.handleCreate] ストアの作成に失敗:', error);
      dismissToast(toastId);
      handleError(error, 'ストアの作成に失敗しました');
    } finally {
      setIsCreating(false);
      console.log('[StoreManagement.handleCreate] ストア作成処理完了');
    }
  };

  const handleStoreSelect = (storeName: string) => {
    console.log('[StoreManagement.handleStoreSelect] ストアを選択:', storeName);
    
    const selectedStore = stores.find(s => s.name === storeName);
    if (selectedStore) {
      console.log('[StoreManagement.handleStoreSelect] 選択されたストアの詳細:', selectedStore);
      onStoreSelected(selectedStore.name, selectedStore.displayName || selectedStore.name);
      showSuccess('ストアを選択しました', selectedStore.displayName || selectedStore.name);
    } else {
      console.error('[StoreManagement.handleStoreSelect] エラー: ストアが見つかりません');
      handleError(
        new Error('選択されたストアが見つかりません'),
        'ストアの選択に失敗しました'
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          ステップ2: File Searchストア管理
        </CardTitle>
        <CardDescription>
          既存のストアを選択するか、新しいストアを作成します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 既存ストア選択セクション */}
        {stores.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="store-select">既存のストアを選択</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={loadStores}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Select
              value={currentStore?.name || ''}
              onValueChange={handleStoreSelect}
              disabled={isLoading}
            >
              <SelectTrigger id="store-select" className="w-full">
                <SelectValue placeholder="ストアを選択してください" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {stores.map((store) => (
                  <SelectItem key={store.name} value={store.name}>
                    {store.displayName || store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ローディング表示 */}
        {isLoading && stores.length === 0 && (
          <div className="text-center p-4 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            ストア一覧を読み込み中...
          </div>
        )}

        {/* 新規作成ボタン */}
        {!showCreateForm && (
          <Button
            variant="outline"
            onClick={() => {
              console.log('[StoreManagement] 新規作成フォームを表示');
              setShowCreateForm(true);
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            新しいストアを作成
          </Button>
        )}

        {/* 新規作成フォーム */}
        {showCreateForm && (
          <div className="space-y-2 p-4 border rounded-md">
            <Label htmlFor="new-store-name">新しいストア名</Label>
            <Input
              id="new-store-name"
              placeholder="my-file-search-store"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              disabled={isCreating}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleCreate} 
                disabled={!newStoreName || isCreating}
                className="flex-1"
              >
                {isCreating ? '作成中...' : '作成'}
              </Button>
              {stores.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('[StoreManagement] 新規作成フォームを非表示');
                    setShowCreateForm(false);
                    setNewStoreName('');
                  }}
                  disabled={isCreating}
                >
                  キャンセル
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 現在選択中のストア表示 */}
        {currentStore && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">📁 現在選択中のストア:</p>
            <p className="text-sm text-muted-foreground font-mono">{currentStore.displayName}</p>
            <p className="text-xs text-muted-foreground mt-1 break-all">{currentStore.name}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
