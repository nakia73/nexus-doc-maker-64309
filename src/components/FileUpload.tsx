import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { uploadAndImportFile } from "@/lib/gemini-api";
import { handleError, showSuccess, showLoading, dismissToast } from "@/lib/error-handler";

interface FileUploadProps {
  storeName?: string;
  onFileUploaded: () => void;
}

export default function FileUpload({ storeName, onFileUploaded }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !storeName) return;

    setIsUploading(true);
    const toastId = showLoading('ファイルをアップロード中...');

    try {
      await uploadAndImportFile(selectedFile, storeName);
      dismissToast(toastId);
      showSuccess('ファイルをアップロードしました', selectedFile.name);
      setSelectedFile(null);
      onFileUploaded();
      // Reset file input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      dismissToast(toastId);
      handleError(error, 'ファイルのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ステップ3: ファイルアップロード</CardTitle>
        <CardDescription>
          ストアにファイルをアップロードします（最大10MB、TXT/PDF/MD）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fileInput">ファイル選択</Label>
          <Input
            id="fileInput"
            type="file"
            accept=".txt,.pdf,.md"
            onChange={handleFileSelect}
            disabled={!storeName || isUploading}
          />
        </div>
        {selectedFile && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">選択したファイル:</p>
            <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
        <Button 
          onClick={handleUpload} 
          disabled={!selectedFile || !storeName || isUploading}
        >
          {isUploading ? 'アップロード中...' : 'アップロード'}
        </Button>
        {!storeName && (
          <p className="text-sm text-destructive">
            先にストアを作成してください
          </p>
        )}
      </CardContent>
    </Card>
  );
}
