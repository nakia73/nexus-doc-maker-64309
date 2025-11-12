import { useState, useEffect } from "react";
import MultiProviderApiKeySetup from "@/components/MultiProviderApiKeySetup";
import StoreManagement from "@/components/StoreManagement";
import FileUpload from "@/components/FileUpload";
import ChatInterface from "@/components/ChatInterface";
import DocumentList from "@/components/DocumentList";
import SimpleChatInterface from "@/components/SimpleChatInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [hasApiKey, setHasApiKey] = useState(
    !!localStorage.getItem('gemini-api-key') ||
    !!localStorage.getItem('openai-api-key') ||
    !!localStorage.getItem('claude-api-key') ||
    !!localStorage.getItem('grok-api-key')
  );
  const [currentStore, setCurrentStore] = useState<{ name: string; displayName: string } | undefined>(undefined);
  const [hasUploadedFile, setHasUploadedFile] = useState(false);

  const handleApiKeySet = () => {
    setHasApiKey(true);
  };

  const handleStoreSelected = (name: string, displayName: string) => {
    console.log('[Index.handleStoreSelected] ストアが選択されました:', { name, displayName });
    setCurrentStore({ name, displayName });
    // localStorageに保存して、次回起動時に復元できるようにする
    localStorage.setItem('selected-store', JSON.stringify({ name, displayName }));
  };

  // 初期化時にlocalStorageからストアを復元
  useEffect(() => {
    console.log('[Index] コンポーネント初期化 - 保存されたストアを確認');
    const savedStore = localStorage.getItem('selected-store');
    if (savedStore) {
      try {
        const store = JSON.parse(savedStore);
        console.log('[Index] 保存されたストアを復元:', store);
        setCurrentStore(store);
      } catch (e) {
        console.error('[Index] 保存されたストアの解析に失敗:', e);
      }
    }
  }, []);

  const handleFileUploaded = () => {
    setHasUploadedFile(true);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Multi-LLM Chat Prototype</h1>
          <p className="text-muted-foreground">
            Gemini、OpenAI、Claude、Grok APIの統合チャットプロトタイプ
          </p>
        </div>

        <MultiProviderApiKeySetup onApiKeySet={handleApiKeySet} />

        {hasApiKey && (
          <>
            <StoreManagement 
              onStoreSelected={handleStoreSelected}
              currentStore={currentStore}
            />

            {currentStore && (
              <FileUpload 
                storeName={currentStore.name}
                onFileUploaded={handleFileUploaded}
              />
            )}

            <Tabs defaultValue="simple-chat" className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="file-search" disabled={!currentStore}>
                  File Search チャット
                </TabsTrigger>
                <TabsTrigger value="documents" disabled={!currentStore}>
                  ドキュメント一覧
                </TabsTrigger>
                <TabsTrigger value="simple-chat">
                  シンプルチャット
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file-search" className="mt-6">
                <ChatInterface storeName={currentStore?.name} />
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <DocumentList storeName={currentStore?.name} />
              </TabsContent>

          <TabsContent value="simple-chat" className="mt-6">
            <SimpleChatInterface stores={currentStore ? [currentStore] : []} />
          </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
